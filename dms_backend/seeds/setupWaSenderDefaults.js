/**
 * Seed default WaSender flow templates for a tenant.
 * Call once per tenant setup: node seeds/setupWaSenderDefaults.js <mongoUri> <dbName>
 */
import mongoose from 'mongoose';
import { getTenantConnection } from '../config/tenantDb.js';
import { getTenantModels } from '../config/tenantModels.js';

function makeTextNode(id, label, text, x, y, waitForResponse = false) {
  return {
    id,
    type: 'messageNode',
    position: { x, y },
    data: {
      nodeType: 'message',
      label,
      messageType: 'text',
      content: { text },
      waitForResponse,
    },
  };
}

function makeEndNode(id, x, y) {
  return {
    id,
    type: 'endNode',
    position: { x, y },
    data: { nodeType: 'end', label: 'End' },
  };
}

function makeDelayNode(id, label, delayValue, delayUnit, x, y) {
  return {
    id,
    type: 'delayNode',
    position: { x, y },
    data: { nodeType: 'delay', label, delayValue, delayUnit },
  };
}

function edge(id, source, target, label = '') {
  return { id, source, target, label };
}

const TEMPLATES = [
  {
    name: 'Welcome — First Message',
    description: 'Automatically sent when a customer messages for the first time',
    triggerType: 'first_message',
    nodes: [
      makeTextNode('n1', 'Welcome', "Hello! 👋 Welcome to our clinic. I'm here to help you. How can we assist you today?\n\nReply with:\n1 - Book Appointment\n2 - Query about Treatment\n3 - General Enquiry", 100, 100, true),
      makeTextNode('n2', 'Thank You', 'Thank you for reaching out! Our team will get back to you shortly.', 100, 300),
      makeEndNode('n3', 100, 480),
    ],
    edges: [
      edge('e1-2', 'n1', 'n2', '*'),
      edge('e2-3', 'n2', 'n3'),
    ],
    rootNodeId: 'n1',
  },
  {
    name: 'Appointment Booked Confirmation',
    description: 'Sent immediately when an appointment is created',
    triggerType: 'appointment_booked',
    nodes: [
      makeTextNode('n1', 'Confirmation', "✅ Hi {{firstName}}, your appointment has been confirmed!\n\n📅 Date: {{date}}\n🕐 Time: {{time}}\n👨‍⚕️ Doctor: {{doctorName}}\n\nPlease arrive 10 minutes early. See you soon!", 100, 100),
      makeEndNode('n2', 100, 300),
    ],
    edges: [edge('e1-2', 'n1', 'n2')],
    rootNodeId: 'n1',
  },
  {
    name: 'Appointment Reminder',
    description: 'Sent X hours before appointment (configure offset in flow settings)',
    triggerType: 'appointment_reminder',
    reminderOffsetHours: 24,
    nodes: [
      makeTextNode('n1', 'Reminder', "⏰ Reminder: Hi {{firstName}}, your appointment is tomorrow!\n\n📅 {{date}} at {{time}}\n👨‍⚕️ Dr. {{doctorName}}\n\nPlease reply YES to confirm or NO to reschedule.", 100, 100, true),
      makeTextNode('n2', 'Confirmed', '✅ Great! We look forward to seeing you. Please arrive 10 minutes early.', 100, 300),
      makeTextNode('n3', 'Reschedule', "No problem! Please call us or visit the clinic to reschedule your appointment.", 350, 300),
      makeEndNode('n4', 100, 480),
      makeEndNode('n5', 350, 480),
    ],
    edges: [
      edge('e1-2', 'n1', 'n2', 'yes'),
      edge('e1-3', 'n1', 'n3', 'no'),
      edge('e2-4', 'n2', 'n4'),
      edge('e3-5', 'n3', 'n5'),
    ],
    rootNodeId: 'n1',
  },
  {
    name: 'Appointment Completed — Thank You',
    description: 'Sent when appointment status changes to Completed',
    triggerType: 'appointment_completed',
    nodes: [
      makeTextNode('n1', 'Thank You', "Thank you for visiting us, {{firstName}}! 🙏\n\nWe hope your appointment went well. If you have any questions or concerns, please don't hesitate to reach out.\n\nStay healthy! 😊", 100, 100),
      makeEndNode('n2', 100, 300),
    ],
    edges: [edge('e1-2', 'n1', 'n2')],
    rootNodeId: 'n1',
  },
  {
    name: 'Appointment Rescheduled',
    description: 'Sent when an appointment is rescheduled to a new time',
    triggerType: 'appointment_rescheduled',
    nodes: [
      makeTextNode('n1', 'Rescheduled', "📅 Hi {{firstName}}, your appointment has been rescheduled.\n\nNew Date: {{date}}\nNew Time: {{time}}\n👨‍⚕️ Doctor: {{doctorName}}\n\nPlease let us know if this works for you.", 100, 100),
      makeEndNode('n2', 100, 300),
    ],
    edges: [edge('e1-2', 'n1', 'n2')],
    rootNodeId: 'n1',
  },
  {
    name: 'Post-Treatment Care — General',
    description: 'Multi-day follow-up after any treatment (use treatmentName for specific treatments)',
    triggerType: 'post_treatment_care',
    treatmentName: '',
    nodes: [
      makeTextNode('n1', 'Day 0', "Hi {{firstName}}, hope you are resting well after your {{treatment}} procedure today! 🦷\n\nPlease follow your post-care instructions and avoid hard foods for 24 hours.", 100, 100),
      makeDelayNode('n2', 'Wait 2 Days', 2, 'days', 100, 280),
      makeTextNode('n3', 'Day 2 Follow-up', "Hi {{firstName}}, checking in on how you're feeling after your {{treatment}} 😊\n\nAny discomfort or swelling? Reply YES if you need assistance.", 100, 460, true),
      makeTextNode('n4', 'Needs Help', "Please don't worry! We'll have our team call you shortly. 📞", 100, 640),
      makeTextNode('n5', 'Doing Well', "Wonderful! Continue following your post-care instructions. See you at your next visit! 😊", 350, 640),
      makeEndNode('n6', 100, 820),
      makeEndNode('n7', 350, 820),
    ],
    edges: [
      edge('e1-2', 'n1', 'n2'),
      edge('e2-3', 'n2', 'n3'),
      edge('e3-4', 'n3', 'n4', 'yes'),
      edge('e3-5', 'n3', 'n5', '*'),
      edge('e4-6', 'n4', 'n6'),
      edge('e5-7', 'n5', 'n7'),
    ],
    rootNodeId: 'n1',
  },
  {
    name: 'Post-Treatment Care — Root Canal',
    description: 'Specific follow-up flow for Root Canal treatments',
    triggerType: 'post_treatment_care',
    treatmentName: 'Root Canal',
    nodes: [
      makeTextNode('n1', 'Day 0', "Hi {{firstName}}, hope you're feeling comfortable after your Root Canal today! 🦷\n\nSome sensitivity is normal. Avoid chewing on that side and take prescribed medications as directed.", 100, 100),
      makeDelayNode('n2', 'Wait 1 Day', 1, 'days', 100, 280),
      makeTextNode('n3', 'Day 1 Check', "Hi {{firstName}}, how are you feeling today after your Root Canal?\n\nReply:\n1 - Feeling fine\n2 - Some pain\n3 - Significant discomfort", 100, 460, true),
      makeTextNode('n4', 'All Good', "Great to hear! 😊 Continue medications and avoid hard foods for a few more days.", 0, 640),
      makeTextNode('n5', 'Some Pain', "Some sensitivity is normal. Continue your prescribed pain relievers. Contact us if pain worsens. 📞", 200, 640),
      makeTextNode('n6', 'Urgent', "Please contact us immediately at the clinic. We'll schedule an emergency review. 🚨", 400, 640),
      makeDelayNode('n7', 'Wait 4 More Days', 4, 'days', 0, 820),
      makeTextNode('n8', 'Day 5 Final', "Hi {{firstName}}, hope you've fully recovered! 😊\n\nDon't forget to schedule your crown placement if recommended by your doctor.", 0, 1000),
      makeEndNode('n9', 0, 1180),
      makeEndNode('n10', 200, 820),
      makeEndNode('n11', 400, 820),
    ],
    edges: [
      edge('e1-2', 'n1', 'n2'),
      edge('e2-3', 'n2', 'n3'),
      edge('e3-4', 'n3', 'n4', '1'),
      edge('e3-5', 'n3', 'n5', '2'),
      edge('e3-6', 'n3', 'n6', '3'),
      edge('e4-7', 'n4', 'n7'),
      edge('e7-8', 'n7', 'n8'),
      edge('e8-9', 'n8', 'n9'),
      edge('e5-10', 'n5', 'n10'),
      edge('e6-11', 'n6', 'n11'),
    ],
    rootNodeId: 'n1',
  },
  {
    name: 'Invoice Created',
    description: 'Sent when an invoice is generated for a patient',
    triggerType: 'invoice_created',
    nodes: [
      makeTextNode('n1', 'Invoice Notification', "Hi {{firstName}}, your invoice has been generated. 🧾\n\nInvoice: {{invoiceId}}\nAmount: ₹{{amount}}\n\nThank you for choosing our clinic! 😊", 100, 100),
      makeEndNode('n2', 100, 300),
    ],
    edges: [edge('e1-2', 'n1', 'n2')],
    rootNodeId: 'n1',
  },
];

export async function setupWaSenderDefaults(tenantModels) {
  const { ChatbotFlow } = tenantModels;
  let seeded = 0;
  for (const tmpl of TEMPLATES) {
    const exists = await ChatbotFlow.findOne({ triggerType: tmpl.triggerType, treatmentName: tmpl.treatmentName ?? null, isTemplate: true });
    if (exists) continue;
    await ChatbotFlow.create({ ...tmpl, isActive: false, isTemplate: true });
    seeded++;
  }
  console.log(`[setupWaSenderDefaults] Seeded ${seeded} template flows`);
}

// CLI usage: node seeds/setupWaSenderDefaults.js <mongoUri> <dbName>
if (process.argv[2]) {
  const mongoUri = process.argv[2];
  const dbName   = process.argv[3] || 'dms';
  getTenantConnection(mongoUri, dbName).then(conn => {
    const models = getTenantModels(conn);
    return setupWaSenderDefaults(models);
  }).then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
}
