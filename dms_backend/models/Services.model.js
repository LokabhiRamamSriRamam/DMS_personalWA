import mongoose from 'mongoose';

const ServiceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  cost: { type: Number, required: true },
  category: { type: String, default: 'General' }, // e.g. "Consultation", "Root Canal"
  description: String,
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model('Service', ServiceSchema);