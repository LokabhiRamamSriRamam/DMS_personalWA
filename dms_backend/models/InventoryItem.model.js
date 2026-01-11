import mongoose from 'mongoose';

const InventoryItemSchema = new mongoose.Schema({
  name: { type: String, required: true }, 
  type: { type: String, enum: ['Pharmacy', 'Consumable', 'Asset'], required: true },
  
  // Pharmacy Specifics
  composition: { type: String }, 
  manufacturer: { type: String },
  category: { type: String }, 
  
  // Stock Levels
  // ❌ Removed 'unit' field
  stock_on_hand: { type: Number, default: 0 },
  min_stock_level: { type: Number, default: 10 }, 
  
  // Pricing
  cost_price: { type: Number, default: 0 }, // Changed from purchase_rate to match controller
  selling_price: { type: Number, default: 0 },

  // Status (Auto-calculated)
  status: { 
    type: String, 
    enum: ['Good', 'Low', 'Critical', 'Out of Stock'], 
    default: 'Out of Stock' 
  }
}, { timestamps: true });

// Auto-Calculate Status on Save
InventoryItemSchema.pre('save', function(next) {
    if (this.stock_on_hand <= 0) this.status = 'Out of Stock';
    else if (this.stock_on_hand <= this.min_stock_level / 2) this.status = 'Critical';
    else if (this.stock_on_hand <= this.min_stock_level) this.status = 'Low';
    else this.status = 'Good';
    next();
});

export default mongoose.model('InventoryItem', InventoryItemSchema);