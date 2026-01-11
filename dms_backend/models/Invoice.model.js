import mongoose from 'mongoose';

const InvoiceSchema = new mongoose.Schema({
  invoice_id: { type: String, unique: true, required: true }, // "INV-2025-001"
  
  // Snapshot Data (Stores name/phone at time of invoice)
  patient_name: { type: String, required: true },
  patient_phone: { type: String, required: true },
  
  // Optional: Link to Patient profile if it exists
  patient_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' }, 
  
  date: { type: Date, default: Date.now },
  
  items: [{
    item_id: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem' }, // Critical for linking back
    name: { type: String, required: true }, 
    type: { type: String, enum: ['Service', 'Pharmacy'], default: 'Service' },
    quantity: { type: Number, default: 1 },
    rate: { type: Number, required: true },
    total: { type: Number, required: true }
  }],
  
  // Monetary
  subtotal: Number,
  tax: { type: Number, default: 0 },
  total_amount: { type: Number, required: true },
  
  // Payments
  paid_amount: { type: Number, default: 0 },
  pending_amount: { type: Number, default: 0 },
  payment_method: { type: String, default: 'Cash' },
  
  status: { 
    type: String, 
    enum: ['Draft', 'Pending', 'Paid', 'Overdue', 'Cancelled'],
    default: 'Pending'
  },
  
  notes: String
}, { timestamps: true });

// Pre-save hook: Auto-calculate Status
InvoiceSchema.pre('save', function(next) {
  this.pending_amount = this.total_amount - this.paid_amount;
  
  if (this.pending_amount <= 0) {
    this.pending_amount = 0; // Prevent negative
    this.status = 'Paid';
  } else {
    this.status = 'Pending';
  }
  next();
});

export default mongoose.model('Invoice', InvoiceSchema);