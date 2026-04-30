import mongoose from 'mongoose';

const DiagnosisSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  code: { type: String }, // e.g., "K02.1" (ICD code)
  category: { type: String }, // e.g., "Caries", "Periodontal", "Endodontic"
  description: { type: String },
  is_active: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model('Diagnosis', DiagnosisSchema);
