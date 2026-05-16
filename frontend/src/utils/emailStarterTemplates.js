// Hardcoded starter email templates per event.
// Users import one of these into the template editor, tweak the wording,
// and save it as their active EmailTemplate (persisted via the backend).
// Variables use the {{var}} syntax matching utils/templateVariables.js.

export const STARTER_TEMPLATES = {
  appointmentBooked: {
    subject: 'Your appointment is confirmed — {{date}} at {{time}}',
    body:
`Hi {{first_name}},

Your appointment at {{clinic}} has been confirmed.

  Date:   {{date}}
  Time:   {{time}}
  Doctor: {{doctor}}

Please arrive 5 minutes early. If you need to reschedule, just reply to this email or call the clinic.

Warm regards,
{{clinic}}`,
  },

  appointmentCompleted: {
    subject: 'Your visit summary from {{clinic}} — {{date}}',
    body:
`Hi {{first_name}},

Thank you for visiting {{clinic}} today.

  Doctor:     {{doctor}}
  Date:       {{date}}
  Treatments: {{treatments}}

Your visit summary and related documents are attached to this email for your records.

If you have any questions about your treatment or follow-up care, feel free to reach out.

Warm regards,
{{clinic}}`,
  },

  invoiceGenerated: {
    subject: 'Invoice {{invoice_id}} from {{clinic}}',
    body:
`Hi {{first_name}},

Your invoice from {{clinic}} is ready.

  Invoice ID: {{invoice_id}}
  Amount:     {{amount}}
  Date:       {{date}}

A copy of the invoice is attached. Please contact us if you have any questions about your bill.

Warm regards,
{{clinic}}`,
  },

  aiReportReady: {
    subject: 'Your clinical report from {{clinic}} is ready',
    body:
`Hi {{first_name}},

Your clinical report from your visit on {{date}} with {{doctor}} at {{clinic}} is now ready.

Please find the report attached for your reference. If anything in the report is unclear, do not hesitate to contact the clinic.

Warm regards,
{{clinic}}`,
  },
};

export const STARTER_TEMPLATE_LABELS = {
  appointmentBooked:    'Appointment Booked',
  appointmentCompleted: 'Appointment Completed',
  invoiceGenerated:     'Invoice Generated',
  aiReportReady:        'AI Report Ready',
};
