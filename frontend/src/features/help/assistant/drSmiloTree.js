export const NODES = {
  root: {
    smilo: "Hi! 👋 What do you need help with today?",
    avatarState: 'idle',
    options: [
      { id: 'go-patient',   label: 'Add or find a patient',          emoji: '🧑', next: 'patient' },
      { id: 'go-appt',      label: 'Book or manage appointments',     emoji: '📅', next: 'appt' },
      { id: 'go-billing',   label: 'Billing & payments',              emoji: '🧾', next: 'billing' },
      { id: 'go-clinical',  label: 'Clinical records & treatment',    emoji: '🦷', next: 'clinical' },
      { id: 'go-inventory', label: 'Inventory & stock',               emoji: '📦', next: 'inventory' },
      { id: 'go-lab',       label: 'Lab orders',                      emoji: '🧪', next: 'lab' },
      { id: 'go-whatsapp',  label: 'WhatsApp & messages',             emoji: '💬', next: 'whatsapp' },
      { id: 'go-reports',   label: 'Reports & analytics',             emoji: '📊', next: 'reports' },
      { id: 'go-broken',    label: "Something's not working",         emoji: '🔧', next: 'broken' },
      { id: 'free',         label: 'Something else...',               emoji: '🔍', freeText: true },
    ],
  },

  patient: {
    smilo: "Got it — patients. What do you need?",
    avatarState: 'thinking',
    options: [
      { id: 'p-register', label: 'Register a new patient',         slug: '01-patient-registration' },
      { id: 'p-search',   label: 'Search for an existing patient', slug: '01-patient-registration', hint: 'Search by phone number — it\'s the unique key per patient and the fastest way to find them.' },
      { id: 'p-update',   label: 'Update patient details',         slug: '01-patient-registration', hint: 'Open the patient profile and click Edit to update any field.' },
      { id: 'p-history',  label: "View a patient's history",       slug: '03-clinical-charting' },
      { id: 'back',       label: '← Back',                        back: true },
    ],
  },

  appt: {
    smilo: "Appointments — what specifically?",
    avatarState: 'thinking',
    options: [
      { id: 'a-book',        label: 'Book a new appointment',    slug: '02-book-appointment' },
      { id: 'a-reschedule',  label: 'Reschedule an appointment', slug: '02-book-appointment', hint: 'Open the appointment → click Reschedule → pick a new date and time.' },
      { id: 'a-cancel',      label: 'Cancel an appointment',     slug: '02-book-appointment', hint: "Open the appointment → click Cancel. Add a reason — it helps your reports." },
      { id: 'a-noshow',      label: 'Mark a no-show',            slug: '02-book-appointment', hint: "Open the appointment and change the status to 'No Show'. This keeps your reports accurate." },
      { id: 'back',          label: '← Back',                   back: true },
    ],
  },

  billing: {
    smilo: "Billing — what do you need to do?",
    avatarState: 'thinking',
    options: [
      { id: 'b-create',   label: 'Create an invoice',               slug: '04-invoicing-billing' },
      { id: 'b-payment',  label: 'Record a payment / clear balance', slug: '04-invoicing-billing', hint: 'Go to Billing → Outstanding tab → find the patient → click Record Payment.' },
      { id: 'b-discount', label: 'Apply a discount',                slug: '04-invoicing-billing', hint: 'Add the discount on the invoice before saving. A reason is required for audit trail.' },
      { id: 'b-receipt',  label: 'Send receipt to patient',         slug: '04-invoicing-billing', hint: "On any invoice, click 'Send via WhatsApp' to send directly to the patient's number." },
      { id: 'b-fix',      label: 'Fix or refund a paid invoice',    slug: 'billing', hint: "Paid invoices are locked. Use Credit Note to reverse and correct — don't edit the original." },
      { id: 'b-gst',      label: 'Set up GST / tax',               slug: 'billing', hint: 'Go to Settings → Billing → Tax Settings to configure your GST rate and GSTIN.' },
      { id: 'back',       label: '← Back',                        back: true },
    ],
  },

  clinical: {
    smilo: "Clinical records — what are you working on?",
    avatarState: 'thinking',
    options: [
      { id: 'c-treatment',    label: "Record today's treatment",   slug: '03-clinical-charting' },
      { id: 'c-prescription', label: 'Add a prescription',        slug: '03-clinical-charting', hint: 'Open the visit → Prescription section → add drug name, dosage, frequency and duration.' },
      { id: 'c-notes',        label: 'Write clinical notes',      slug: '03-clinical-charting', hint: 'Clinical notes are permanent once saved — write accurately. Add a dated correction note to fix errors.' },
      { id: 'c-xray',         label: 'Attach X-rays or documents', slug: '03-clinical-charting', hint: 'Open the visit → Attachments → upload the file directly to that visit record.' },
      { id: 'back',           label: '← Back',                   back: true },
    ],
  },

  inventory: {
    smilo: "Inventory — what do you need to do?",
    avatarState: 'thinking',
    options: [
      { id: 'i-add',     label: 'Add a new inventory item',    slug: '05-inventory' },
      { id: 'i-usage',   label: 'Record stock usage',          slug: '05-inventory', hint: 'Open the item → Record Usage → enter quantity used. Link to a visit if possible.' },
      { id: 'i-restock', label: 'Record a purchase / restock', slug: '05-inventory', hint: 'Open the item → Add Purchase → enter quantity received, supplier name and cost.' },
      { id: 'back',      label: '← Back',                     back: true },
    ],
  },

  lab: {
    smilo: "Lab orders — what do you need?",
    avatarState: 'thinking',
    options: [
      { id: 'l-create',  label: 'Create a new lab order',      slug: '06-lab-orders' },
      { id: 'l-status',  label: 'Update lab order status',     slug: '06-lab-orders', hint: 'Open the order → change status: Sent → In Progress → Ready for Trial → Received → Fitted.' },
      { id: 'l-receive', label: 'Mark lab work as received',   slug: '06-lab-orders', hint: "Open the order → click 'Mark Received' → note any adjustments needed before fitting." },
      { id: 'back',      label: '← Back',                     back: true },
    ],
  },

  whatsapp: {
    smilo: "WhatsApp — what do you need help with?",
    avatarState: 'thinking',
    options: [
      { id: 'w-connect', label: 'Connect the clinic WhatsApp', slug: '07-whatsapp-automation', hint: 'Go to WhatsApp → Settings → Connect Number → scan the QR code with the clinic phone.' },
      { id: 'w-flow',    label: 'Build or edit an automation flow', slug: '07-whatsapp-automation' },
      { id: 'w-silent',  label: "Patients not receiving messages",  slug: '07-whatsapp-automation', hint: 'Check: (1) session is Connected, (2) the flow is Active, (3) patient phone number is saved in their profile.' },
      { id: 'w-disconn', label: 'WhatsApp shows Disconnected',      slug: '07-whatsapp-automation', hint: "Re-scan the QR code: WhatsApp → Settings → Connect Number. This happens when the clinic phone restarts or goes offline." },
      { id: 'back',      label: '← Back',                         back: true },
    ],
  },

  reports: {
    smilo: "Reports — what would you like to see?",
    avatarState: 'thinking',
    options: [
      { id: 'r-revenue',     label: 'Revenue & collections',        slug: '08-analytics-reports', hint: 'Go to Insights → Revenue Report. Watch both Billed and Collected — they are not the same.' },
      { id: 'r-appts',       label: 'Appointment statistics',       slug: '08-analytics-reports', hint: 'Filter by provider to see individual productivity and no-show rates.' },
      { id: 'r-outstanding', label: 'See all outstanding payments', slug: '04-invoicing-billing', hint: 'Go to Billing → Outstanding tab. Review the 30+ day bucket first.' },
      { id: 'r-export',      label: 'Export data to Excel / CSV',   slug: '08-analytics-reports', hint: "On any report, click 'Export'. The CSV format is clean and ready for your accountant." },
      { id: 'back',          label: '← Back',                      back: true },
    ],
  },

  broken: {
    smilo: "Sorry to hear that — let's fix it. What's the issue?",
    avatarState: 'concerned',
    options: [
      { id: 'br-login', label: "Can't log in / forgot password",   slug: 'general', hint: "Click 'Forgot Password' on the login page. Check spam if the reset email doesn't arrive." },
      { id: 'br-menu',  label: "Can't see a menu or page",        slug: 'general', hint: 'This is usually role-based access. Ask your clinic admin to check your role permissions under Settings → Users.' },
      { id: 'br-load',  label: 'Page not loading correctly',      slug: 'general', hint: 'Try: (1) Ctrl+Shift+R to hard refresh, (2) clear browser cache, (3) switch to Chrome.' },
      { id: 'br-wa',    label: 'WhatsApp messages not sending',   slug: '07-whatsapp-automation', hint: 'Check if WhatsApp session is Connected. Go to WhatsApp → Settings — if Disconnected, re-scan the QR.' },
      { id: 'back',     label: '← Back',                         back: true },
    ],
  },

  // Context-aware entry nodes (shown when opening from a specific page)
  'ctx-appointments': {
    smilo: "I see you're on Appointments — what can I help with?",
    avatarState: 'idle',
    options: [
      { id: 'ca-book',       label: 'Book a new appointment',    slug: '02-book-appointment' },
      { id: 'ca-reschedule', label: 'Reschedule an appointment', slug: '02-book-appointment', hint: 'Open the appointment → Reschedule → pick a new slot.' },
      { id: 'ca-cancel',     label: 'Cancel an appointment',     slug: '02-book-appointment', hint: "Open the appointment → Cancel and add a reason." },
      { id: 'ca-noshow',     label: 'Mark a no-show',            slug: '02-book-appointment', hint: "Change the status to 'No Show' on the appointment." },
      { id: 'other',         label: 'Something else',            next: 'root' },
    ],
  },

  'ctx-patients': {
    smilo: "I see you're on Patients — what do you need?",
    avatarState: 'idle',
    options: [
      { id: 'cp-register', label: 'Register a new patient',         slug: '01-patient-registration' },
      { id: 'cp-search',   label: 'Search for an existing patient', slug: '01-patient-registration', hint: 'Search by phone — it\'s the fastest way to find a patient.' },
      { id: 'cp-history',  label: "View patient history",           slug: '03-clinical-charting' },
      { id: 'other',       label: 'Something else',                 next: 'root' },
    ],
  },

  'ctx-billing': {
    smilo: "I see you're on Billing — what do you need?",
    avatarState: 'idle',
    options: [
      { id: 'cb-create',  label: 'Create a new invoice',             slug: '04-invoicing-billing' },
      { id: 'cb-payment', label: 'Record a payment / clear balance', slug: '04-invoicing-billing', hint: 'Outstanding tab → find patient → Record Payment.' },
      { id: 'cb-fix',     label: 'Fix or refund a paid invoice',     slug: 'billing', hint: 'Use a Credit Note — paid invoices cannot be edited.' },
      { id: 'other',      label: 'Something else',                   next: 'root' },
    ],
  },

  'ctx-inventory': {
    smilo: "I see you're on Inventory — what do you need?",
    avatarState: 'idle',
    options: [
      { id: 'ci-add',     label: 'Add a new item',           slug: '05-inventory' },
      { id: 'ci-usage',   label: 'Record stock usage',       slug: '05-inventory' },
      { id: 'ci-restock', label: 'Record a purchase',        slug: '05-inventory' },
      { id: 'other',      label: 'Something else',           next: 'root' },
    ],
  },

  'ctx-lab': {
    smilo: "I see you're on Lab Orders — what do you need?",
    avatarState: 'idle',
    options: [
      { id: 'cl-create',  label: 'Create a lab order',      slug: '06-lab-orders' },
      { id: 'cl-status',  label: 'Update an order status',  slug: '06-lab-orders' },
      { id: 'cl-receive', label: 'Mark work as received',   slug: '06-lab-orders' },
      { id: 'other',      label: 'Something else',          next: 'root' },
    ],
  },

  'ctx-whatsapp': {
    smilo: "I see you're on WhatsApp — need help?",
    avatarState: 'idle',
    options: [
      { id: 'cw-connect', label: 'Connect clinic number',     slug: '07-whatsapp-automation', hint: 'Settings → Connect Number → scan QR with the clinic phone.' },
      { id: 'cw-flow',    label: 'Build or edit a flow',      slug: '07-whatsapp-automation' },
      { id: 'cw-silent',  label: 'Messages not being sent',   slug: '07-whatsapp-automation', hint: 'Check: session Connected? Flow Active? Patient phone saved?' },
      { id: 'other',      label: 'Something else',            next: 'root' },
    ],
  },

  'ctx-reports': {
    smilo: "I see you're on Reports — what are you looking for?",
    avatarState: 'idle',
    options: [
      { id: 'cr-revenue',     label: 'Revenue & collections',  slug: '08-analytics-reports' },
      { id: 'cr-outstanding', label: 'Outstanding payments',   slug: '04-invoicing-billing' },
      { id: 'cr-export',      label: 'Export to CSV',          slug: '08-analytics-reports' },
      { id: 'other',          label: 'Something else',         next: 'root' },
    ],
  },
};
