import mongoose from 'mongoose';

const ReportJobSchema = new mongoose.Schema({
  patientId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  status:        { type: String, enum: ['pending', 'transcribing', 'transcribed', 'generating', 'done', 'failed'], default: 'pending' },
  sarvamJobId:   { type: String },
  transcript:    { type: String },
  reportText:    { type: String },
  driveLinks:    { type: mongoose.Schema.Types.Mixed, default: {} },
  autofillData:  { type: mongoose.Schema.Types.Mixed },
  templateId:    { type: String },
  detailLevel:   { type: String, enum: ['brief', 'standard', 'detailed'], default: 'standard' },
  saveReport:    { type: Boolean, default: true },
  runAutofill:   { type: Boolean, default: false },
  audioFilename: { type: String },
  audioMimetype: { type: String },
  errorMessage:  { type: String },
  createdBy:     { type: String },
}, { timestamps: true });

export { ReportJobSchema };
