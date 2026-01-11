// models/Visit.js
import mongoose from 'mongoose';

const VisitSchema = new mongoose.Schema({
  patient_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  doctor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  appointment_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
  date: { type: Date, default: Date.now },

  // --- 1. EXAMINATION FINDINGS (From Dental Chart Tabs) ---
  findings: {
    soft_tissue: [{ type: String }], // ["Buccal Mucosa", "Gingiva"]
    tmj: [{ type: String }],         // ["Left TMJ", "Clicking"]
    diagnosis_notes: { type: String }
  },

  // --- 2. TREATMENT CHARTING (From Treatment Board) ---
  treatments: [{
    // The specific tooth/teeth involved
    teeth_numbers: [{ type: String }], // ["18", "55"] (Supports Mixed Dentition strings)
    
    // Surface Graphic Data
    surfaces: [{ type: String, enum: ['Mesial', 'Distal', 'Occlusal', 'Buccal', 'Lingual', 'Palatal'] }],
    
    // Treatment Details
    treatment_name: { type: String, required: true }, // "Root Canal", "Composite Filling"
    cost: { type: Number, default: 0 },
    qty: { type: Number, default: 1 },
    
    // Lifecycle Status (Colors in UI: Yellow -> Blue -> Green)
    status: { 
      type: String, 
      enum: ['Planned', 'In Progress', 'Completed', 'Cancelled'],
      default: 'Planned'
    },
    
    // Link to Inventory (Auto-deduct when status becomes 'Completed')
    consumables_used: [{
      inventory_item_id: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem' },
      quantity: Number
    }]
  }],

  // --- 3. PRESCRIPTIONS ---
  prescriptions: [{
    drug_name: String,   // Can link to InventoryItem if it's pharmacy stock
    dosage: String,      // "1-0-1"
    duration: String,    // "5 Days"
    instructions: String // "After food"
  }],

  // --- 4. FILES (X-Rays/RVG) ---
  files: [{
    file_type: { type: String, enum: ['X-Ray', 'Report', 'Consent Form'] },
    url: String,
    uploaded_at: { type: Date, default: Date.now }
  }]

}, { timestamps: true });

export default mongoose.model('Visit', VisitSchema);