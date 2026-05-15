import mongoose from 'mongoose';

const WaSenderMessageSchema = new mongoose.Schema({
  phone:      { type: String, required: true, index: true }, // normalised 10-digit
  direction:  { type: String, enum: ['inbound', 'outbound'], required: true },
  body:       { type: String, default: '' },
  type:       { type: String, default: 'text' },  // text | image | document | poll | audio | video
  timestamp:  { type: Number, index: true },       // unix seconds
  messageId:  { type: String, sparse: true },      // for deduplication
  mediaUrl:   { type: String },
  caption:    { type: String },
  fileName:   { type: String },
}, { timestamps: true });

// Compound index: fast per-contact thread fetch sorted by time
WaSenderMessageSchema.index({ phone: 1, timestamp: -1 });

export { WaSenderMessageSchema };
export default mongoose.model('WaSenderMessage', WaSenderMessageSchema);
