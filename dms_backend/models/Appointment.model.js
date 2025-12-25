import mongoose from "mongoose";

const appointmentSchema = new mongoose.Schema(
  {
    start_time: Date,
    end_time: Date,
    doctor_id: mongoose.Schema.Types.ObjectId,
    patient_id: mongoose.Schema.Types.ObjectId,
    patient_name: String,

    status: {
      type: String,
      enum: ["Scheduled", "Confirmed", "Cancelled", "Completed"],
      default: "Scheduled"
    },

    type: String
  },
  { timestamps: true }
);

export default mongoose.model("Appointment", appointmentSchema);
