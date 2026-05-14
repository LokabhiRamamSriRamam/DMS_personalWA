import mongoose from 'mongoose';

const BreakSchema  = new mongoose.Schema({ start: String, end: String }, { _id: false });
const DaySchema    = new mongoose.Schema({
  isOpen: { type: Boolean, default: false },
  start:  { type: String,  default: '09:00' },
  end:    { type: String,  default: '18:00' },
  breaks: { type: [BreakSchema], default: [] },
}, { _id: false });

const DoctorSchema = new mongoose.Schema({
  name:             { type: String, required: true },
  specialization:   { type: String },
  email:            { type: String },
  phone:            { type: String },
  license_number:   { type: String },
  qualification:    { type: String },
  experience_years: { type: Number, default: 0 },
  is_active:        { type: Boolean, default: true },
  availability: {
    monday:    { start: String, end: String },
    tuesday:   { start: String, end: String },
    wednesday: { start: String, end: String },
    thursday:  { start: String, end: String },
    friday:    { start: String, end: String },
    saturday:  { start: String, end: String },
    sunday:    { start: String, end: String },
  },
  notes: { type: String },

  // ── Online booking fields ──────────────────────────────────────────────────
  isBookable: { type: Boolean, default: false },
  bookingWorkingHours: {
    monday:    { type: DaySchema, default: () => ({}) },
    tuesday:   { type: DaySchema, default: () => ({}) },
    wednesday: { type: DaySchema, default: () => ({}) },
    thursday:  { type: DaySchema, default: () => ({}) },
    friday:    { type: DaySchema, default: () => ({}) },
    saturday:  { type: DaySchema, default: () => ({}) },
    sunday:    { type: DaySchema, default: () => ({}) },
  },
  holidays: [{
    date:   { type: Date },
    reason: { type: String },
    _id:    false,
  }],
  blockedSlots: [{
    date:      { type: Date },
    startTime: { type: String },
    endTime:   { type: String },
    reason:    { type: String },
    _id:       false,
  }],
}, { timestamps: true });

export { DoctorSchema };
export default mongoose.model('Doctor', DoctorSchema);
