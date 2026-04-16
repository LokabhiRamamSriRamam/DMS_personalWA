import mongoose from 'mongoose';

const VisitSchema = new mongoose.Schema({
  patient_id:     { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  doctor_id:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  appointment_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
  date:           { type: Date, default: Date.now },

  // --- 1. EXAMINATION FINDINGS ---
  findings: {
    soft_tissue:      [{ type: String }],
    tmj:              [{ type: String }],
    diagnosis_notes:  { type: String }
  },

  // --- 2. TREATMENT CHARTING ---
  treatments: [{
    teeth_numbers: [{ type: String }],
    surfaces: [{ type: String, enum: ['Mesial', 'Distal', 'Occlusal', 'Buccal', 'Lingual', 'Palatal'] }],
    treatment_name: { type: String, required: true },
    cost:   { type: Number, default: 0 },
    qty:    { type: Number, default: 1 },
    status: { type: String, enum: ['Planned', 'In Progress', 'Completed', 'Cancelled'], default: 'Planned' },
    invoice_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', default: null },
    consumables_used: [{
      inventory_item_id: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem' },
      quantity: Number
    }]
  }],

  // --- 3. PRESCRIPTIONS ---
  prescriptions: [{
    drug_name:    String,
    dosage:       String,
    duration:     String,
    instructions: String,
    invoice_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', default: null }
  }],

  // --- 4. CONSULTATION NOTES (rich HTML, one or more per visit) ---
  consultation_notes: [{
    content:    { type: String, required: true }, // HTML from rich text editor
    created_at: { type: Date, default: Date.now }
  }],

  // --- 5. ADVICES (rich HTML, one or more per visit) ---
  advices: [{
    content:    { type: String, required: true }, // HTML from rich text editor
    created_at: { type: Date, default: Date.now }
  }],

}, { timestamps: true });

export { VisitSchema };
export default mongoose.model('Visit', VisitSchema);
