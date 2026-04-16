// models/LabOrder.js
import mongoose from 'mongoose';
const LabOrderSchema = new mongoose.Schema({
  patient_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  doctor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  vendor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' }, // The Lab
  
  order_date: { type: Date, default: Date.now },
  expected_delivery: Date,
  
  items: [{
    item_name: String, // "Zirconia Crown"
    shade: String,     // "A2"
    instructions: String,
    cost: Number
  }],
  
  status: { 
    type: String, 
    enum: ['Sent', 'In Process', 'Received', 'Delivered to Patient'],
    default: 'Sent'
  },
  
  cost_to_clinic: Number,
  invoice_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', default: null }
}, { timestamps: true });
export { LabOrderSchema };
export default mongoose.model('LabOrder', LabOrderSchema);