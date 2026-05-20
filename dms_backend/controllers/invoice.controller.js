import PDFDocument from 'pdfkit';
import { logEvent } from '../services/analyticsLogger.js';
import { triggerFlow } from '../services/chatbot.service.js';

async function fireInvoiceFlow(tenantModels, invoice) {
  try {
    const config = await tenantModels.WaSenderConfig?.findOne({ isActive: true });
    if (!config?.sessionApiKey || !invoice.patient_phone) return;
    const templateData = {
      name:       invoice.patient_name || '',
      firstName:  (invoice.patient_name || '').split(' ')[0],
      phone:      invoice.patient_phone,
      invoiceId:  invoice.invoice_id,
      amount:     invoice.total_amount,
    };
    await triggerFlow(tenantModels, config.sessionApiKey, 'invoice_created', invoice.patient_phone, templateData);
  } catch (err) {
    console.error('[invoice] fireInvoiceFlow error', err.message);
  }
}

// Helper: Generate ID using the tenant's configured invoice prefix
const generateInvoiceId = async (Invoice, prefix = 'INV') => {
  const count = await Invoice.countDocuments();
  const year = new Date().getFullYear();
  const safePrefix = String(prefix || 'INV').trim() || 'INV';
  return `${safePrefix}-${year}-${String(count + 1).padStart(3, '0')}`;
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
  const { Invoice, InventoryItem, InventoryLog, Transaction, LabOrder, InvoiceSettings } = req.tenantModels;
  try {
    const {
        patient_id, patient_name, patient_phone, date, items,
        paid_amount, payment_method
    } = req.body;

    // Invoice presentation/finance config (prefix + tax). Falls back to
    // sensible defaults if no settings row exists yet.
    const invSettings = InvoiceSettings ? await InvoiceSettings.findOne().lean() : null;
    const prefix      = invSettings?.invoiceNumber?.prefix || 'INV';
    const taxRatePct  = invSettings?.tax?.show ? Number(invSettings?.tax?.defaultRatePct) || 0 : 0;

    // Server is authoritative for money: recompute from line items rather
    // than trusting client-sent subtotal/total.
    const subtotal     = (items || []).reduce((acc, it) => acc + (Number(it.total) || 0), 0);
    const tax          = Math.round(subtotal * taxRatePct) / 100;
    const total_amount = Math.round((subtotal + tax) * 100) / 100;

    // 1. Generate ID
    const invoice_id = await generateInvoiceId(Invoice, prefix);

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
        tax,
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


    // WaSender flow (fire-and-forget)
    fireInvoiceFlow(req.tenantModels, newInvoice);

    // Note: invoice is emailed via the appointmentCompleted automation
    // (include.invoice) — there is no standalone invoice email trigger.

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
      const filter = {};
      if (req.query.invoice_id) filter.invoice_id = req.query.invoice_id;
      const transactions = await Transaction.find(filter).sort({ date: -1 });
      res.json(transactions);
  } catch (err) { res.status(500).json({ error: err.message }); }
}

// POST /api/transactions/export/pdf  { rows: [{date,party,type,category,method,amount}], title }
// Renders exactly the rows the client is showing (client filters transactions
// client-side, so we render what the user sees rather than re-querying).
export async function exportTransactionsPdf(req, res) {
  try {
    const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
    const title = String(req.body?.title || 'Transactions Report');

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="transactions.pdf"');
    doc.pipe(res);

    doc.fontSize(18).text(title, { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(9).fillColor('#666')
      .text(`Generated ${new Date().toLocaleString('en-GB')}  •  ${rows.length} record(s)`, { align: 'center' });
    doc.moveDown(1).fillColor('#000');

    const cols = [
      { label: 'Date', width: 70 },
      { label: 'Party', width: 130 },
      { label: 'Type', width: 60 },
      { label: 'Category', width: 90 },
      { label: 'Mode', width: 70 },
      { label: 'Amount', width: 75 },
    ];
    const startX = doc.page.margins.left;

    const drawRow = (cells, opts = {}) => {
      const y = doc.y;
      let x = startX;
      doc.fontSize(9).font(opts.bold ? 'Helvetica-Bold' : 'Helvetica');
      cells.forEach((c, i) => {
        doc.text(String(c), x + 2, y, { width: cols[i].width - 4, align: i === 5 ? 'right' : 'left' });
        x += cols[i].width;
      });
      doc.moveTo(startX, doc.y + 2).lineTo(x, doc.y + 2).strokeColor('#ddd').stroke();
      doc.moveDown(0.4);
    };

    drawRow(cols.map(c => c.label), { bold: true });

    let total = 0;
    for (const t of rows) {
      if (doc.y > doc.page.height - 60) {
        doc.addPage();
        drawRow(cols.map(c => c.label), { bold: true });
      }
      const amt = Number(t.amount) || 0;
      total += t.type === 'Expense' ? -amt : amt;
      drawRow([
        t.date || '',
        t.party || 'Unknown',
        t.type || '',
        t.category || '',
        t.method || '',
        `INR ${amt.toLocaleString('en-IN')}`,
      ]);
    }

    doc.moveDown(0.5);
    doc.font('Helvetica-Bold').fontSize(11)
      .text(`Net Total: INR ${total.toLocaleString('en-IN')}`, { align: 'right' });

    doc.end();
  } catch (err) {
    if (!res.headersSent) res.status(500).json({ error: err.message });
  }
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