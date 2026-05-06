export const TEMPLATE_VARIABLES = [
  'name', 'date', 'doctor', 'amount', 'invoiceId', 'treatment',
];

export const TEMPLATE_VARIABLE_LABELS = {
  name:      'Patient Name',
  date:      'Date',
  doctor:    'Doctor Name',
  amount:    'Amount',
  invoiceId: 'Invoice ID',
  treatment: 'Treatment',
};

export const SAMPLE_DATA = {
  name:      'John Doe',
  date:      '06 May 2026',
  doctor:    'Dr. Avtansh Giri',
  amount:    '₹5,000',
  invoiceId: 'INV-2026-001',
  treatment: 'Root Canal Treatment',
};

export function replacePlaceholders(str, data) {
  return str.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] ?? `{{${key}}}`);
}
