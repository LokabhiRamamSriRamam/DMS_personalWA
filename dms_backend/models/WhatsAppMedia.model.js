import mongoose from 'mongoose';

const WhatsAppMediaSchema = new mongoose.Schema({
  publicId:   { type: String, required: true },   // Cloudinary public_id
  url:        { type: String, required: true },   // Cloudinary secure_url
  // Broad type for all media categories
  type:       { type: String, enum: ['image', 'video', 'audio', 'document', 'sticker', 'pdf'], required: true },
  mimeType:   { type: String },                   // e.g. 'image/jpeg', 'video/mp4', 'audio/ogg'
  fileName:   { type: String, required: true },
  fileSize:   { type: Number },                   // bytes
  tags:       [{ type: String }],
  uploadedAt: { type: Date, default: Date.now },
}, { timestamps: true });

export { WhatsAppMediaSchema };
export default mongoose.model('WhatsAppMedia', WhatsAppMediaSchema);
