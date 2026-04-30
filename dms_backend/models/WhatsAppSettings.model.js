import mongoose from 'mongoose';

const EventToggleSchema = new mongoose.Schema({
  enabled:      { type: Boolean, default: false },
  delayMinutes: { type: Number,  default: 0 },
}, { _id: false });

const FeedbackPollSchema = new mongoose.Schema({
  enabled:       { type: Boolean, default: false },
  delayMinutes:  { type: Number,  default: 15 },
  pollTemplateId: { type: String, default: null }, // Links to PollTemplate._id
}, { _id: false });

const ReminderToggleSchema = new mongoose.Schema({
  enabled:               { type: Boolean, default: false },
  hoursBeforeAppointment: { type: Number,  default: 24 },
}, { _id: false });

const WhatsAppSettingsSchema = new mongoose.Schema({
  enabled:          { type: Boolean, default: false },
  defaultLanguage:  { type: String, enum: ['en', 'hi', 'mr'], default: 'en' },
  fallbackLanguage: { type: String, enum: ['en', 'hi', 'mr'], default: 'en' },
  events: {
    appointmentBooked:       { type: EventToggleSchema, default: () => ({}) },
    appointmentReminder:     { type: ReminderToggleSchema, default: () => ({}) },
    appointmentRescheduled:  { type: EventToggleSchema, default: () => ({}) },
    treatmentCompleted:      { type: EventToggleSchema, default: () => ({}) },
    feedbackMessage:         { type: EventToggleSchema, default: () => ({}) },
    feedbackPoll:            { type: FeedbackPollSchema, default: () => ({}) },
    postCare:                { type: EventToggleSchema, default: () => ({}) },
  },
}, { timestamps: true });

export { WhatsAppSettingsSchema };
export default mongoose.model('WhatsAppSettings', WhatsAppSettingsSchema);
