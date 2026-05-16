import API from '../services/api';

// ── Canonical per-event variable catalog ──────────────────────────────────────
// Mirrors the backend TEMPLATE_VARIABLES (controllers/email.controller.js).
// The backend is the source of truth; fetchTemplateVariables() refreshes these
// at runtime, but these statics serve as an offline fallback / sensible default.

export const TEMPLATE_VARIABLES = {
  appointmentBooked:    ['first_name', 'name', 'doctor', 'date', 'time', 'clinic'],
  appointmentCompleted: ['first_name', 'name', 'doctor', 'date', 'treatments', 'clinic'],
  invoiceGenerated:     ['first_name', 'name', 'invoice_id', 'amount', 'date', 'clinic'],
  aiReportReady:        ['first_name', 'name', 'doctor', 'date', 'clinic'],
};

export const TEMPLATE_VARIABLE_LABELS = {
  first_name: 'Patient First Name',
  name:       'Patient Full Name',
  doctor:     'Doctor Name',
  date:       'Date',
  time:       'Appointment Time',
  treatments: 'Treatments',
  invoice_id: 'Invoice ID',
  amount:     'Invoice Amount',
  clinic:     'Clinic Name',
};

export const SAMPLE_DATA = {
  first_name: 'Rahul',
  name:       'Rahul Sharma',
  doctor:     'Dr. Avtansh Giri',
  date:       '15 May 2026',
  time:       '10:30 AM',
  treatments: 'Root Canal, Scaling',
  invoice_id: 'INV-2026-001',
  amount:     '₹5,000',
  clinic:     'City Dental Clinic',
};

// Flat list of every unique variable across all events
export const ALL_VARIABLES = [
  ...new Set(Object.values(TEMPLATE_VARIABLES).flat()),
];

export function variablesForEvent(event) {
  return TEMPLATE_VARIABLES[event] || ALL_VARIABLES;
}

export function replacePlaceholders(str, data) {
  return String(str || '').replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] ?? `{{${key}}}`);
}

// Fetch the live variable catalog from the backend.
// Returns { events, labels, sample } — falls back to the statics on error.
export async function fetchTemplateVariables() {
  try {
    const res = await API.get('/email/template-variables');
    return {
      events: res.data.events || TEMPLATE_VARIABLES,
      labels: res.data.labels || TEMPLATE_VARIABLE_LABELS,
      sample: res.data.sample || SAMPLE_DATA,
    };
  } catch {
    return {
      events: TEMPLATE_VARIABLES,
      labels: TEMPLATE_VARIABLE_LABELS,
      sample: SAMPLE_DATA,
    };
  }
}
