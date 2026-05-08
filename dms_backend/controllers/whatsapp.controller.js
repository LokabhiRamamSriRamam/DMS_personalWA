import { uploadFile, deleteFile } from '../services/cloudinary.service.js';
import { buildMessage, sendToWAAPI } from '../services/whatsapp.service.js';
import { generateReportPdf } from '../services/email.service.js';

// ─── Treatment Journey CRUD ───────────────────────────────────────────────────

// GET /api/whatsapp/journeys/treatments
// Returns all active SuggestedTreatments from the tenant DB,
// merged with any journey treatmentNames not in that list (orphaned journeys stay visible).
export async function getTreatmentNames(req, res) {
  const { SuggestedTreatment, TreatmentJourney } = req.tenantModels;
  try {
    const [treatments, journeys] = await Promise.all([
      SuggestedTreatment.find({ is_active: true }).select('name category').sort({ name: 1 }).lean(),
      TreatmentJourney.find({}).select('treatmentName').lean(),
    ]);

    const list = treatments.map(t => ({ name: t.name, category: t.category || 'General' }));
    const listNames = new Set(list.map(t => t.name.toLowerCase()));

    // Keep any journey whose treatmentName no longer exists in SuggestedTreatments
    for (const j of journeys) {
      if (!listNames.has(j.treatmentName.toLowerCase())) {
        list.push({ name: j.treatmentName, category: 'Other' });
      }
    }

    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET /api/whatsapp/journeys
export async function getJourneys(req, res) {
  const { TreatmentJourney } = req.tenantModels;
  try {
    const journeys = await TreatmentJourney.find({}).sort({ treatmentName: 1 });
    res.json(journeys);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// POST /api/whatsapp/journeys
export async function createJourney(req, res) {
  const { TreatmentJourney } = req.tenantModels;
  try {
    const journey = await new TreatmentJourney(req.body).save();
    res.status(201).json(journey);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// PUT /api/whatsapp/journeys/:id
export async function updateJourney(req, res) {
  const { TreatmentJourney } = req.tenantModels;
  try {
    const journey = await TreatmentJourney.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!journey) return res.status(404).json({ error: 'Journey not found' });
    res.json(journey);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// DELETE /api/whatsapp/journeys/:id
export async function deleteJourney(req, res) {
  const { TreatmentJourney } = req.tenantModels;
  try {
    const journey = await TreatmentJourney.findByIdAndDelete(req.params.id);
    if (!journey) return res.status(404).json({ error: 'Journey not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ─── Settings ─────────────────────────────────────────────────────────────────

// GET /api/whatsapp/settings
export async function getSettings(req, res) {
  const { WhatsAppSettings } = req.tenantModels;
  try {
    const settings = await WhatsAppSettings.findOne({});
    res.json(settings || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// PUT /api/whatsapp/settings
export async function upsertSettings(req, res) {
  const { WhatsAppSettings } = req.tenantModels;
  try {
    const existing = await WhatsAppSettings.findOne({});
    const updateData = existing
      ? {
          enabled: req.body.enabled ?? existing.enabled,
          defaultLanguage: req.body.defaultLanguage ?? existing.defaultLanguage,
          fallbackLanguage: req.body.fallbackLanguage ?? existing.fallbackLanguage,
          events: { ...existing.events, ...req.body.events },
        }
      : req.body;

    const settings = await WhatsAppSettings.findOneAndUpdate(
      {},
      updateData,
      { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
    );
    res.json(settings);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// GET /api/whatsapp/templates
export async function getTemplates(req, res) {
  const { WhatsAppTemplate } = req.tenantModels;
  try {
    const templates = await WhatsAppTemplate.find({}).sort({ event: 1, language: 1 });
    res.json(templates);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// POST /api/whatsapp/templates
export async function createTemplate(req, res) {
  const { WhatsAppTemplate } = req.tenantModels;
  try {
    const { event, language, isActive } = req.body;

    if (isActive !== false) {
      await WhatsAppTemplate.updateMany(
        { event, language, isActive: true },
        { $set: { isActive: false } }
      );
    }

    const template = await new WhatsAppTemplate(req.body).save();
    res.status(201).json(template);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// PUT /api/whatsapp/templates/:id
export async function updateTemplate(req, res) {
  const { WhatsAppTemplate } = req.tenantModels;
  try {
    const { event, language, isActive } = req.body;

    if (isActive === true) {
      await WhatsAppTemplate.updateMany(
        { event, language, isActive: true, _id: { $ne: req.params.id } },
        { $set: { isActive: false } }
      );
    }

    const template = await WhatsAppTemplate.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!template) return res.status(404).json({ error: 'Template not found' });
    res.json(template);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// DELETE /api/whatsapp/templates/:id
export async function deleteTemplate(req, res) {
  const { WhatsAppTemplate } = req.tenantModels;
  try {
    const template = await WhatsAppTemplate.findByIdAndDelete(req.params.id);
    if (!template) return res.status(404).json({ error: 'Template not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET /api/whatsapp/media
export async function getMedia(req, res) {
  const { WhatsAppMedia } = req.tenantModels;
  try {
    const media = await WhatsAppMedia.find({}).sort({ uploadedAt: -1 });
    res.json(media);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// POST /api/whatsapp/media  (multipart/form-data, field: file)
export async function uploadMedia(req, res) {
  const { WhatsAppMedia } = req.tenantModels;
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const tags = req.body.tags
      ? req.body.tags.split(',').map(t => t.trim()).filter(Boolean)
      : [];

    const uploaded = await uploadFile(
      req.file.buffer,
      req.file.originalname,
      'dms/whatsapp-media',
      tags,
      req.tenantConfig
    );

    // Derive broad media type from mimetype
    const mime = req.file.mimetype || '';
    let type = 'document';
    if (mime.startsWith('image/'))       type = mime === 'image/webp' ? 'sticker' : 'image';
    else if (mime.startsWith('video/'))  type = 'video';
    else if (mime.startsWith('audio/'))  type = 'audio';
    else if (mime === 'application/pdf') type = 'pdf';

    const mediaDoc = await WhatsAppMedia.create({
      publicId:   uploaded.publicId,
      url:        uploaded.url,
      type,
      mimeType:   mime,
      fileName:   req.file.originalname,
      fileSize:   req.file.size,
      tags,
      uploadedAt: new Date(),
    });

    res.status(201).json(mediaDoc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// DELETE /api/whatsapp/media/:id
export async function deleteMedia(req, res) {
  const { WhatsAppMedia } = req.tenantModels;
  try {
    const media = await WhatsAppMedia.findById(req.params.id);
    if (!media) return res.status(404).json({ error: 'Media not found' });

    await deleteFile(media.publicId, req.tenantConfig);
    await WhatsAppMedia.findByIdAndDelete(req.params.id);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET /api/whatsapp/logs?event=&status=&dateFrom=&dateTo=
// Returns all WhatsApp message logs with optional filtering
export async function getLogs(req, res) {
  const { WhatsAppLog } = req.tenantModels;
  try {
    const filter = {};
    if (req.query.event)  filter.event  = req.query.event;
    if (req.query.status) filter.status = req.query.status;

    // Date filtering: ISO strings like ?dateFrom=2025-01-01&dateTo=2025-01-31
    if (req.query.dateFrom || req.query.dateTo) {
      filter.sentAt = {};
      if (req.query.dateFrom) filter.sentAt.$gte = new Date(req.query.dateFrom);
      if (req.query.dateTo)   filter.sentAt.$lte = new Date(req.query.dateTo);
    }

    const logs = await WhatsAppLog.find(filter)
      .populate('patientId', 'first_name last_name')
      .sort({ sentAt: -1 })
      .limit(200);

    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET /api/whatsapp/logs/scheduled
// Returns only messages with status='scheduled' (queued, not yet sent)
export async function getScheduledLogs(req, res) {
  const { WhatsAppLog } = req.tenantModels;
  try {
    const logs = await WhatsAppLog.find({ status: 'scheduled' })
      .populate('patientId', 'first_name last_name')
      .sort({ sentAt: -1 })
      .limit(200);

    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET /api/whatsapp/logs/summary
// Returns counts by status and event type for dashboard KPIs
export async function getLogsSummary(req, res) {
  const { WhatsAppLog } = req.tenantModels;
  try {
    const byStatus = await WhatsAppLog.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const byEvent = await WhatsAppLog.aggregate([
      { $group: { _id: '$event', count: { $sum: 1 } } },
    ]);

    const recentFailed = await WhatsAppLog.find({ status: 'failed' })
      .populate('patientId', 'first_name last_name')
      .sort({ sentAt: -1 })
      .limit(10);

    res.json({
      byStatus: Object.fromEntries(byStatus.map(x => [x._id, x.count])),
      byEvent: Object.fromEntries(byEvent.map(x => [x._id, x.count])),
      recentFailed,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// POST /api/whatsapp/test-send
export async function testSend(req, res) {
  const { WhatsAppLog } = req.tenantModels;
  try {
    const { patientPhone, eventType, data = {}, language } = req.body;
    if (!patientPhone || !eventType) {
      return res.status(400).json({ error: 'patientPhone and eventType are required' });
    }

    const waapiBaseUrl = process.env.WAAPI_BASE_URL;
    if (!waapiBaseUrl) {
      return res.status(500).json({ error: 'WAAPI_BASE_URL is not configured' });
    }

    const payload = await buildMessage(req.tenantModels, req.user.tenantId, eventType, data, language);
    if (!payload) {
      return res.status(422).json({ error: 'No active template found or event is disabled' });
    }

    payload.to = patientPhone;

    let waapiResponse = null;
    let status = 'sent';
    let errorMessage;

    try {
      waapiResponse = await sendToWAAPI(payload, waapiBaseUrl);
    } catch (sendErr) {
      status = 'failed';
      errorMessage = sendErr.message;
    }

    await WhatsAppLog.create({
      event: eventType, to: patientPhone, payload, status, errorMessage, sentAt: new Date(),
    });

    res.json({ payload, waapiResponse, status, errorMessage });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// POST /api/whatsapp/feedback/webhook
// Receives poll response from WAAPI (public endpoint, validates tenantId in payload)
export async function handlePollResponse(req, res) {
  try {
    const { tenantId, from, messageId, selectedOption, selectedIndex, pollQuestion, timestamp } = req.body;

    // Validate required fields
    if (!tenantId || !from || !messageId || !selectedOption || !timestamp) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Manually resolve tenant without relying on req.user
    const { getAnalyticsDb } = await import('../config/analyticsDb.js');
    const { getTenantConnection } = await import('../config/tenantDb.js');
    const { getTenantModels } = await import('../config/tenantModels.js');
    const mongoose = await import('mongoose');

    const analyticsDb = getAnalyticsDb();
    const tenant = await analyticsDb.collection('tenants').findOne({
      _id: new mongoose.default.Types.ObjectId(tenantId),
    });

    if (!tenant) {
      console.warn(`[Feedback Webhook] Tenant not found: ${tenantId}`);
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const tenantConn = await getTenantConnection(tenant.mongoUri, tenant.mongoDbName);
    const { PollResponse, Patient, WhatsAppLog } = tenantModels;

    // Parse rating from selectedOption (e.g., "4-Satisfied" → 4)
    const ratingMatch = selectedOption.match(/^(\d)/);
    if (!ratingMatch) {
      return res.status(400).json({ error: 'Invalid selectedOption format' });
    }
    const rating = parseInt(ratingMatch[1], 10);

    // Map rating to feedbackType
    const feedbackTypeMap = {
      5: 'excellent',
      4: 'good',
      3: 'neutral',
      2: 'poor',
      1: 'very_poor',
    };
    const feedbackType = feedbackTypeMap[rating];

    // Create PollResponse document
    const pollResponse = await PollResponse.create({
      tenantId,
      messageId,
      from,
      rating,
      feedbackType,
      selectedOption,
      pollQuestion,
      respondedAt: new Date(timestamp),
    });

    // Log to WhatsAppLog
    await WhatsAppLog.create({
      event: 'pollResponse',
      to: from,
      payload: req.body,
      status: 'received',
      sentAt: new Date(),
    });

    res.json({ ok: true, stored: true, pollResponseId: pollResponse._id });
  } catch (err) {
    console.error('[Feedback Webhook] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
}

// GET /api/whatsapp/feedback?feedbackType=&dateFrom=&dateTo=
// Returns tenant-isolated poll responses
export async function getFeedback(req, res) {
  const { PollResponse, Patient, Appointment } = req.tenantModels;
  try {
    const filter = { tenantId: req.user.tenantId };

    if (req.query.feedbackType) filter.feedbackType = req.query.feedbackType;
    if (req.query.rating) filter.rating = Number(req.query.rating);

    if (req.query.dateFrom || req.query.dateTo) {
      filter.respondedAt = {};
      if (req.query.dateFrom) filter.respondedAt.$gte = new Date(req.query.dateFrom);
      if (req.query.dateTo)   filter.respondedAt.$lte = new Date(new Date(req.query.dateTo).setHours(23, 59, 59, 999));
    }

    const responses = await PollResponse.find(filter)
      .sort({ respondedAt: -1 })
      .limit(500)
      .lean();

    // Join patient and appointment data
    const patientIds = [...new Set(responses.map(r => r.patientId).filter(Boolean))];
    const appointmentIds = [...new Set(responses.map(r => r.appointmentId).filter(Boolean))];

    const [patients, appointments] = await Promise.all([
      Patient ? Patient.find({ _id: { $in: patientIds } }).select('first_name last_name patientId').lean() : [],
      Appointment ? Appointment.find({ _id: { $in: appointmentIds } }).select('start_time type doctor_id').lean() : [],
    ]);

    const patientMap = Object.fromEntries(patients.map(p => [p._id.toString(), p]));
    const apptMap    = Object.fromEntries(appointments.map(a => [a._id.toString(), a]));

    const enriched = responses.map(r => ({
      ...r,
      patient:     r.patientId     ? patientMap[r.patientId.toString()]     || null : null,
      appointment: r.appointmentId ? apptMap[r.appointmentId.toString()]    || null : null,
    }));

    // Analytics
    const ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let ratingSum = 0;
    for (const r of responses) {
      if (r.rating >= 1 && r.rating <= 5) { ratingCounts[r.rating]++; ratingSum += r.rating; }
    }
    const total = responses.length;
    const avgRating = total > 0 ? (ratingSum / total).toFixed(2) : null;
    const positive = (ratingCounts[4] + ratingCounts[5]);
    const predictedGoogleScore = total > 0 ? ((positive / total) * 4 + 1).toFixed(2) : null;

    res.json({
      ok: true,
      count: total,
      data: enriched,
      analytics: { ratingCounts, avgRating: Number(avgRating), total, predictedGoogleScore: Number(predictedGoogleScore) },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// POST /api/whatsapp/feedback/send
// Queue a feedback poll to be sent to patient
export async function sendFeedbackPoll(req, res) {
  const { WhatsAppLog, Patient } = req.tenantModels;
  try {
    const { patientId, question, options, scheduledAt } = req.body;

    if (!patientId || !question || !options || !Array.isArray(options)) {
      return res.status(400).json({ error: 'patientId, question, and options array are required' });
    }

    if (options.length < 2 || options.length > 5) {
      return res.status(400).json({ error: 'options must have 2-5 items' });
    }

    const patient = await Patient.findById(patientId);
    if (!patient || !patient.contact?.mobile) {
      return res.status(404).json({ error: 'Patient not found or has no mobile number' });
    }

    const waapiBaseUrl = process.env.WAAPI_BASE_URL;
    if (!waapiBaseUrl) {
      return res.status(500).json({ error: 'WAAPI_BASE_URL is not configured' });
    }

    const payload = {
      tenantId: req.user.tenantId,
      to: patient.contact.mobile,
      messageType: 'feedbackPoll',
      contentType: 'poll',
      content: {
        name: question,
        values: options,
        selectableCount: 1,
      },
      scheduledAt: scheduledAt || null,
    };

    let waapiResponse = null;
    let status = 'scheduled';
    let errorMessage;

    try {
      waapiResponse = await sendToWAAPI(payload, waapiBaseUrl);
    } catch (sendErr) {
      status = 'failed';
      errorMessage = sendErr.message;
    }

    // Log the poll message
    await WhatsAppLog.create({
      event: 'feedbackPoll',
      to: patient.contact.mobile,
      payload,
      status,
      errorMessage,
      sentAt: new Date(),
    });

    res.status(201).json({
      ok: true,
      status,
      scheduledFor: scheduledAt || new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ─── Send AI Report via WhatsApp ──────────────────────────────────────────

export async function sendReportWhatsApp(req, res) {
  const { Patient, WhatsAppLog } = req.tenantModels;
  const { patient_id, to, caption, report_text, template_name } = req.body;

  if (!patient_id || !to || !report_text) {
    return res.status(400).json({
      error: 'patient_id, to, and report_text are required',
    });
  }

  try {
    const patient = await Patient.findById(patient_id);
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const waapiBaseUrl = process.env.WAAPI_BASE_URL || 'https://api.example.com';
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

    // Upload PDF to Cloudinary
    const cloudinaryUrl = req.tenantConfig?.cloudinaryCloudName;
    if (!cloudinaryUrl) {
      return res.status(400).json({ error: 'Cloudinary not configured for this tenant' });
    }

    const uploaded = await uploadFile(
      pdfBuffer,
      filename,
      'dms/ai-reports',
      ['ai-report', template_name],
      req.tenantConfig
    );

    if (!uploaded || !uploaded.secure_url) {
      return res.status(500).json({ error: 'Failed to upload PDF to Cloudinary' });
    }

    // Build WAAPI payload
    const payload = {
      tenantId: req.user.tenantId,
      to,
      messageType: 'aiReport',
      contentType: 'document',
      content: {
        url: uploaded.secure_url,
        mimetype: 'application/pdf',
        fileName: filename,
        caption: caption || `Here is your clinical report: ${template_name || 'Patient Letter'}`,
      },
    };

    let waapiResponse = null;
    let status = 'sent';
    let errorMessage;

    try {
      waapiResponse = await sendToWAAPI(payload, waapiBaseUrl);
    } catch (sendErr) {
      status = 'failed';
      errorMessage = sendErr.message;
    }

    // Log the message
    await WhatsAppLog.create({
      event: 'aiReportReady',
      to,
      payload,
      status,
      errorMessage,
      sentAt: new Date(),
    });

    if (status === 'failed') {
      return res.status(500).json({ error: errorMessage });
    }

    res.json({
      status: 'sent',
      to,
      cloudinaryUrl: uploaded.secure_url,
      filename,
    });
  } catch (err) {
    console.error('[WhatsApp Report] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
}
