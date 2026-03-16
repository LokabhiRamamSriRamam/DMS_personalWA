// models/Patient.js
import mongoose from 'mongoose';

const PatientSchema = new mongoose.Schema({
  // --- IDENTIFIERS ---
  patientId: { type: String, required: true, unique: true, index: true }, // e.g. "PID-2025-001"
  
  // --- DEMOGRAPHICS ---
  first_name: { type: String, required: true },
  last_name: { type: String },
  dob: { type: Date }, // Virtual 'age' is calculated from this
  gender: { type: String, enum: ['Male', 'Female', 'Other'] },
  blood_group: { type: String },
  
  contact: {
    mobile: { type: String, required: true },
    email: { type: String },
    address: { type: String },
    city: { type: String }
  },
  
  emergency_contact: {
    name: String,
    phone: String,
    relation: String
  },

  // --- MEDICAL PROFILE ---
  // Matches the "Medical History" tags in Profile Modal
  medical_history: [{ type: String }], // e.g. ["Diabetes", "BP High"]
  allergies: [{ type: String }],       // e.g. ["Penicillin", "Latex"]
  
  // --- META ---
  reference_source: { type: String }, // Who referred them?
  general_notes: { type: String },    // Private clinic notes
  
  // --- AGGREGATES (Updated by Triggers/Controllers for fast UI loading) ---
  last_visit_date: { type: Date },
  total_due: { type: Number, default: 0.00 },
  dentition_type: { 
    type: String, 
    enum: ['Adult', 'Pedo', 'Mixed'], 
    default: 'Adult' 
  }
}, { timestamps: true });

// Virtual for Full Name
PatientSchema.virtual('full_name').get(function() {
  return `${this.first_name} ${this.last_name || ''}`.trim();
});

export default mongoose.model('Patient', PatientSchema);