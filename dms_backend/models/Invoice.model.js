import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    date: Date,
    method: String,
    amount: Number,
    ref: String
  },
  { _id: false }
);

const invoiceSchema = new mongoose.Schema(
  {
    visit_id: mongoose.Schema.Types.ObjectId,
    patient_id: mongoose.Schema.Types.ObjectId,

    items_billed: [
      {
        description: String,
        amount: Number
      }
    ],

    total_amount: Number,
    tax: Number,
    grand_total: Number,

    payments: [paymentSchema],

    status: String
  },
  { timestamps: true }
);

export default mongoose.model("Invoice", invoiceSchema);
