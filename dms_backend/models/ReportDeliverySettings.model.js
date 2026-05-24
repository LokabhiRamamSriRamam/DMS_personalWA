import mongoose from 'mongoose';

// Per-tenant templates + defaults for delivering an AI clinical report to a
// patient from the report modal's "Approve & Send" step. Single doc per tenant.
// Supported placeholders: {{patientName}}, {{firstName}}, {{doctorName}},
// {{clinicName}}, {{date}}, {{templateName}}.
export const ReportDeliverySettingsSchema = new mongoose.Schema(
  {
    email: {
      subject: { type: String, default: 'Your visit summary — {{date}}' },
      body: {
        type: String,
        default:
          'Hi {{patientName}},\n\nPlease find your {{templateName}} from your visit attached.\n\nWarm regards,\n{{doctorName}}\n{{clinicName}}',
      },
    },
    whatsapp: {
      text: {
        type: String,
        default:
          'Hi {{patientName}}, please find your {{templateName}} from {{doctorName}} at {{clinicName}}. Reach out if you have any questions.',
      },
    },
    // Which channels are pre-ticked when the delivery step opens.
    defaults: {
      cloud:    { type: Boolean, default: true },
      email:    { type: Boolean, default: false },
      whatsapp: { type: Boolean, default: false },
    },
    // Branded PDF generation — saves/sends a PDF instead of plain text
    pdf: {
      enabled:       { type: Boolean, default: false },
      clinicName:    { type: String,  default: '' },
      clinicTagline: { type: String,  default: '' },
      clinicAddress: { type: String,  default: '' },
      clinicPhone:   { type: String,  default: '' },
      clinicEmail:   { type: String,  default: '' },
      clinicLogoUrl: { type: String,  default: '' },
    },
    // Wrap report in a branded HTML email body instead of plain text
    htmlEmail: {
      enabled: { type: Boolean, default: false },
    },
  },
  { timestamps: true },
);
