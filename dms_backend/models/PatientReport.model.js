import mongoose from 'mongoose';
import crypto from 'crypto';

// One doc per generated report shared via the patient portal.
// Token is the URL secret; TTL index auto-deletes after expiresAt.
export const PatientReportSchema = new mongoose.Schema({
  token:         { type: String, default: () => crypto.randomBytes(24).toString('hex'), index: true },
  reportText:    { type: String, required: true },
  templateName:  { type: String, default: 'Clinical Report' },
  patientName:   { type: String, default: '' },
  patientId:     { type: mongoose.Schema.Types.ObjectId },
  doctorName:    { type: String, default: '' },
  clinicName:    { type: String, default: '' },
  clinicTagline: { type: String, default: '' },
  clinicLogoUrl: { type: String, default: '' },
  generatedAt:   { type: Date, default: Date.now },
  expiresAt:     { type: Date },
}, { timestamps: false });

PatientReportSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
