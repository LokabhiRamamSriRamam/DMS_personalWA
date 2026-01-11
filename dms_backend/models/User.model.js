import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // In a real app, hash this!
  
  role: { 
    type: String, 
    enum: ['Doctor', 'Receptionist', 'Admin'], 
    default: 'Doctor' 
  },
  
  specialization: { type: String }, // Only for Doctors (e.g., "Orthodontist")
  phone: { type: String },
  
  // Available slots or schedule could go here later
  is_active: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model('User', UserSchema);