// models/Patient.js
import mongoose from 'mongoose';

const PatientSchema = new mongoose.Schema({
  // --- IDENTIFIERS ---
  patientId: { type: String, required: true, unique: true, index: true }, // e.g. "PID-2026-0001" (year-scoped, 4-digit counter resets annually)
  
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
  dental_history:  { type: String, default: '' },

  // --- LIFESTYLE HABITS ---
  tobacco_smoking: { type: Boolean, default: false },
  tobacco_smokeless: { type: Boolean, default: false },
  tea_consumption: { type: String, default: '' }, // e.g. "None", "1 cup", "2-3 cups", etc.
  coffee_consumption: { type: String, default: '' }, // e.g. "None", "1 cup", "2-3 cups", etc.
  
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
  },

  // --- GOOGLE DRIVE ---
  drive_folders: {
    root:           { type: String, default: null },
    clinical_notes: { type: String, default: null },
    scans:          { type: String, default: null },
    photographs:    { type: String, default: null },
    lab_reports:    { type: String, default: null },
  },

  // File records stored per-patient (uploaded to Drive subfolders)
  files: [{
    file_name:     { type: String, required: true },
    category: {
      type: String,
      enum: ['Clinical Notes', 'Scans', 'Photographs', 'Lab Reports'],
      required: true,
    },
    drive_file_id: { type: String, required: true },
    web_view_link: { type: String },
    mime_type:     { type: String },
    visit_id:      { type: mongoose.Schema.Types.ObjectId, ref: 'Visit' }, // optional
    uploaded_at:   { type: Date, default: Date.now },
  }],

}, { timestamps: true });

// Virtual for Full Name
PatientSchema.virtual('full_name').get(function() {
  return `${this.first_name} ${this.last_name || ''}`.trim();
});

export { PatientSchema };
export default mongoose.model('Patient', PatientSchema);