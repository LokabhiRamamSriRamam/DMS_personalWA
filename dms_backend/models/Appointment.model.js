// models/Appointment.js
import mongoose from 'mongoose';

const AppointmentSchema = new mongoose.Schema({
  patient_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  doctor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  start_time: { type: Date, required: true },
  end_time: { type: Date, required: true },
  
  title: String, // "Root Canal - John Doe"
  type: { type: String, default: 'Consultation' },
  
  status: { 
    type: String, 
    enum: ['Scheduled', 'Confirmed', 'Checked In', 'In Progress', 'Completed', 'Cancelled', 'No Show'],
    default: 'Scheduled'
  },
  
  room_number: String,
  token_number: Number,
  notes:{type: String},
}, { timestamps: true });

export default mongoose.model('Appointment', AppointmentSchema);