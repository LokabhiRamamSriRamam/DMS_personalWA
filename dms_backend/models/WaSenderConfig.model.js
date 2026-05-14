import mongoose from 'mongoose';

const WaSenderConfigSchema = new mongoose.Schema({
  sessionId:            { type: String },
  sessionName:          { type: String },
  personalAccessToken:  { type: String },
  sessionApiKey:        { type: String },
  webhookSecret:        { type: String },
  connectedPhone:       { type: String },
  status:               { type: String, enum: ['connected', 'disconnected', 'need_scan', 'unknown'], default: 'unknown' },
  logMessages:          { type: Boolean, default: true },
  isActive:             { type: Boolean, default: false },
}, { timestamps: true });

export { WaSenderConfigSchema };
export default mongoose.model('WaSenderConfig', WaSenderConfigSchema);
