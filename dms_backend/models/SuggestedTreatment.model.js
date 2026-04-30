import mongoose from 'mongoose';

const SuggestedTreatmentSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  category: { type: String }, // e.g., "Restorative", "Surgical", "Preventive"
  cost: { type: Number, required: true }, // Cost of treatment
  description: { type: String },
  is_active: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model('SuggestedTreatment', SuggestedTreatmentSchema);
