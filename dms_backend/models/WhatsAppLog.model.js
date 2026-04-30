import mongoose from 'mongoose';

const WhatsAppLogSchema = new mongoose.Schema({
  patientId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
  event:        { type: String, required: true },
  to:           { type: String, required: true },
  payload:      { type: mongoose.Schema.Types.Mixed },
  status:       { type: String, enum: ['sent', 'failed', 'scheduled'], required: true },
  errorMessage: { type: String },
  sentAt:       { type: Date, default: Date.now },
  scheduledAt:  { type: Date }, // When the message is scheduled to be sent (for 'scheduled' status)
}, { timestamps: true });

WhatsAppLogSchema.index({ patientId: 1, sentAt: -1 });
WhatsAppLogSchema.index({ event: 1, sentAt: -1 });

export { WhatsAppLogSchema };
export default mongoose.model('WhatsAppLog', WhatsAppLogSchema);
