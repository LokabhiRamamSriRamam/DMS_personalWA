import mongoose from 'mongoose';

const BreakSchema = new mongoose.Schema({ start: String, end: String }, { _id: false });

const DaySchema = new mongoose.Schema({
  isOpen: { type: Boolean, default: false },
  start:  { type: String, default: '09:00' },
  end:    { type: String, default: '18:00' },
  breaks: { type: [BreakSchema], default: [] },
}, { _id: false });

const DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];

const workingHoursDefault = () => Object.fromEntries(
  DAYS.map(d => [d, { isOpen: d !== 'sunday', start: '09:00', end: '18:00', breaks: [] }])
);

const BookingSettingsSchema = new mongoose.Schema({
  isBookingEnabled:     { type: Boolean, default: true },
  slotDurationMinutes:  { type: Number,  default: 30 },
  clinicDisplayName:    { type: String },
  clinicTagline:        { type: String },
  clinicLogoUrl:        { type: String },
  workingHours: {
    monday:    { type: DaySchema, default: () => ({}) },
    tuesday:   { type: DaySchema, default: () => ({}) },
    wednesday: { type: DaySchema, default: () => ({}) },
    thursday:  { type: DaySchema, default: () => ({}) },
    friday:    { type: DaySchema, default: () => ({}) },
    saturday:  { type: DaySchema, default: () => ({}) },
    sunday:    { type: DaySchema, default: () => ({}) },
  },
  blockedDates: [{
    date:   { type: Date },
    reason: { type: String },
    _id:    false,
  }],
}, { timestamps: true });

export { BookingSettingsSchema };
export default mongoose.model('BookingSettings', BookingSettingsSchema);
