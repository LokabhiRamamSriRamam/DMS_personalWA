import mongoose from "mongoose";

const batchSchema = new mongoose.Schema(
  {
    batch_no: String,
    expiry: Date,
    qty: Number
  },
  { _id: false }
);

const inventorySchema = new mongoose.Schema(
  {
    name: String,
    category: String,
    stock_on_hand: Number,
    unit: String,
    reorder_level: Number,
    batch_info: [batchSchema]
  },
  { timestamps: true }
);

export default mongoose.model("Inventory", inventorySchema);
