import mongoose from 'mongoose';

export const EmailSettingsSchema = new mongoose.Schema(
  {
    enabled: {
      type: Boolean,
      default: false,
    },
    automationEnabled: {
      type: Boolean,
      default: false,
    },
    mode: {
      type: String,
      enum: ['gmail', 'custom'],
      default: 'gmail',
    },
    smtp: {
      host: {
        type: String,
        default: 'smtp.gmail.com',
      },
      port: {
        type: Number,
        default: 465,
      },
      secure: {
        type: Boolean,
        default: true,
      },
      user: String,
      password: String, // encrypted via crypto.util
    },
    fromName: String,
    fromEmail: String,
    replyTo: String,
    events: {
      aiReportReady: {
        enabled: {
          type: Boolean,
          default: false,
        },
        delayMinutes: {
          type: Number,
          default: 0,
        },
      },
      appointmentBooked: {
        enabled: {
          type: Boolean,
          default: false,
        },
        delayMinutes: {
          type: Number,
          default: 0,
        },
      },
      invoiceGenerated: {
        enabled: {
          type: Boolean,
          default: false,
        },
        delayMinutes: {
          type: Number,
          default: 0,
        },
      },
    },
  },
  {
    timestamps: true,
  }
);
