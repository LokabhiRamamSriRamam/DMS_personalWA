// models/Vendor.js
import { Schema, model } from 'mongoose';

const VendorSchema = new Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['Pharmacy', 'Consumable', 'Lab', 'General'] },
  contact_person: String,
  phone: String,
  email: String,
  address: String,
  gst_number: String
});
export { VendorSchema };
export default model('Vendor', VendorSchema);