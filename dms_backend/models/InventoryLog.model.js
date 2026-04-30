// models/InventoryLog.js (THE AUDIT TRAIL)
import mongoose from 'mongoose';
const InventoryLogSchema = new mongoose.Schema({
  item_id: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
  
  type: { type: String, enum: ['Stock In', 'Stock Out'], required: true },
  reason: {
    type: String,
    enum: ['Purchase', 'Treatment Usage', 'Sold to Patient', 'Expired', 'Adjustment', 'Return', 'Treatment Usage Reversed']
  },
  
  quantity: { type: Number, required: true },
  
  // Context Links
  reference_id: { type: mongoose.Schema.Types.ObjectId }, // Link to PurchaseOrder OR Invoice OR Visit
  notes: String,
  
  performed_by: { type: String },
  date: { type: Date, default: Date.now }
});

export { InventoryLogSchema };
export default mongoose.model('InventoryLog', InventoryLogSchema);