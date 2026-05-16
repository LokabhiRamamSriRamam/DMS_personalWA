import nodemailer from 'nodemailer';
import PDFDocument from 'pdfkit';
import { encrypt, decrypt } from '../utils/crypto.util.js';

// Reuse WhatsApp's placeholder replacement logic
export function replacePlaceholders(str, data) {
  if (typeof str !== 'string') return str;
  return str.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] ?? `{{${key}}}`);
}

// Cache transporter per tenant to avoid re-creating connections
const transporterCache = new Map();

export function getTransporter(settings) {
  if (!settings || !settings.smtp || !settings.smtp.user) {
    throw new Error('Email settings not configured');
  }

  const cacheKey = `${settings._id || 'default'}`;
  if (transporterCache.has(cacheKey)) {
    return transporterCache.get(cacheKey);
  }

  let password = settings.smtp.password;
  if (password && password.includes(':')) {
    // Encrypted — decrypt it
    try {
      password = decrypt(password);
    } catch (err) {
      throw new Error('Failed to decrypt SMTP password: ' + err.message);
    }
  }

  const config = {
    host: settings.smtp.host,
    port: settings.smtp.port,
    secure: settings.smtp.secure,
    auth: {
      user: settings.smtp.user,
      pass: password,
    },
  };

  const transporter = nodemailer.createTransport(config);
  transporterCache.set(cacheKey, transporter);
  return transporter;
}

export function invalidateTransporterCache(settingsId) {
  transporterCache.delete(settingsId);
}

// Build email message from template with variable substitution.
// Falls back to defaultSubject/defaultBody if no template is configured — never throws on missing template.
export async function buildEmailMessage({ tenantModels, eventType, data, language = 'en', defaultSubject, defaultBody }) {
  const { EmailTemplate } = tenantModels;

  // Look up active template for event + language, fall back to 'en'
  let template = await EmailTemplate.findOne({ event: eventType, language, isActive: true });
  if (!template && language !== 'en') {
    template = await EmailTemplate.findOne({ event: eventType, language: 'en', isActive: true });
  }

  const rawSubject = template ? template.subject : (defaultSubject || `Message from your clinic`);
  const rawBody    = template ? template.body    : (defaultBody    || `Dear {{first_name}},\n\nPlease find your documents attached.\n\nWarm regards,\n{{doctor}}`);

  const subject = replacePlaceholders(rawSubject, data);
  const body    = replacePlaceholders(rawBody,    data);

  return { subject, body };
}

// Generate PDF from report text
export function generateReportPdf(reportText, { patientName, doctorName, date, templateName }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const buffers = [];

    doc.on('data', (chunk) => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    // Header
    doc.fontSize(16).font('Helvetica-Bold').text('Clinical Report', { align: 'center' });
    doc.fontSize(12).font('Helvetica').text(templateName || '', { align: 'center' });
    doc.moveDown();

    // Metadata
    doc.fontSize(10).font('Helvetica').text(`Patient: ${patientName}`);
    doc.text(`Doctor: ${doctorName}`);
    doc.text(`Date: ${date}`);
    doc.moveDown();

    // Separator
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();

    // Report body
    doc.fontSize(11).font('Helvetica').text(reportText, { align: 'left', width: 450 });

    doc.end();
  });
}

// Send email via SMTP
export async function sendEmail({
  tenantModels,
  settings,
  to,
  subject,
  text,
  html,
  attachments,
  patientId,
  event,
}) {
  const { EmailLog } = tenantModels;

  if (!settings || !settings.enabled) {
    throw new Error('Email delivery is not enabled');
  }

  try {
    const transporter = getTransporter(settings);

    const mailOptions = {
      from: settings.fromEmail || settings.smtp.user,
      to,
      subject,
      text: text || undefined,
      html: html || undefined,
      attachments: attachments || [],
    };

    if (settings.replyTo) {
      mailOptions.replyTo = settings.replyTo;
    }

    const info = await transporter.sendMail(mailOptions);

    // Log success
    const log = new EmailLog({
      patientId,
      event: event || 'manual',
      to,
      subject,
      attachments: (attachments || []).map((a) => ({
        filename: a.filename || a.path,
        size: a.size,
      })),
      status: 'sent',
      messageId: info.messageId,
      sentAt: new Date(),
    });

    await log.save();

    return {
      status: 'sent',
      messageId: info.messageId,
    };
  } catch (err) {
    // Log failure
    const log = new EmailLog({
      patientId,
      event: event || 'manual',
      to,
      subject,
      status: 'failed',
      errorMessage: err.message,
      sentAt: new Date(),
    });

    await log.save();

    throw err;
  }
}
