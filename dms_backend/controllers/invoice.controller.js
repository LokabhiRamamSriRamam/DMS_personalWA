import Invoice from '../models/Invoice.model.js';
import InventoryItem from '../models/InventoryItem.model.js';
import InventoryLog from '../models/InventoryLog.model.js';
import Transaction from '../models/Transaction.model.js'; 

// Helper: Generate ID
const generateInvoiceId = async () => {
  const count = await Invoice.countDocuments();
  const year = new Date().getFullYear();
  return `INV-${year}-${String(count + 1).padStart(3, '0')}`;
};

// ==========================================
//               INVOICE LOGIC
// ==========================================

// GET /api/invoices
export async function getInvoices(req, res) {
  try {
    const invoices = await Invoice.find().sort({ createdAt: -1 });
    res.json(invoices);
  } catch (err) { res.status(500).json({ error: err.message }); }
}

// GET /api/invoices/:id
export async function getInvoiceById(req, res) {
    try {
        const invoice = await Invoice.findById(req.params.id);
        if(!invoice) return res.status(404).json({error: "Invoice not found"});
        res.json(invoice);
    } catch (err) { res.status(500).json({ error: err.message }); }
}

// POST /api/invoices
export async function createInvoice(req, res) {
  try {
    const { 
        patient_name, patient_phone, date, items, 
        subtotal, total_amount, paid_amount, payment_method 
    } = req.body;

    // 1. Generate ID
    const invoice_id = await generateInvoiceId();

    // 2. INVENTORY LOGIC: Deduct Stock
    for (const item of items) {
        if (item.type === 'Pharmacy' && item.item_id) {
            const inventoryItem = await InventoryItem.findById(item.item_id);
            if (inventoryItem) {
                inventoryItem.stock_on_hand -= Number(item.quantity);
                
                // Recalculate Status
                if(inventoryItem.stock_on_hand <= 0) inventoryItem.status = 'Out of Stock';
                else if(inventoryItem.stock_on_hand <= inventoryItem.min_stock_level) inventoryItem.status = 'Low';
                else inventoryItem.status = 'Good';

                await inventoryItem.save();

                await InventoryLog.create({
                    item_id: item.item_id,
                    type: 'Stock Out',
                    quantity: Number(item.quantity),
                    reason: 'Usage', 
                    notes: `Invoice: ${invoice_id} - Sold to ${patient_name}`,
                    date: new Date()
                });
            }
        }
    }

    // 3. Save Invoice
    const newInvoice = new Invoice({
        invoice_id,
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
    
    // 4. Record Initial Transaction (Matches your new Model)
    if (Number(paid_amount) > 0) {
        await Transaction.create({
            type: 'Income',
            category: 'Invoice Payment', // Or "Treatment" / "Pharmacy Sales" based on logic
            amount: Number(paid_amount),
            payment_method: payment_method,
            date: new Date(),
            party_name: patient_name, // ✅ Linked to Patient Name
            invoice_id: newInvoice._id,
            notes: `Initial payment for ${invoice_id}`
        });
    }

    res.status(201).json(newInvoice);

  } catch (err) {
    console.error("Create Invoice Error:", err);
    res.status(400).json({ error: err.message });
  }
}

// PUT /api/invoices/:id (Manual Update)
export async function updateInvoice(req, res) {
  try {
      const invoice = await Invoice.findById(req.params.id);
      if(!invoice) return res.status(404).json({error: "Invoice not found"});

      if (req.body.paid_amount !== undefined) {
          invoice.paid_amount = req.body.paid_amount;
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
    try {
        const transactions = await Transaction.find().sort({ date: -1 });
        res.json(transactions);
    } catch (err) { res.status(500).json({ error: err.message }); }
}

// POST /api/transactions (Record new payment / expense)
export async function recordTransaction(req, res) {
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
      }
    }

    res.status(201).json(txn);
  } catch (err) { res.status(400).json({ error: err.message }); }
}