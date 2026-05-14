import mongoose from 'mongoose';

const ScheduledMessageSchema = new mongoose.Schema({
  sessionApiKey:    { type: String, required: true },
  phone:            { type: String, required: true, index: true },
  flowSessionId:    { type: mongoose.Schema.Types.ObjectId, ref: 'ChatbotSession' },
  flowId:           { type: mongoose.Schema.Types.ObjectId, ref: 'ChatbotFlow' },
  nextNodeId:       { type: String, required: true },
  templateData:     { type: mongoose.Schema.Types.Mixed, default: {} },
  scheduledAt:      { type: Date, required: true, index: true },
  status:           { type: String, enum: ['pending', 'sent', 'failed'], default: 'pending' },
}, { timestamps: true });

export { ScheduledMessageSchema };
export default mongoose.model('ScheduledMessage', ScheduledMessageSchema);
