import mongoose from 'mongoose';

const ClinicalFindingSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  category: { type: String }, // e.g., "Soft Tissue", "Hard Tissue", "Periodontal"
  description: { type: String },
  is_active: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model('ClinicalFinding', ClinicalFindingSchema);
