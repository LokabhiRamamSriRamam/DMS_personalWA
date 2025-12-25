import mongoose from "mongoose";

const treatmentSchema = new mongoose.Schema(
  {
    procedure_id: mongoose.Schema.Types.ObjectId,
    name: String,
    tooth_number: Number,
    surface: String,
    cost: Number,
    status: String
  },
  { _id: false }
);

const prescriptionItemSchema = new mongoose.Schema(
  {
    inventory_item_id: mongoose.Schema.Types.ObjectId,
    name: String,
    dosage: String,
    days: Number
  },
  { _id: false }
);

const visitSchema = new mongoose.Schema(
  {
    patient_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true
    },
    doctor_id: mongoose.Schema.Types.ObjectId,
    appointment_id: mongoose.Schema.Types.ObjectId,
    date: Date,

    clinical_notes: {
      chief_complaint: String,
      diagnosis: String,
      notes: String
    },

    treatments: [treatmentSchema],

    prescription: {
      notes: String,
      items: [prescriptionItemSchema]
    },

    attachments: [
      {
        type: { type: String },
        url: String,
        uploaded_at: Date
      }
    ]
  },
  { timestamps: true }
);

export default mongoose.model("Visit", visitSchema);
