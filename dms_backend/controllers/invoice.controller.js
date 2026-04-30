import { logEvent } from '../services/analyticsLogger.js';
import { triggerWhatsApp } from '../services/whatsapp.service.js';

// Helper: Generate ID
const generateInvoiceId = async (Invoice) => {
  const count = await Invoice.countDocuments();
  const year = new Date().getFullYear();
  return `INV-${year}-${String(count + 1).padStart(3, '0')}`;
};

// ==========================================
//               INVOICE LOGIC
// ==========================================

// GET /api/invoices
export async function getInvoices(req, res) {
  const { Invoice } = req.tenantModels;
  try {
    const filter = {};
    if (req.query.patient_id) filter.patient_id = req.query.patient_id;
    const invoices = await Invoice.find(filter).sort({ createdAt: -1 });
    res.json(invoices);
  } catch (err) { res.status(500).json({ error: err.message }); }
}

// GET /api/invoices/:id
export async function getInvoiceById(req, res) {
  const { Invoice } = req.tenantModels;
  try {
      const invoice = await Invoice.findById(req.params.id);
      if(!invoice) return res.status(404).json({error: "Invoice not found"});
      res.json(invoice);
  } catch (err) { res.status(500).json({ error: err.message }); }
}

// POST /api/invoices
export async function createInvoice(req, res) {
  const { Invoice, InventoryItem, InventoryLog, Transaction, LabOrder } = req.tenantModels;
  try {
    const {
        patient_id, patient_name, patient_phone, date, items,
        subtotal, total_amount, paid_amount, payment_method
    } = req.body;

    // 1. Generate ID
    const invoice_id = await generateInvoiceId(Invoice);

    // 2. INVENTORY LOGIC: Deduct Stock
    for (const item of items) {
        if (item.type === 'Pharmacy' && item.item_id) {
            const inventoryItem = await InventoryItem.findById(item.item_id);
            if (inventoryItem) {
                inventoryItem.stock_on_hand -= Number(item.quantity);
                
                // Recalculate Status - pre-save hook on model should handle this if configured, 
                // but we'll manually set it as per original controller logic
                if(inventoryItem.stock_on_hand <= 0) inventoryItem.status = 'Out of Stock';
                else if(inventoryItem.stock_on_hand <= inventoryItem.min_stock_level) inventoryItem.status = 'Low';
                else inventoryItem.status = 'Good';

                await inventoryItem.save();

                await InventoryLog.create({
                    item_id: item.item_id,
                    type: 'Stock Out',
                    quantity: Number(item.quantity),
                    reason: 'Sold to Patient',
                    notes: `Invoice: ${invoice_id} - Sold to ${patient_name}`,
                    date: new Date()
                });
            }
        }
    }

    // 3. Save Invoice
    const newInvoice = new Invoice({
        invoice_id,
        patient_id,
        patient_name,
        patient_phone,
        date,
        items,
        subtotal,
        total_amount,
        paid_amount: Number(paid_amount),
        payment_method
    });

    await newInvoice.save();

    // 4. Mark Lab Orders as invoiced
    for (const item of items) {
      if (item.type === 'Lab' && item.item_id) {
        await LabOrder.findByIdAndUpdate(item.item_id, { invoice_id: newInvoice._id });
      }
    }

    // 5. Record Initial Transaction
    if (Number(paid_amount) > 0) {
        await Transaction.create({
            type: 'Income',
            category: 'Invoice Payment',
            amount: Number(paid_amount),
            payment_method: payment_method,
            date: new Date(),
            party_name: patient_name,
            invoice_id: newInvoice._id,
            notes: `Initial payment for ${invoice_id}`
        });

        // Log to analytics if status becomes 'Paid' or at least we record a payment
        if (newInvoice.status === 'Paid') {
            logEvent(req.user.tenantId, 'invoice_paid', { invoiceId: newInvoice.invoice_id, amount: newInvoice.total_amount });
        }
    }

    // Fire-and-forget WhatsApp notification (invoice + latest prescription)
    if (newInvoice.patient_phone && newInvoice.patient_id) {
      const patientIdStr = newInvoice.patient_id?.toString();
      // Fetch patient details and latest prescription from today's visit
      const today = new Date(); today.setHours(0, 0, 0, 0);
      Promise.all([
        req.tenantModels.Patient.findById(newInvoice.patient_id).select('first_name last_name patientId contact').lean(),
        req.tenantModels.Visit.findOne({
          patient_id: newInvoice.patient_id,
          date: { $gte: today },
        }).sort({ date: -1 }).lean(),
      ])
        .then(([patient, visit]) => {
          if (!patient) return;
          const firstName = patient.first_name;
          const fullName = `${firstName} ${patient.last_name || ''}`.trim();
          const rx = visit?.prescriptions?.[visit.prescriptions.length - 1];
          const amount = Number(newInvoice.total_amount) || 0;
          const formatted = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
          triggerWhatsApp(
            req.tenantModels, req.user.tenantId, process.env.WAAPI_BASE_URL,
            'invoiceAndPrescription',
            newInvoice.patient_phone,
            {
              name: fullName,
              firstName,
              patientId: patient.patientId,
              mobile: patient.contact?.mobile || '',
              amount: formatted,
              paidAmount: String(newInvoice.paid_amount),
              pendingAmount: String(newInvoice.pending_amount),
              paymentMethod: newInvoice.payment_method || '',
              invoiceId: newInvoice.invoice_id,
              drug: rx?.drug_name || '',
              dosage: rx?.dosage || '',
              duration: rx?.duration || '',
            },
            patientIdStr
          );
        })
        .catch(() => {});
    }

    res.status(201).json(newInvoice);

  } catch (err) {
    console.error("Create Invoice Error:", err);
    res.status(400).json({ error: err.message });
  }
}

// PUT /api/invoices/:id (Manual Update)
export async function updateInvoice(req, res) {
  const { Invoice, Transaction } = req.tenantModels;
  try {
      const invoice = await Invoice.findById(req.params.id);
      if(!invoice) return res.status(404).json({error: "Invoice not found"});

      if (req.body.paid_amount !== undefined) {
          const oldPaid = invoice.paid_amount || 0;
          const newPaid = Number(req.body.paid_amount);
          const delta   = newPaid - oldPaid;

          invoice.paid_amount = newPaid;

          // Record a transaction for any additional payment collected
          if (delta > 0) {
              await Transaction.create({
                  type: 'Income',
                  category: 'Invoice Payment',
                  amount: delta,
                  payment_method: req.body.payment_method || invoice.payment_method,
                  date: new Date(),
                  party_name: invoice.patient_name,
                  invoice_id: invoice._id,
                  notes: `Payment update for ${invoice.invoice_id}`,
              });

              // Log to analytics
              if (invoice.status === 'Paid') {
                  logEvent(req.user.tenantId, 'invoice_paid', { invoiceId: invoice.invoice_id, amount: invoice.total_amount });
              }
          }
      }

      await invoice.save();
      res.json(invoice);
  } catch (err) { res.status(400).json({ error: err.message }); }
}

// ==========================================
//             TRANSACTION LOGIC
// ==========================================

// GET /api/transactions
export async function getTransactions(req, res) {
  const { Transaction } = req.tenantModels;
  try {
      const transactions = await Transaction.find().sort({ date: -1 });
      res.json(transactions);
  } catch (err) { res.status(500).json({ error: err.message }); }
}

// POST /api/transactions (Record new payment / expense)
export async function recordTransaction(req, res) {
  const { Transaction, Invoice } = req.tenantModels;
  try {
    const { 
        type, category, amount, payment_method, 
        date, party_name, invoice_id, vendor_id, notes 
    } = req.body;
    
    // 1. Create the Transaction Record
    const txn = new Transaction({
        type, 
        category, 
        amount, 
        payment_method,
        date: date || new Date(),
        party_name,
        invoice_id,
        vendor_id,
        notes
    });
    await txn.save();

    // 2. Link to Invoice (If Income)
    if (type === 'Income' && invoice_id) {
      const invoice = await Invoice.findById(invoice_id);
      if(invoice) {
          invoice.paid_amount += Number(amount);
          await invoice.save(); // Updates status to Paid/Partially Paid

          // Log to analytics if paid
          if (invoice.status === 'Paid') {
            logEvent(req.user.tenantId, 'invoice_paid', { invoiceId: invoice.invoice_id, amount: invoice.total_amount });
          }
      }
    }

    res.status(201).json(txn);
  } catch (err) { res.status(400).json({ error: err.message }); }
}