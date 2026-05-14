import mongoose from 'mongoose';

const ChatbotSessionSchema = new mongoose.Schema({
  contactPhone:     { type: String, required: true, index: true },
  flowId:           { type: mongoose.Schema.Types.ObjectId, ref: 'ChatbotFlow' },
  currentNodeId:    { type: String },
  waitingForReply:  { type: Boolean, default: false },
  templateData:     { type: mongoose.Schema.Types.Mixed, default: {} },
  startedAt:        { type: Date, default: Date.now },
  lastActivityAt:   { type: Date, default: Date.now },
  status:           { type: String, enum: ['active', 'completed', 'abandoned'], default: 'active' },
}, { timestamps: true });

// TTL: auto-delete abandoned sessions after 24h of inactivity
ChatbotSessionSchema.index({ lastActivityAt: 1 }, { expireAfterSeconds: 86400 });

export { ChatbotSessionSchema };
export default mongoose.model('ChatbotSession', ChatbotSessionSchema);
