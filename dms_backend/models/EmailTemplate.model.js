import mongoose from 'mongoose';

export const EmailTemplateSchema = new mongoose.Schema(
  {
    event: {
      type: String,
      enum: ['appointmentBooked', 'appointmentCompleted'],
      required: true,
    },
    language: {
      type: String,
      enum: ['en', 'hi', 'mr'],
      required: true,
      default: 'en',
    },
    subject: {
      type: String,
      required: true,
    },
    body: {
      type: String,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    indexes: [
      { event: 1, language: 1, isActive: 1 },
    ],
  }
);
