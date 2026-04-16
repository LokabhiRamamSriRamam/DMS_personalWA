// models/Transaction.js (The General Ledger)
import mongoose from 'mongoose';
const TransactionSchema = new mongoose.Schema({
  type: { type: String, enum: ['Income', 'Expense'], required: true },
  
  category: { type: String, required: true }, 
  // Income: "Treatment", "Consultation", "Pharmacy Sales"
  // Expense: "Inventory Purchase", "Lab Bill", "Rent", "Salary"
  
  amount: { type: Number, required: true },
  payment_method: { type: String, enum: ['Cash', 'Card', 'UPI', 'Bank Transfer', 'Cheque'] },
  
  date: { type: Date, default: Date.now },
  
  // Linking
  party_name: String, // "John Doe" or "Dental Depot"
  invoice_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' }, // For Income
  vendor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },   // For Expense
  
  notes: String
}, { timestamps: true });

export { TransactionSchema };
export default mongoose.model('Transaction', TransactionSchema);