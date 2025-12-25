import mongoose from "mongoose";

const conditionSchema = new mongoose.Schema(
  {
    name: String,
    diagnosed_date: String,
    status: String,
    severity: String
  },
  { _id: false }
);

const patientSchema = new mongoose.Schema(
  {
    demographics: {
      first_name: String,
      last_name: String,
      dob: Date,
      gender: String,
      contact: {
        phone: String,
        email: String,
        address: String
      },
      emergency_contact: Object
    },

    medical_profile: {
      conditions: [conditionSchema],
      alerts: [String]
    },

    last_visit_date: Date,
    outstanding_balance: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

export default mongoose.model("Patient", patientSchema);
