import mongoose from 'mongoose';

const OrderSchema = new mongoose.Schema({
  vendor: { type: String, required: true },
  
  // ✅ 1. Allow 'General' in enum (or remove enum entirely if you want flexibility)
  category: { 
    type: String, 
    enum: ['Pharmacy', 'Consumable', 'General'], 
    default: 'General' 
  },

  order_date: { type: Date, required: true, default: Date.now },
  
  // ✅ 2. Add Due Date field
  due_date: { type: Date },

  // ✅ 3. Update Items structure to store IDs and Costs
  items: [{
     item_id: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem' }, // Link to Item
     item_name: String, // Snapshot of name in case item is deleted
     qty: { type: Number, required: true },
     unit_cost: { type: Number, default: 0 },
     total_cost: { type: Number, default: 0 }
  }],

  total_cost: { type: Number, default: 0 },
  status: { type: String, enum: ['Pending','Confirmed', 'Received', 'Cancelled'], default: 'Pending' },
  notes: String
}, { timestamps: true });

export default mongoose.model('Order', OrderSchema);