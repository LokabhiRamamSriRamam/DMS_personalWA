import mongoose from 'mongoose';

export const EmailLogSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
    },
    event: String, // 'aiReportReady', 'manual', 'appointmentBooked', etc.
    to: {
      type: String,
      required: true,
    },
    subject: String,
    attachments: [
      {
        filename: String,
        size: Number,
      },
    ],
    status: {
      type: String,
      enum: ['sent', 'failed'],
      required: true,
    },
    messageId: String, // nodemailer's response messageId
    errorMessage: String,
    sentAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);
