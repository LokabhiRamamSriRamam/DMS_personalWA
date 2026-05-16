import mongoose from 'mongoose';

// Per-tenant invoice presentation config. The line-item table layout is fixed;
// only branding, currency, tax labelling and footer/terms are configurable.
export const InvoiceSettingsSchema = new mongoose.Schema(
  {
    clinic: {
      name:        { type: String, default: '' },
      addressLines: { type: [String], default: [] },
      phone:       { type: String, default: '' },
      email:       { type: String, default: '' },
      gstNumber:   { type: String, default: '' },
      logoUrl:     { type: String, default: '' },
    },
    currencySymbol: { type: String, default: '₹' },
    tax: {
      label:          { type: String, default: 'Tax' },
      defaultRatePct: { type: Number, default: 0 },
      show:           { type: Boolean, default: true },
    },
    invoiceNumber: {
      prefix: { type: String, default: 'INV' },
    },
    showPaidPending: { type: Boolean, default: true },
    footerText: { type: String, default: '' },
    termsText:  { type: String, default: '' },
  },
  { timestamps: true }
);
