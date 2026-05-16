import PDFDocumentLib from 'pdfkit';
import {
  getTransporter,
  invalidateTransporterCache,
  buildEmailMessage,
  generateReportPdf,
  sendEmail,
  replacePlaceholders,
} from '../services/email.service.js';
import { encrypt, decrypt } from '../utils/crypto.util.js';

// ─── Template variable catalog ─────────────────────────────────────────────
// Single source of truth: the keys advertised here MUST match the keys each
// trigger puts into its templateData object (see buildTemplateData below).
export const TEMPLATE_VARIABLES = {
  appointmentBooked:    ['first_name', 'name', 'doctor', 'date', 'time', 'clinic'],
  appointmentCompleted: ['first_name', 'name', 'doctor', 'date', 'treatments', 'clinic'],
  invoiceGenerated:     ['first_name', 'name', 'invoice_id', 'amount', 'date', 'clinic'],
  aiReportReady:        ['first_name', 'name', 'doctor', 'date', 'clinic'],
};

const VARIABLE_LABELS = {
  first_name: 'Patient first name',
  name:       'Patient full name',
  doctor:     "Doctor's name",
  date:       "Today's date",
  time:       'Appointment time',
  treatments: 'Comma-separated treatment names',
  invoice_id: 'Invoice number',
  amount:     'Invoice total amount',
  clinic:     'Clinic / sender name',
};

const VARIABLE_SAMPLE = {
  first_name: 'Rahul',
  name:       'Rahul Sharma',
  doctor:     'Dr. Avtansh Giri',
  date:       '15 May 2026',
  time:       '4:30 PM',
  treatments: 'Root Canal, Scaling',
  invoice_id: 'INV-2026-001',
  amount:     '₹5,000',
  clinic:     'City Dental Clinic',
};

export async function getTemplateVariables(req, res) {
  res.json({ events: TEMPLATE_VARIABLES, labels: VARIABLE_LABELS, sample: VARIABLE_SAMPLE });
}

// ─── PDF helpers ───────────────────────────────────────────────────────────

function stripHtml(html) {
  return (html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

function generateVisitSummaryPdf(visit, patientName, doctorName, date) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocumentLib({ margin: 50 });
    const buffers = [];
    doc.on('data', c => buffers.push(c));
    doc.on('end',  () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    doc.fontSize(16).font('Helvetica-Bold').text('Visit Summary', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica')
      .text(`Patient: ${patientName}`)
      .text(`Doctor: ${doctorName}`)
      .text(`Date: ${date}`);
    doc.moveDown();
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();

    if (visit.treatments?.length) {
      doc.fontSize(12).font('Helvetica-Bold').text('Treatment Plan');
      doc.moveDown(0.3);
      visit.treatments.forEach(t => {
        const teeth = t.teeth_numbers?.length ? ` (Teeth: ${t.teeth_numbers.join(', ')})` : '';
        doc.fontSize(10).font('Helvetica').text(`• ${t.treatment_name}${teeth} — ${t.status} — ₹${t.cost || 0}`);
      });
      doc.moveDown();
    }

    if (visit.prescriptions?.length) {
      doc.fontSize(12).font('Helvetica-Bold').text('Prescriptions');
      doc.moveDown(0.3);
      visit.prescriptions.forEach(p => {
        const parts = [p.drug_name, p.dosage, p.duration ? `for ${p.duration}` : '', p.instructions].filter(Boolean).join(' — ');
        doc.fontSize(10).font('Helvetica').text(`• ${parts}`);
      });
      doc.moveDown();
    }

    if (visit.consultation_notes?.length) {
      doc.fontSize(12).font('Helvetica-Bold').text('Consultation Notes');
      doc.moveDown(0.3);
      visit.consultation_notes.forEach(n => {
        doc.fontSize(10).font('Helvetica').text(stripHtml(n.content));
        doc.moveDown(0.3);
      });
      doc.moveDown();
    }

    if (visit.advices?.length) {
      doc.fontSize(12).font('Helvetica-Bold').text('Advice');
      doc.moveDown(0.3);
      visit.advices.forEach(a => {
        doc.fontSize(10).font('Helvetica').text(stripHtml(a.content));
        doc.moveDown(0.3);
      });
    }

    doc.end();
  });
}

// Loads tenant invoice presentation settings, falling back to schema defaults
// so the PDF renders sensibly even before the clinic configures anything.
async function loadInvoiceSettings(tenantModels) {
  const { InvoiceSettings } = tenantModels;
  const s = InvoiceSettings ? await InvoiceSettings.findOne({}).lean() : null;
  return {
    clinic: {
      name: s?.clinic?.name || '',
      addressLines: s?.clinic?.addressLines || [],
      phone: s?.clinic?.phone || '',
      email: s?.clinic?.email || '',
      gstNumber: s?.clinic?.gstNumber || '',
    },
    currencySymbol: s?.currencySymbol || '₹',
    tax: {
      label: s?.tax?.label || 'Tax',
      show:  s?.tax?.show !== false,
    },
    showPaidPending: s?.showPaidPending !== false,
    footerText: s?.footerText || '',
    termsText:  s?.termsText || '',
  };
}

function generateInvoicePdf(invoice, patientName, settings) {
  const cfg = settings || {
    clinic: { name: '', addressLines: [], phone: '', email: '', gstNumber: '' },
    currencySymbol: '₹', tax: { label: 'Tax', show: true },
    showPaidPending: true, footerText: '', termsText: '',
  };
  const cur = cfg.currencySymbol || '₹';

  return new Promise((resolve, reject) => {
    const doc = new PDFDocumentLib({ margin: 50 });
    const buffers = [];
    doc.on('data', c => buffers.push(c));
    doc.on('end',  () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    // Clinic header block (only if configured)
    if (cfg.clinic?.name) {
      doc.fontSize(15).font('Helvetica-Bold').text(cfg.clinic.name, { align: 'center' });
      doc.fontSize(9).font('Helvetica');
      (cfg.clinic.addressLines || []).forEach(line => doc.text(line, { align: 'center' }));
      const contactBits = [
        cfg.clinic.phone && `Phone: ${cfg.clinic.phone}`,
        cfg.clinic.email && `Email: ${cfg.clinic.email}`,
      ].filter(Boolean).join('  |  ');
      if (contactBits) doc.text(contactBits, { align: 'center' });
      if (cfg.clinic.gstNumber) doc.text(`GSTIN: ${cfg.clinic.gstNumber}`, { align: 'center' });
      doc.moveDown(0.5);
    }

    doc.fontSize(18).font('Helvetica-Bold').text('INVOICE', { align: 'center' });
    doc.moveDown(0.5);
    const invDate = new Date(invoice.date || invoice.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    doc.fontSize(10).font('Helvetica')
      .text(`Invoice #: ${invoice.invoice_id}`)
      .text(`Patient: ${patientName}`)
      .text(`Date: ${invDate}`);
    doc.moveDown();
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);

    // Column headers
    const col = { item: 50, qty: 310, rate: 370, total: 450 };
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Item',  col.item,  doc.y, { width: 255 });
    doc.text('Qty',   col.qty,   doc.y - doc.currentLineHeight(), { width: 55,  align: 'right' });
    doc.text('Rate',  col.rate,  doc.y - doc.currentLineHeight(), { width: 75,  align: 'right' });
    doc.text('Total', col.total, doc.y - doc.currentLineHeight(), { width: 95,  align: 'right' });
    doc.moveDown(0.3);
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.3);

    doc.font('Helvetica').fontSize(10);
    (invoice.items || []).forEach(item => {
      const y = doc.y;
      doc.text(item.name,            col.item,  y, { width: 255 });
      doc.text(String(item.quantity), col.qty,  y, { width: 55,  align: 'right' });
      doc.text(`${cur}${item.rate}`,  col.rate, y, { width: 75,  align: 'right' });
      doc.text(`${cur}${item.total}`, col.total,y, { width: 95,  align: 'right' });
      doc.moveDown();
    });

    doc.moveDown(0.3);
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.3);

    // Totals
    doc.font('Helvetica').fontSize(10).text(`Subtotal:`, 350, doc.y, { width: 95, align: 'right' });
    doc.text(`${cur}${invoice.subtotal ?? invoice.total_amount}`, col.total, doc.y - doc.currentLineHeight(), { width: 95, align: 'right' });
    doc.moveDown();
    if (cfg.tax?.show !== false && invoice.tax) {
      doc.text(`${cfg.tax?.label || 'Tax'}:`, 350, doc.y, { width: 95, align: 'right' });
      doc.text(`${cur}${invoice.tax}`, col.total, doc.y - doc.currentLineHeight(), { width: 95, align: 'right' });
      doc.moveDown();
    }
    doc.font('Helvetica-Bold').fontSize(11);
    doc.text('Total:', 350, doc.y, { width: 95, align: 'right' });
    doc.text(`${cur}${invoice.total_amount}`, col.total, doc.y - doc.currentLineHeight(), { width: 95, align: 'right' });
    doc.moveDown(0.3);
    if (cfg.showPaidPending !== false) {
      doc.font('Helvetica').fontSize(10)
        .fillColor('green').text(`Paid: ${cur}${invoice.paid_amount || 0}`, 350, doc.y, { width: 195, align: 'right' });
      doc.moveDown();
      if ((invoice.pending_amount || 0) > 0) {
        doc.fillColor('red').text(`Pending: ${cur}${invoice.pending_amount}`, 350, doc.y, { width: 195, align: 'right' });
      }
      doc.fillColor('black');
    }

    // Footer / terms
    if (cfg.termsText || cfg.footerText) {
      doc.moveDown(1.5);
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(0.5);
      if (cfg.termsText) {
        doc.fontSize(8).font('Helvetica-Bold').text('Terms & Conditions', 50, doc.y);
        doc.font('Helvetica').text(cfg.termsText, { width: 500 });
        doc.moveDown(0.5);
      }
      if (cfg.footerText) {
        doc.fontSize(8).font('Helvetica').fillColor('gray').text(cfg.footerText, 50, doc.y, { width: 500, align: 'center' });
        doc.fillColor('black');
      }
    }

    doc.end();
  });
}

// ─── Settings ──────────────────────────────────────────────────────────────

export async function getSettings(req, res) {
  const { EmailSettings } = req.tenantModels;

  try {
    let settings = await EmailSettings.findOne({});

    if (!settings) {
      // Return defaults if no settings exist
      settings = {
        enabled: false,
        automationEnabled: false,
        mode: 'gmail',
        smtp: { host: 'smtp.gmail.com', port: 465, secure: true },
        events: {
          appointmentBooked:    { enabled: false, delayMinutes: 0 },
          appointmentCompleted: {
            enabled: false,
            delayMinutes: 0,
            include: { smartReport: true, invoice: true, aiReport: false, prescription: true },
          },
          invoiceGenerated:     { enabled: false, delayMinutes: 0, attachInvoice: true },
          aiReportReady:        { enabled: false, delayMinutes: 0, attachReport: true },
        },
      };
    }

    // Never expose password
    const safe = settings.toObject ? settings.toObject() : settings;
    delete safe.smtp.password;

    res.json(safe);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function updateSettings(req, res) {
  const { EmailSettings } = req.tenantModels;

  try {
    const {
      enabled,
      automationEnabled,
      mode,
      smtp,
      fromName,
      fromEmail,
      replyTo,
      events,
    } = req.body;

    // Validate SMTP config
    if (smtp && smtp.user && !smtp.host) {
      return res.status(400).json({
        error: 'SMTP host is required when user is provided',
      });
    }

    let settings = await EmailSettings.findOne({});

    if (!settings) {
      settings = new EmailSettings();
    }

    settings.enabled = enabled !== undefined ? enabled : settings.enabled;
    settings.automationEnabled = automationEnabled !== undefined ? automationEnabled : settings.automationEnabled;
    settings.mode = mode || settings.mode;
    settings.fromName = fromName || settings.fromName;
    settings.fromEmail = fromEmail || settings.fromEmail;
    settings.replyTo = replyTo || settings.replyTo;

    if (smtp) {
      settings.smtp.host = smtp.host || settings.smtp.host;
      settings.smtp.port = smtp.port || settings.smtp.port;
      settings.smtp.secure = smtp.secure !== undefined ? smtp.secure : settings.smtp.secure;
      settings.smtp.user = smtp.user || settings.smtp.user;

      // Handle password: if provided and not empty, encrypt it
      if (smtp.password && smtp.password.trim()) {
        settings.smtp.password = encrypt(smtp.password.trim());
      }
      // If empty string, keep existing password
    }

    if (events) {
      settings.events = { ...settings.events, ...events };
    }

    await settings.save();

    // Invalidate transporter cache
    if (settings._id) {
      invalidateTransporterCache(settings._id.toString());
    }

    // Return safe copy
    const safe = settings.toObject();
    delete safe.smtp.password;

    res.json({ message: 'Settings updated', settings: safe });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function testSend(req, res) {
  const { EmailSettings } = req.tenantModels;
  const { to } = req.body;

  if (!to) {
    return res.status(400).json({ error: 'Recipient email (to) is required' });
  }

  try {
    let settings = await EmailSettings.findOne({});

    if (!settings || !settings.enabled || !settings.smtp.user) {
      return res.status(400).json({
        error: 'Email settings not configured or disabled',
      });
    }

    const transporter = getTransporter(settings);

    await transporter.sendMail({
      from: settings.fromEmail || settings.smtp.user,
      to,
      subject: 'Test Email from Dental DMS',
      text: 'This is a test email to verify your SMTP configuration is working correctly.',
    });

    res.json({ message: 'Test email sent successfully', to });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ─── Templates ────────────────────────────────────────────────────────────

export async function getTemplates(req, res) {
  const { EmailTemplate } = req.tenantModels;
  const { event, language } = req.query;

  try {
    const filter = {};
    if (event) filter.event = event;
    if (language) filter.language = language;

    const templates = await EmailTemplate.find(filter).sort({ createdAt: -1 });

    res.json(templates);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function createTemplate(req, res) {
  const { EmailTemplate } = req.tenantModels;
  const { event, language, subject, body, isActive } = req.body;

  if (!event || !language || !subject || !body) {
    return res.status(400).json({
      error: 'event, language, subject, and body are required',
    });
  }

  try {
    // If creating as active, deactivate other active templates for same event/language
    if (isActive !== false) {
      await EmailTemplate.updateMany(
        { event, language, isActive: true },
        { isActive: false }
      );
    }

    const template = new EmailTemplate({
      event,
      language,
      subject,
      body,
      isActive: isActive !== false,
    });

    await template.save();

    res.status(201).json(template);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function updateTemplate(req, res) {
  const { EmailTemplate } = req.tenantModels;
  const { id } = req.params;
  const { subject, body, isActive } = req.body;

  try {
    const template = await EmailTemplate.findById(id);

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    template.subject = subject || template.subject;
    template.body = body || template.body;

    // If activating, deactivate others for same event/language
    if (isActive && !template.isActive) {
      await EmailTemplate.updateMany(
        {
          event: template.event,
          language: template.language,
          isActive: true,
          _id: { $ne: id },
        },
        { isActive: false }
      );
    }

    if (isActive !== undefined) {
      template.isActive = isActive;
    }

    await template.save();

    res.json(template);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function deleteTemplate(req, res) {
  const { EmailTemplate } = req.tenantModels;
  const { id } = req.params;

  try {
    const template = await EmailTemplate.findByIdAndDelete(id);

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json({ message: 'Template deleted', id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ─── Send Report Email ─────────────────────────────────────────────────────

export async function sendReportEmail(req, res) {
  const { EmailSettings, Patient } = req.tenantModels;
  const { patient_id, to, subject, body, report_text, template_name } = req.body;

  if (!patient_id || !to || !report_text) {
    return res.status(400).json({
      error: 'patient_id, to, and report_text are required',
    });
  }

  try {
    let settings = await EmailSettings.findOne({});

    if (!settings || !settings.enabled) {
      return res.status(400).json({ error: 'Email delivery is not enabled' });
    }

    const patient = await Patient.findById(patient_id);
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const doctorName = req.user?.name || 'Attending Doctor';
    const today = new Date().toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    // Generate PDF
    const patientName = `${patient.first_name} ${patient.last_name || ''}`.trim();
    const pdfBuffer = await generateReportPdf(report_text, {
      patientName,
      doctorName,
      date: today,
      templateName: template_name || 'Clinical Report',
    });

    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `${template_name || 'Report'}_${patientName}_${dateStr}.pdf`;

    // Send email
    const result = await sendEmail({
      tenantModels: req.tenantModels,
      settings,
      to,
      subject: subject || `Your Visit Summary - ${today}`,
      text: body || report_text,
      attachments: [
        {
          filename,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
      patientId: patient_id,
      event: 'manual',
    });

    res.json({
      status: 'sent',
      to,
      messageId: result.messageId,
      filename,
    });
  } catch (err) {
    console.error('[Email] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
}

// ─── Patient email status (what's available to send) ──────────────────────

export async function getPatientEmailStatus(req, res) {
  const { EmailSettings, Invoice, ReportJob, Patient } = req.tenantModels;
  const { patientId } = req.params;

  try {
    const [settings, latestInvoice, latestAiReport, patient] = await Promise.all([
      EmailSettings.findOne({}).lean(),
      Invoice.findOne({ patient_id: patientId }).sort({ createdAt: -1 }).select('invoice_id total_amount status pending_amount createdAt').lean(),
      ReportJob
        ? ReportJob.findOne({ patientId, status: 'done' }).sort({ createdAt: -1 }).select('templateId createdAt').lean()
        : Promise.resolve(null),
      Patient.findById(patientId).select('first_name last_name contact.email').lean(),
    ]);

    const patientName = patient
      ? `${patient.first_name} ${patient.last_name || ''}`.trim()
      : '';

    res.json({
      emailEnabled: settings?.enabled || false,
      hasSmtp:      !!(settings?.smtp?.user),
      patientName,
      patientEmail: patient?.contact?.email || '',
      hasPatientEmail: !!(patient?.contact?.email),
      latestInvoice:  latestInvoice  || null,
      latestAiReport: latestAiReport || null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ─── Send Treatment Summary (smart report + invoice + AI report) ───────────

export async function sendTreatmentSummary(req, res) {
  const { EmailSettings, Patient, Visit, Invoice, ReportJob } = req.tenantModels;
  const {
    patient_id, to, include = [],
    subject: customSubject, body: customBody,
    template_event = 'appointmentCompleted',
  } = req.body;

  if (!patient_id || !to) {
    return res.status(400).json({ error: 'patient_id and to are required' });
  }
  if (!Array.isArray(include) || include.length === 0) {
    return res.status(400).json({ error: 'include must be a non-empty array of: smart_report, invoice, ai_report' });
  }

  try {
    const settings = await EmailSettings.findOne({}).lean();
    if (!settings?.enabled) {
      return res.status(400).json({ error: 'Email delivery is not enabled. Configure SMTP in Settings → Email.' });
    }
    if (!settings?.smtp?.user) {
      return res.status(400).json({ error: 'SMTP credentials not configured. Go to Settings → Email → Connection.' });
    }

    const patient = await Patient.findById(patient_id).lean();
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    const patientName = `${patient.first_name} ${patient.last_name || ''}`.trim();
    const doctorName  = req.user?.name || 'Attending Doctor';
    const today   = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    const dateStr = new Date().toISOString().slice(0, 10);

    const attachments = [];
    let treatmentNames = [];

    if (include.includes('smart_report')) {
      const visit = await Visit.findOne({ patient_id }).sort({ date: -1 }).lean();
      if (visit) {
        treatmentNames = (visit.treatments || []).map(t => t.treatment_name).filter(Boolean);
        const pdf = await generateVisitSummaryPdf(visit, patientName, doctorName, today);
        attachments.push({ filename: `VisitSummary_${patientName}_${dateStr}.pdf`, content: pdf, contentType: 'application/pdf' });
      }
    }

    if (include.includes('invoice')) {
      const invoice = await Invoice.findOne({ patient_id }).sort({ createdAt: -1 }).lean();
      if (invoice) {
        const invCfg = await loadInvoiceSettings(req.tenantModels);
        const pdf = await generateInvoicePdf(invoice, patientName, invCfg);
        attachments.push({ filename: `Invoice_${invoice.invoice_id}_${patientName}_${dateStr}.pdf`, content: pdf, contentType: 'application/pdf' });
      }
    }

    if (include.includes('ai_report')) {
      const job = ReportJob
        ? await ReportJob.findOne({ patientId: patient_id, status: 'done' }).sort({ createdAt: -1 }).lean()
        : null;
      if (job?.reportText) {
        const pdf = await generateReportPdf(job.reportText, { patientName, doctorName, date: today, templateName: job.templateId || 'Clinical Report' });
        attachments.push({ filename: `AIReport_${patientName}_${dateStr}.pdf`, content: pdf, contentType: 'application/pdf' });
      }
    }

    if (!attachments.length) {
      return res.status(400).json({ error: 'No content found for the selected items. Generate a visit, invoice, or AI report first.' });
    }

    // Variable data available to the chosen/edited template
    const templateData = {
      name:        patientName,
      first_name:  patient.first_name,
      doctor:      doctorName,
      date:        today,
      treatments:  treatmentNames.join(', ') || 'your recent treatment',
      clinic:      settings.fromName || 'your clinic',
    };

    // If the dialog supplied an edited subject/body (template picker + editable
    // preview), substitute variables into those directly. Otherwise fall back
    // to the active DB template for the chosen event.
    let subject, body;
    if ((customSubject && customSubject.trim()) || (customBody && customBody.trim())) {
      subject = replacePlaceholders(customSubject || `Your visit summary — ${today}`, templateData);
      body    = replacePlaceholders(customBody    || `Dear {{first_name}},\n\nThank you for visiting us. Please find your documents attached.\n\nWarm regards,\n{{doctor}}\n{{clinic}}`, templateData);
    } else {
      ({ subject, body } = await buildEmailMessage({
        tenantModels: req.tenantModels,
        eventType: template_event,
        data: templateData,
        defaultSubject: `Your visit summary — ${today}`,
        defaultBody:    `Dear {{first_name}},\n\nThank you for visiting us. Please find your appointment documents attached.\n\nWarm regards,\n{{doctor}}\n{{clinic}}`,
      }));
    }

    const result = await sendEmail({
      tenantModels: req.tenantModels,
      settings,
      to,
      subject,
      text: body,
      attachments,
      patientId: patient_id,
      event: 'appointmentCompleted',
    });

    res.json({ status: 'sent', to, messageId: result.messageId, attachments: attachments.map(a => a.filename) });
  } catch (err) {
    console.error('[Email] sendTreatmentSummary:', err.message);
    res.status(500).json({ error: err.message });
  }
}

// ─── Automation trigger: Appointment Completed ────────────────────────────
// Called internally from appointment controller — never throws to caller.
export async function triggerAppointmentCompleted({ tenantModels, patientId, doctorName }) {
  try {
    const { EmailSettings, Patient, Visit, Invoice, ReportJob } = tenantModels;

    const settings = await EmailSettings.findOne({}).lean();
    if (!settings?.enabled || !settings?.automationEnabled) return;

    const eventCfg = settings?.events?.appointmentCompleted;
    if (!eventCfg?.enabled) return;

    const patient = await Patient.findById(patientId).lean();
    if (!patient?.contact?.email) return;

    const patientName = `${patient.first_name} ${patient.last_name || ''}`.trim();
    const today   = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    const dateStr = new Date().toISOString().slice(0, 10);
    const include = eventCfg.include || {};
    const attachments = [];

    if (include.smartReport || include.prescription) {
      const visit = await Visit.findOne({ patient_id: patientId }).sort({ date: -1 }).lean();
      if (visit) {
        const pdf = await generateVisitSummaryPdf(visit, patientName, doctorName || 'Attending Doctor', today);
        attachments.push({ filename: `VisitSummary_${patientName}_${dateStr}.pdf`, content: pdf, contentType: 'application/pdf' });
      }
    }

    if (include.invoice) {
      const invoice = await Invoice.findOne({ patient_id: patientId }).sort({ createdAt: -1 }).lean();
      if (invoice) {
        const invCfg = await loadInvoiceSettings(tenantModels);
        const pdf = await generateInvoicePdf(invoice, patientName, invCfg);
        attachments.push({ filename: `Invoice_${invoice.invoice_id}_${patientName}_${dateStr}.pdf`, content: pdf, contentType: 'application/pdf' });
      }
    }

    if (include.aiReport && ReportJob) {
      const job = await ReportJob.findOne({ patientId, status: 'done' }).sort({ createdAt: -1 }).lean();
      if (job?.reportText) {
        const pdf = await generateReportPdf(job.reportText, { patientName, doctorName: doctorName || 'Attending Doctor', date: today, templateName: job.templateId || 'Clinical Report' });
        attachments.push({ filename: `AIReport_${patientName}_${dateStr}.pdf`, content: pdf, contentType: 'application/pdf' });
      }
    }

    if (!attachments.length) return;

    // Build subject + body from template with variables
    const visit = await (tenantModels.Visit
      ? tenantModels.Visit.findOne({ patient_id: patientId }).sort({ date: -1 }).lean()
      : Promise.resolve(null));
    const treatmentNames = (visit?.treatments || []).map(t => t.treatment_name).filter(Boolean);

    const templateData = {
      name:        patientName,
      first_name:  patient.first_name,
      doctor:      doctorName || 'Attending Doctor',
      date:        today,
      treatments:  treatmentNames.join(', ') || 'your recent treatment',
      clinic:      settings.fromName || 'your clinic',
    };

    const { subject, body } = await buildEmailMessage({
      tenantModels,
      eventType: 'appointmentCompleted',
      data: templateData,
      defaultSubject: `Your appointment summary — ${today}`,
      defaultBody:    `Dear {{first_name}},\n\nThank you for visiting us. Please find your appointment documents attached.\n\nWarm regards,\n{{doctor}}\n{{clinic}}`,
    });

    const delayMs = (eventCfg.delayMinutes || 0) * 60 * 1000;
    if (delayMs > 0) {
      setTimeout(() => _sendCompletionEmail({ tenantModels, settings, patient, patientId, subject, body, attachments }), delayMs);
    } else {
      await _sendCompletionEmail({ tenantModels, settings, patient, patientId, subject, body, attachments });
    }
  } catch (err) {
    console.error('[Email] triggerAppointmentCompleted silenced:', err.message);
  }
}

async function _sendCompletionEmail({ tenantModels, settings, patient, patientId, subject, body, attachments }) {
  await sendEmail({
    tenantModels,
    settings,
    to: patient.contact.email,
    subject,
    text: body,
    attachments,
    patientId,
    event: 'appointmentCompleted',
  });
}

// ─── Shared automation helpers ─────────────────────────────────────────────

// Resolves common guards for an automation event. Returns null (caller bails
// silently) when delivery/automation/the event is off, or the patient has no
// email on file — automation never surfaces errors to the originating request.
async function loadAutomationContext(tenantModels, eventKey, patientId) {
  const { EmailSettings, Patient } = tenantModels;
  const settings = await EmailSettings.findOne({}).lean();
  if (!settings?.enabled || !settings?.automationEnabled) return null;
  const eventCfg = settings?.events?.[eventKey];
  if (!eventCfg?.enabled) return null;
  const patient = await Patient.findById(patientId).lean();
  if (!patient?.contact?.email) return null;
  return { settings, eventCfg, patient };
}

// Renders the active template (or supplied defaults) and sends, honouring the
// per-event delay. `clinic` is injected from the From Name unless overridden.
async function deliverAutomationEmail({
  tenantModels, settings, eventKey, patient, patientId,
  templateData, defaultSubject, defaultBody, attachments = [], delayMinutes = 0,
}) {
  const data = { clinic: settings.fromName || 'your clinic', ...templateData };

  const { subject, body } = await buildEmailMessage({
    tenantModels, eventType: eventKey, data, defaultSubject, defaultBody,
  });

  const send = () => sendEmail({
    tenantModels, settings,
    to: patient.contact.email,
    subject, text: body,
    attachments, patientId, event: eventKey,
  }).catch(err => console.error(`[Email] ${eventKey} delivery failed:`, err.message));

  const delayMs = (delayMinutes || 0) * 60 * 1000;
  if (delayMs > 0) setTimeout(send, delayMs);
  else await send();
}

// ─── Automation trigger: Appointment Booked ────────────────────────────────
// Called fire-and-forget from appointment.controller on create.
export async function triggerAppointmentBooked({ tenantModels, appointment }) {
  try {
    if (!appointment?.patient_id) return;
    const ctx = await loadAutomationContext(tenantModels, 'appointmentBooked', appointment.patient_id.toString());
    if (!ctx) return;
    const { settings, eventCfg, patient } = ctx;

    let doctorName = 'your doctor';
    if (appointment.doctor_id && tenantModels.Doctor) {
      const doc = await tenantModels.Doctor.findById(appointment.doctor_id).select('name').lean();
      if (doc?.name) doctorName = doc.name;
    }

    const start = appointment.start_time ? new Date(appointment.start_time) : new Date();
    const patientName = `${patient.first_name} ${patient.last_name || ''}`.trim();

    await deliverAutomationEmail({
      tenantModels, settings, eventKey: 'appointmentBooked',
      patient, patientId: appointment.patient_id,
      templateData: {
        first_name: patient.first_name,
        name:       patientName,
        doctor:     doctorName,
        date:       start.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
        time:       start.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }),
      },
      defaultSubject: `Appointment confirmed — {{date}}`,
      defaultBody:    `Dear {{first_name}},\n\nYour appointment with {{doctor}} is confirmed for {{date}} at {{time}}.\n\nWe look forward to seeing you.\n\nWarm regards,\n{{clinic}}`,
      delayMinutes: eventCfg.delayMinutes,
    });
  } catch (err) {
    console.error('[Email] triggerAppointmentBooked silenced:', err.message);
  }
}

// ─── Automation trigger: Invoice Generated ─────────────────────────────────
// Called fire-and-forget from invoice.controller on create.
export async function triggerInvoiceGenerated({ tenantModels, invoice }) {
  try {
    if (!invoice?.patient_id) return;
    const ctx = await loadAutomationContext(tenantModels, 'invoiceGenerated', invoice.patient_id.toString());
    if (!ctx) return;
    const { settings, eventCfg, patient } = ctx;

    const patientName = `${patient.first_name} ${patient.last_name || ''}`.trim();
    const invCfg = await loadInvoiceSettings(tenantModels);
    const cur = invCfg.currencySymbol || '₹';

    const attachments = [];
    if (eventCfg.attachInvoice !== false) {
      const pdf = await generateInvoicePdf(invoice, patientName, invCfg);
      attachments.push({
        filename: `Invoice_${invoice.invoice_id}_${patientName}.pdf`,
        content: pdf, contentType: 'application/pdf',
      });
    }

    await deliverAutomationEmail({
      tenantModels, settings, eventKey: 'invoiceGenerated',
      patient, patientId: invoice.patient_id,
      templateData: {
        first_name: patient.first_name,
        name:       patientName,
        invoice_id: invoice.invoice_id,
        amount:     `${cur}${invoice.total_amount}`,
        date:       new Date(invoice.date || invoice.createdAt || Date.now())
                      .toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
      },
      attachments,
      defaultSubject: `Invoice {{invoice_id}} from {{clinic}}`,
      defaultBody:    `Dear {{first_name}},\n\nPlease find attached invoice {{invoice_id}} for {{amount}}, dated {{date}}.\n\nThank you,\n{{clinic}}`,
      delayMinutes: eventCfg.delayMinutes,
    });
  } catch (err) {
    console.error('[Email] triggerInvoiceGenerated silenced:', err.message);
  }
}

// ─── Automation trigger: AI Report Ready ───────────────────────────────────
// Called fire-and-forget from report.controller when a ReportJob completes.
export async function triggerAiReportReady({ tenantModels, patientId, job, doctorName }) {
  try {
    if (!patientId || !job?.reportText) return;
    const ctx = await loadAutomationContext(tenantModels, 'aiReportReady', patientId.toString());
    if (!ctx) return;
    const { settings, eventCfg, patient } = ctx;

    const patientName = `${patient.first_name} ${patient.last_name || ''}`.trim();
    const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

    const attachments = [];
    if (eventCfg.attachReport !== false) {
      const pdf = await generateReportPdf(job.reportText, {
        patientName,
        doctorName: doctorName || 'Attending Doctor',
        date: today,
        templateName: job.templateId || 'Clinical Report',
      });
      attachments.push({
        filename: `AIReport_${patientName}_${new Date().toISOString().slice(0, 10)}.pdf`,
        content: pdf, contentType: 'application/pdf',
      });
    }

    await deliverAutomationEmail({
      tenantModels, settings, eventKey: 'aiReportReady',
      patient, patientId,
      templateData: {
        first_name: patient.first_name,
        name:       patientName,
        doctor:     doctorName || 'Attending Doctor',
        date:       today,
      },
      attachments,
      defaultSubject: `Your clinical report — {{date}}`,
      defaultBody:    `Dear {{first_name}},\n\nYour clinical report from {{doctor}} is ready and attached to this email.\n\nWarm regards,\n{{clinic}}`,
      delayMinutes: eventCfg.delayMinutes,
    });
  } catch (err) {
    console.error('[Email] triggerAiReportReady silenced:', err.message);
  }
}

// ─── Logs ──────────────────────────────────────────────────────────────────

export async function getLogs(req, res) {
  const { EmailLog } = req.tenantModels;
  const { event, status, dateFrom, dateTo } = req.query;

  try {
    const filter = {};

    if (event) filter.event = event;
    if (status) filter.status = status;

    if (dateFrom || dateTo) {
      filter.sentAt = {};
      if (dateFrom) {
        filter.sentAt.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        filter.sentAt.$lte = new Date(dateTo);
      }
    }

    const logs = await EmailLog.find(filter)
      .sort({ sentAt: -1 })
      .limit(200)
      .populate('patientId', 'first_name last_name patientId');

    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
