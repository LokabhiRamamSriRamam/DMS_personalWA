import mongoose from 'mongoose';

// Each language variant within a step can have its own content type + content object
const LangContentSchema = new mongoose.Schema({
  contentType: { type: String, enum: ['text', 'image', 'video', 'document', 'audio', 'location', 'poll'], default: 'text' },
  // Flexible content — shape matches WAAPI payload per contentType:
  // text:     { text }
  // image:    { url, caption?, mimetype? }
  // video:    { url, mimetype, caption? }
  // document: { url, mimetype, fileName?, caption? }
  // audio:    { url, mimetype, ptt? }
  // location: { degreesLatitude, degreesLongitude, name?, address? }
  // poll:     { name, values[], selectableCount? }
  content: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
}, { _id: false });

const JourneyMessageSchema = new mongoose.Schema({
  id: { type: String, required: true },
  delay: {
    value: { type: Number, required: true, min: 0 },
    unit:  { type: String, enum: ['minutes', 'hours', 'days'], required: true },
  },
  // Per-language rich content (replaces flat template + mediaUrl)
  languages: {
    en: { type: LangContentSchema, default: () => ({}) },
    hi: { type: LangContentSchema, default: () => ({}) },
    mr: { type: LangContentSchema, default: () => ({}) },
  },
}, { _id: false });

const TreatmentJourneySchema = new mongoose.Schema({
  treatmentName: { type: String, required: true, trim: true },
  enabled:       { type: Boolean, default: true },
  messages:      [JourneyMessageSchema],
}, { timestamps: true });

TreatmentJourneySchema.index({ treatmentName: 1 });

export { TreatmentJourneySchema };
export default mongoose.model('TreatmentJourney', TreatmentJourneySchema);
