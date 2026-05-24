import mongoose from 'mongoose';

export const PrescriptionSettingsSchema = new mongoose.Schema(
  {
    clinic: {
      name:         { type: String, default: '' },
      tagline:      { type: String, default: '' },
      addressLines: { type: [String], default: [] },
      phone:        { type: String, default: '' },
      email:        { type: String, default: '' },
      logoUrl:      { type: String, default: '' },
    },
    footerText: { type: String, default: '' },
  },
  { timestamps: true }
);
