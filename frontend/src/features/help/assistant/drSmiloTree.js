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
      { id: 'go-email',     label: 'Email & document sharing',        emoji: '📧', next: 'email' },
      { id: 'go-reports',   label: 'Reports & analytics',             emoji: '📊', next: 'reports' },
      { id: 'go-ai-report',  label: 'AI clinical report 🤖',             emoji: '🤖', next: 'ai-report' },
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
      { id: 'c-ai-report',    label: 'Generate an AI clinical report 🤖', next: 'ai-report' },
      { id: 'back',           label: '← Back',                   back: true },
    ],
  },

  'ai-report': {
    smilo: "The AI Report feature turns your voice dictation into a polished clinical document in seconds. What would you like to know?",
    avatarState: 'happy',
    options: [
      { id: 'air-how',        label: 'Walk me through the full process', next: 'ai-report-step1' },
      { id: 'air-templates',  label: 'What templates are available?',    next: 'ai-report-templates' },
      { id: 'air-deliver',    label: 'How do I send it to the patient?', next: 'ai-report-deliver' },
      { id: 'air-fix',        label: "Something went wrong / it's stuck", next: 'ai-report-trouble' },
      { id: 'air-guide',      label: 'Show me the full help guide',      slug: '10-ai-report-generation' },
      { id: 'back',           label: '← Back',                          back: true },
    ],
  },

  'ai-report-step1': {
    smilo: "Here's the complete process — Step 1 of 4.\n\n📋 **Choose a template** — open the AI Report from the patient's treatment page (bottom-right button). Pick the document type from the dropdown (Patient Letter, SOAP Note, H&P Note, etc.) and set the Detail Level: Brief, Standard, or Detailed.",
    avatarState: 'idle',
    options: [
      { id: 'step2', label: 'Next: Record the consultation →', next: 'ai-report-step2' },
      { id: 'air-templates', label: 'What do the templates mean?', next: 'ai-report-templates' },
      { id: 'back', label: '← Back', back: true },
    ],
  },

  'ai-report-step2': {
    smilo: "Step 2 of 4.\n\n🎙️ **Dictate the consultation** — click the blue microphone and speak naturally. Cover the complaint, history, exam findings, diagnosis, treatment done today, plan, medications, and follow-up.\n\nUse **Pause** to take a break without losing audio. Click the mic again to **Stop** when done.",
    avatarState: 'idle',
    options: [
      { id: 'step3', label: 'Next: Review the transcript →', next: 'ai-report-step3' },
      { id: 'tip-mic', label: 'Tips for a better recording', hint: "Speak clearly and at normal pace. Dictate tooth numbers using FDI notation (e.g. 'tooth 36'). Spell out drug names if they're unusual. You can also type the transcript directly — use the text box below the mic.", next: 'ai-report-step2' },
      { id: 'back', label: '← Back', back: true },
    ],
  },

  'ai-report-step3': {
    smilo: "Step 3 of 4.\n\n✏️ **Review the transcript** — Molaris AI converts your voice to text (takes 20–60 seconds). Read through it and click Edit to fix any errors — tooth numbers, drug names, and doctor names are the most common mistakes. Your corrections are used for generation.",
    avatarState: 'idle',
    options: [
      { id: 'step4', label: 'Next: Generate & deliver →', next: 'ai-report-step4' },
      { id: 'back', label: '← Back', back: true },
    ],
  },

  'ai-report-step4': {
    smilo: "Step 4 of 4.\n\n🚀 **Generate, review, and send** — click Generate. The document streams in real time. Once done, you can click the text to edit it directly.\n\nThen tick your delivery channels — **Connect Cloud**, **Email**, or **WhatsApp** — and click **Approve & Send**. That's it! ✅",
    avatarState: 'happy',
    options: [
      { id: 'air-deliver',  label: 'Tell me more about sending to the patient', next: 'ai-report-deliver' },
      { id: 'air-guide',    label: 'See the full help guide',                   slug: '10-ai-report-generation' },
      { id: 'back',         label: '← Back',                                    back: true },
    ],
  },

  'ai-report-templates': {
    smilo: "There are 7 templates — all under the Clinical category:\n\n🗒️ **Patient Letter** — warm, plain-language summary the patient takes home\n📋 **Dentistry Note** — full clinical record (complaint, exam, diagnosis, plan)\n🔬 **Comprehensive Dental Exam** — detailed exam with consent, procedures, instrument tracking\n📊 **SOAP Note** — Subjective / Objective / Assessment / Plan\n📊 **SOAP Note (Issues Centric)** — same as SOAP but organized per problem\n🏥 **H&P Note** — History & Physical with Impression and Management Plan\n🏥 **H&P Note (Issues Centric)** — H&P organized per individual issue\n\nWhich one do you want to know more about?",
    avatarState: 'thinking',
    options: [
      { id: 'tpl-letter',   label: 'Patient Letter',               hint: 'Written in empathetic, patient-friendly language. Covers every topic discussed, with Next Steps at the end. Best for sending to patients after any visit.' },
      { id: 'tpl-dent',     label: 'Dentistry Note',               hint: 'A comprehensive clinical record — chief complaint, history, extra-oral/intra-oral findings, radiographs, diagnoses, prognosis, and treatment plan. Ideal for internal record-keeping.' },
      { id: 'tpl-exam',     label: 'Comprehensive Dental Exam',    hint: 'The most detailed template — includes practitioner details, consent, procedures conducted, instrument tracking, medications, and unusual events. Designed for thorough medico-legal documentation.' },
      { id: 'tpl-soap',     label: 'SOAP / H&P Notes',             hint: 'SOAP (Subjective/Objective/Assessment/Plan) and H&P (History & Physical) are standard clinical formats. The "Issues Centric" variants organize the Assessment & Plan section by individual problem — useful for multi-issue visits.' },
      { id: 'back',         label: '← Back',                       back: true },
    ],
  },

  'ai-report-deliver': {
    smilo: "After the report is generated, tick the channels you want under **Approve & Send**:\n\n☁️ **Connect Cloud** — saves a text file in the patient's clinical notes folder\n📧 **Email** — attaches the report and sends to the patient's email address\n💬 **WhatsApp** — sends the document directly via the clinic WhatsApp\n\nAll three can be sent together in one click. You can also use the **Send via Email** or **Send via WhatsApp** buttons at the bottom of the Treatment page to send documents (AI Report, Smart Report, Invoice) any time.",
    avatarState: 'idle',
    options: [
      { id: 'air-settings', label: 'Where do I configure document sharing?', hint: "Go to Settings → Share with Patient. You'll find settings for Invoice, Prescription, Smart Report, and AI Report. For automated emails, go to Settings → Email → Automation." },
      { id: 'air-guide',    label: 'Full help guide',                        slug: '10-ai-report-generation' },
      { id: 'back',         label: '← Back',                                 back: true },
    ],
  },

  'ai-report-trouble': {
    smilo: "Sorry to hear something went wrong. What's happening?",
    avatarState: 'concerned',
    options: [
      { id: 'tr-stuck',   label: 'Spinner is stuck / nothing is generating', hint: "The AI may be cold-starting — wait up to 3–4 minutes. If still nothing, click Cancel (top-right of the generating panel) to abort and try again. The transcript is preserved." },
      { id: 'tr-wrong',   label: 'The transcript has wrong words',           hint: "Edit the transcript before you click Generate — click Edit in the Review step and fix tooth numbers, drug names, or any mishearing. Correcting there gives much better output." },
      { id: 'tr-empty',   label: 'The report came back empty',               hint: "This happens when the transcript is too short or unclear. Edit the transcript to add more context, then click Regenerate (shown in the report header)." },
      { id: 'tr-send',    label: 'Email or WhatsApp failed to send',         hint: "The report is safe — it's not lost. Check the patient's email address or phone number, then click Approve & Send again. Only the failed channel retries." },
      { id: 'air-guide',  label: 'Full troubleshooting guide',               slug: '10-ai-report-generation' },
      { id: 'back',       label: '← Back',                                   back: true },
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
      { id: 'ca-book',       label: 'Book a new appointment',          slug: '02-book-appointment' },
      { id: 'ca-reschedule', label: 'Reschedule an appointment',       slug: '02-book-appointment', hint: 'Open the appointment → Reschedule → pick a new slot.' },
      { id: 'ca-cancel',     label: 'Cancel an appointment',           slug: '02-book-appointment', hint: "Open the appointment → Cancel and add a reason." },
      { id: 'ca-noshow',     label: 'Mark a no-show',                  slug: '02-book-appointment', hint: "Change the status to 'No Show' on the appointment." },
      { id: 'ca-ai-report',  label: 'Generate an AI clinical report 🤖', next: 'ai-report' },
      { id: 'other',         label: 'Something else',                  next: 'root' },
    ],
  },

  'ctx-treatment': {
    smilo: "I see you're on a patient's treatment page. What do you need help with?",
    avatarState: 'idle',
    options: [
      { id: 'ct-ai-report',    label: 'Generate an AI clinical report 🤖', next: 'ai-report' },
      { id: 'ct-treatment',    label: "Record today's treatment",           slug: '03-clinical-charting' },
      { id: 'ct-notes',        label: 'Write clinical notes',               slug: '03-clinical-charting', hint: 'Clinical notes are permanent once saved — write accurately. Add a dated correction note to fix errors.' },
      { id: 'ct-prescription', label: 'Add a prescription',                 slug: '03-clinical-charting', hint: 'Open the visit → Prescription section → add drug name, dosage, frequency, and duration.' },
      { id: 'ct-send',         label: 'Send documents to patient',          hint: "Scroll to the bottom bar of the Treatment page. 'Send via Email' sends PDFs (Smart Report, Invoice, AI Report) by email. 'Send via WhatsApp' sends the same documents as WhatsApp files — enter the number with country code, e.g. 919876543210." },
      { id: 'other',           label: 'Something else',                     next: 'root' },
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

  email: {
    smilo: "Email & document sharing — what do you need?",
    avatarState: 'thinking',
    options: [
      { id: 'e-connect',    label: 'Connect Gmail / SMTP',               hint: "Go to Settings → Email → Connection. Choose Gmail or Custom SMTP, enter credentials, and click Save. Use Gmail App Password — not your regular password. Test with the Send Test button." },
      { id: 'e-automation', label: 'Set up automatic emails',            next: 'email-automation' },
      { id: 'e-send',       label: 'Send documents from treatment page', hint: "Open the patient's Treatment page → scroll to the bottom bar → click 'Send via Email' (email + PDF attachments) or 'Send via WhatsApp' (direct document delivery). Both buttons let you choose which documents to include." },
      { id: 'e-share',      label: 'Configure document sharing settings', hint: "Go to Settings → Share with Patient. Four sections: Invoice, Prescription, Smart Report, and AI Report — configure formatting and delivery options for each." },
      { id: 'e-fail',       label: 'Email is not sending / error',       hint: "Check: (1) Email enabled in Settings → Email → Connection, (2) SMTP credentials are correct, (3) Gmail users must use an App Password. Run 'Send Test' to see the exact error." },
      { id: 'back',         label: '← Back',                            back: true },
    ],
  },

  'email-automation': {
    smilo: "Email automation sends emails to patients automatically — no clicking needed. Here's how to set it up:\n\n1️⃣ Connect Gmail (Settings → Email → Connection)\n2️⃣ Turn on **Enable Email Delivery**\n3️⃣ Go to **Automation** tab → turn on **Automation Master Switch**\n4️⃣ Enable the events you want: **Appointment Booked** and/or **Appointment Completed**\n5️⃣ Click **Choose from templates** under each event to pre-fill the subject and body, then edit to your liking\n6️⃣ Click **Save Automation Settings**",
    avatarState: 'idle',
    options: [
      { id: 'ea-vars',      label: 'What variables can I use in the email?', hint: "In Appointment Booked: {{first_name}}, {{name}}, {{doctor}}, {{date}}, {{time}}, {{clinic}}. In Appointment Completed: {{first_name}}, {{name}}, {{doctor}}, {{date}}, {{treatments}}, {{clinic}}. Type them exactly as shown." },
      { id: 'ea-conflict',  label: "Automation is on but I can't send manually", hint: "When Appointment Completed automation is active, the 'Send via Email' button on the Treatment page is intentionally disabled to avoid duplicate emails. Turn the automation off in Settings → Email → Automation to re-enable manual sending." },
      { id: 'ea-whatsapp',  label: 'Can I send documents via WhatsApp instead?', hint: "Yes — use 'Send via WhatsApp' on the Treatment page. It is independent of the email automation. Select Smart Report, Invoice, and/or AI Report, enter the patient's number with country code (e.g. 919876543210), and tap Send." },
      { id: 'back',         label: '← Back',                                    back: true },
    ],
  },

  'ctx-settings': {
    smilo: "I see you're in Settings — what are you configuring?",
    avatarState: 'idle',
    options: [
      { id: 'cs-email',     label: 'Email & automation',        next: 'email' },
      { id: 'cs-share',     label: 'Share with Patient (documents)', hint: "Settings → Share with Patient. Configure Invoice, Prescription, Smart Report, and AI Report delivery options." },
      { id: 'cs-whatsapp',  label: 'WhatsApp connection',       slug: '07-whatsapp-automation', hint: 'Settings → WhatsApp. Enter your WaSender credentials and connect the clinic number.' },
      { id: 'other',        label: 'Something else',            next: 'root' },
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
