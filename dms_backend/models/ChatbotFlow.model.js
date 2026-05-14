import mongoose from 'mongoose';

const ChatbotFlowSchema = new mongoose.Schema({
  name:                 { type: String, required: true },
  description:          { type: String },
  isActive:             { type: Boolean, default: false },
  isTemplate:           { type: Boolean, default: false },
  triggerType: {
    type: String,
    enum: [
      'first_message',
      'appointment_received', 'appointment_confirmed',
      'appointment_booked', 'appointment_reminder',
      'appointment_completed', 'appointment_rescheduled',
      'treatment_completed', 'post_treatment_care',
      'invoice_created', 'custom_keyword',
    ],
    required: true,
  },
  triggerKeywords:      { type: [String], default: [] },
  treatmentName:        { type: String },
  reminderOffsetHours:  { type: Number, default: 24 },
  nodes:                { type: [mongoose.Schema.Types.Mixed], default: [] },
  edges:                { type: [mongoose.Schema.Types.Mixed], default: [] },
  rootNodeId:           { type: String },
}, { timestamps: true });

export { ChatbotFlowSchema };
export default mongoose.model('ChatbotFlow', ChatbotFlowSchema);
