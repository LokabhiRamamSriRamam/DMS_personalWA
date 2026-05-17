import mongoose from 'mongoose';

const WhatsAppMediaSchema = new mongoose.Schema({
  publicId:  { type: String, required: true },
  url:       { type: String, required: true },
  fileName:  { type: String, required: true },
  mediaType: { type: String, enum: ['image', 'video', 'document', 'audio'], required: true },
  mimeType:  { type: String },
  size:      { type: Number },
}, { timestamps: true });

export { WhatsAppMediaSchema };
export default mongoose.model('WhatsAppMedia', WhatsAppMediaSchema);
