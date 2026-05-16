import multer from 'multer';
import {
  uploadFileToDrive,
  createPatientDriveFolders,
  createSubfolder,
} from '../services/googleDrive.service.js';
import { TEMPLATES, getTemplateById } from '../config/templates.config.js';
import { triggerAiReportReady } from './email.controller.js';

const upload = multer({ storage: multer.memoryStorage() });
export const uploadMiddleware = upload.single('file');

// ─── In-memory audio buffer store (keyed by jobId, TTL ~1h) ───────────────────
// We can't persist audio to MongoDB (too large). Buffer lives in memory between
// POST /transcribe (stores it) and the async Sarvam polling (reads it).
const audioBuffers = new Map(); // jobId -> { buffer, mimetype, filename, expiresAt }
setInterval(() => {
  const now = Date.now();
  for (const [id, v] of audioBuffers) {
    if (v.expiresAt < now) audioBuffers.delete(id);
  }
}, 5 * 60 * 1000); // purge expired every 5 min

// ─── Sarvam Batch STT ──────────────────────────────────────────────────────────
async function startSarvamJob(apiKey, buffer, mimetype, filename) {
  const BASE = 'https://api.sarvam.ai';
  const HEADERS = { 'api-subscription-key': apiKey };
  const audioFile = filename || 'dictation.webm';

  const createRes = await fetch(`${BASE}/speech-to-text/job/v1`, {
    method: 'POST',
    headers: { ...HEADERS, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      job_parameters: { model: 'saaras:v3', mode: 'translate', language_code: 'unknown' },
    }),
  });
  if (!createRes.ok) throw new Error(`[Batch] Create job failed ${createRes.status}: ${await createRes.text()}`);
  const { job_id } = await createRes.json();

  const uploadUrlRes = await fetch(`${BASE}/speech-to-text/job/v1/upload-files`, {
    method: 'POST',
    headers: { ...HEADERS, 'Content-Type': 'application/json' },
    body: JSON.stringify({ job_id, files: [audioFile] }),
  });
  if (!uploadUrlRes.ok) throw new Error(`[Batch] Upload URL failed ${uploadUrlRes.status}: ${await uploadUrlRes.text()}`);
  const { upload_urls } = await uploadUrlRes.json();
  const signedUploadUrl = upload_urls[audioFile]?.file_url;
  if (!signedUploadUrl) throw new Error('[Batch] No signed upload URL returned');

  const putRes = await fetch(signedUploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': mimetype, 'x-ms-blob-type': 'BlockBlob' },
    body: buffer,
  });
  if (!putRes.ok) throw new Error(`[Batch] File PUT to storage failed: ${putRes.status}`);

  const startRes = await fetch(`${BASE}/speech-to-text/job/v1/${job_id}/start`, {
    method: 'POST',
    headers: { ...HEADERS, 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  if (!startRes.ok) throw new Error(`[Batch] Start job failed ${startRes.status}: ${await startRes.text()}`);

  return job_id;
}

async function pollSarvamJob(apiKey, sarvamJobId) {
  const BASE = 'https://api.sarvam.ai';
  const HEADERS = { 'api-subscription-key': apiKey };
  const MAX_POLLS = 75;

  let outputFilename = null;
  for (let i = 0; i < MAX_POLLS; i++) {
    await new Promise(r => setTimeout(r, 8000));
    const statusRes = await fetch(`${BASE}/speech-to-text/job/v1/${sarvamJobId}/status`, { headers: HEADERS });
    if (!statusRes.ok) continue;
    const status = await statusRes.json();

    if (status.job_state === 'Completed') {
      const detail = status.job_details?.[0];
      const outputsArr = Array.isArray(detail?.outputs) ? detail.outputs : [];
      outputFilename = outputsArr[0]?.file_name || outputsArr[0]?.file_id;
      break;
    }
    if (status.job_state === 'Failed') {
      throw new Error(`[Batch] Job failed: ${status.error_message || 'Unknown error'}`);
    }
  }
  if (!outputFilename) throw new Error('[Batch] Timed out waiting for transcription (10 min)');

  const downloadUrlRes = await fetch(`${BASE}/speech-to-text/job/v1/download-files`, {
    method: 'POST',
    headers: { ...HEADERS, 'Content-Type': 'application/json' },
    body: JSON.stringify({ job_id: sarvamJobId, files: [outputFilename] }),
  });
  if (!downloadUrlRes.ok) throw new Error(`[Batch] Download URL failed ${downloadUrlRes.status}: ${await downloadUrlRes.text()}`);
  const { download_urls } = await downloadUrlRes.json();
  const signedDownloadUrl = download_urls[outputFilename]?.file_url;
  if (!signedDownloadUrl) throw new Error('[Batch] No signed download URL returned');

  const resultRes = await fetch(signedDownloadUrl);
  if (!resultRes.ok) throw new Error(`[Batch] Result download failed: ${resultRes.status}`);
  const result = await resultRes.json();
  return result.transcript || '';
}

// ─── LLM: Generate a single document (non-streaming) ──────────────────────────
async function generateFromTemplate(apiKey, transcript, patientName, patientGender, doctorName, date, template, detailLevel) {
  if (!apiKey) throw new Error('NVIDIA API Key not configured for this tenant.');

  const salutation = patientGender === 'Female' ? 'Ms' : patientGender === 'Male' ? 'Mr' : 'Mx';

  const detailInstructions = {
    brief:    'Respond concisely. Use short paragraphs. Omit anything not critical. Target approximately 200 words.',
    standard: 'Follow the structure as given. Use normal paragraph length and include all relevant details from the dictation.',
    detailed: 'Expand each section thoroughly. Include clinical reasoning and context where appropriate. Target 600 or more words.',
  };

  const systemPrompt = `${template.systemInstruction}

Detail level instructions:
${detailInstructions[detailLevel] || detailInstructions.standard}
The current detail level is: ${detailLevel}

STRUCTURE TO FOLLOW:
${template.structure}`;

  const userPrompt = `Patient: ${patientName} (${salutation})
Doctor: ${doctorName}
Date: ${date}

DICTATION:
"""
${transcript}
"""

Generate the document now following the structure and detail level above. Return plain text only — no JSON, no markdown code blocks.`;

  const res = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'minimaxai/minimax-m2.7',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt   },
      ],
      max_tokens:  4096,
      temperature: 1.0,
    }),
  });

  if (!res.ok) throw new Error(`LLM API error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || '';
}

// ─── LLM: Stream response to frontend via SSE ─────────────────────────────────
async function streamFromTemplate(apiKey, transcript, patientName, patientGender, doctorName, date, template, detailLevel, res) {
  if (!apiKey) throw new Error('NVIDIA API Key not configured for this tenant.');

  const salutation = patientGender === 'Female' ? 'Ms' : patientGender === 'Male' ? 'Mr' : 'Mx';

  const detailInstructions = {
    brief:    'Respond concisely. Use short paragraphs. Omit anything not critical. Target approximately 200 words.',
    standard: 'Follow the structure as given. Use normal paragraph length and include all relevant details from the dictation.',
    detailed: 'Expand each section thoroughly. Include clinical reasoning and context where appropriate. Target 600 or more words.',
  };

  const systemPrompt = `${template.systemInstruction}

Detail level instructions:
${detailInstructions[detailLevel] || detailInstructions.standard}
The current detail level is: ${detailLevel}

STRUCTURE TO FOLLOW:
${template.structure}`;

  const userPrompt = `Patient: ${patientName} (${salutation})
Doctor: ${doctorName}
Date: ${date}

DICTATION:
"""
${transcript}
"""

Generate the document now following the structure and detail level above. Return plain text only — no JSON, no markdown code blocks.`;

  const upstream = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'minimaxai/minimax-m2.7',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt   },
      ],
      max_tokens:  4096,
      temperature: 1.0,
      stream:      true,
    }),
  });

  if (!upstream.ok) throw new Error(`LLM API error ${upstream.status}: ${await upstream.text()}`);

  // Pipe SSE tokens to client
  let fullText = '';
  const decoder = new TextDecoder();
  for await (const chunk of upstream.body) {
    const text = decoder.decode(chunk, { stream: true });
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed === 'data: [DONE]') continue;
      if (!trimmed.startsWith('data: ')) continue;
      try {
        const parsed = JSON.parse(trimmed.slice(6));
        const token = parsed.choices?.[0]?.delta?.content || '';
        if (token) {
          fullText += token;
          res.write(`data: ${JSON.stringify({ token })}\n\n`);
        }
      } catch { /* skip malformed SSE lines */ }
    }
  }
  return fullText;
}

// ─── LLM: Structured autofill extraction ──────────────────────────────────────
async function parseAutofillWithLLM(apiKey, transcript) {
  if (!apiKey) return null;

  const systemPrompt = `Extract structured clinical data from a dental consultation transcript. Return ONLY valid JSON.`;

  const userPrompt = `Extract from this transcript:
"""
${transcript}
"""

Return JSON:
{
  "chief_complaint": "string",
  "medical_history": ["string"],
  "dental_history": "string",
  "treatment_plan": [ { "tooth_numbers": [], "clinical_findings": "", "diagnosis": "", "suggested_treatment": "", "estimated_price": 0 } ],
  "consultation_note": "HTML summarizing visit",
  "advice": "HTML combined advice",
  "medications": [ { "drug_name": "", "dosage": "", "duration": "", "instructions": "" } ],
  "recall": { "days_later": 0, "notes": "" }
}`;

  const res = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'minimaxai/minimax-m2.7',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt   },
      ],
      response_format: { type: 'json_object' },
      max_tokens:  4096,
      temperature: 0.1,
    }),
  });

  if (!res.ok) return null;
  const data = await res.json();
  return JSON.parse(data.choices?.[0]?.message?.content || '{}');
}

// ─── Upload report text to Drive ────────────────────────────────────────────────
async function uploadTextToDrive(credentials, folderId, text, filename) {
  const buffer = Buffer.from(text, 'utf-8');
  return uploadFileToDrive(credentials, folderId, buffer, filename, 'text/plain');
}

// ─── GET /api/report/templates ──────────────────────────────────────────────────
export function listTemplates(req, res) {
  const summary = TEMPLATES.map(({ id, name, description, type, category, specialty }) => ({
    id, name, description, type, category, specialty,
  }));
  res.json(summary);
}

// ─── POST /api/report/transcribe ───────────────────────────────────────────────
// Accepts multipart audio OR transcript_text. Returns { jobId } immediately.
// Kicks off async Sarvam polling in background.
export async function transcribeAudio(req, res) {
  const { Patient, ReportJob } = req.tenantModels;
  const credentials = req.tenantConfig;

  try {
    const { patient_id, template_id, detail_level, save_report, autofill } = req.body;
    if (!patient_id)  return res.status(400).json({ error: 'patient_id is required' });
    if (!template_id) return res.status(400).json({ error: 'template_id is required' });

    const template = getTemplateById(template_id);
    if (!template) return res.status(400).json({ error: `Unknown template_id: ${template_id}` });

    const directText = (req.body.transcript_text || '').trim();
    if (!req.file && !directText) return res.status(400).json({ error: 'No audio file or transcript_text provided' });

    const patient = await Patient.findById(patient_id);
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    // Check if visit already has a transcript for today (cache hit)
    const { Visit } = req.tenantModels;
    const todayStart = new Date(); todayStart.setHours(0,0,0,0);
    const todayEnd   = new Date(); todayEnd.setHours(23,59,59,999);
    const todayVisit = await Visit.findOne({
      patient_id,
      date: { $gte: todayStart, $lte: todayEnd },
      ai_transcript: { $exists: true, $ne: '' },
    });
    const cachedTranscript = todayVisit?.ai_transcript || null;

    const job = await ReportJob.create({
      patientId:     patient._id,
      status:        directText || cachedTranscript ? 'transcribed' : 'pending',
      transcript:    directText || cachedTranscript || '',
      templateId:    template_id,
      detailLevel:   detail_level || 'standard',
      saveReport:    save_report !== 'false',
      runAutofill:   autofill === 'true',
      audioFilename: req.file?.originalname || null,
      audioMimetype: req.file?.mimetype     || null,
      createdBy:     req.user?.name || 'unknown',
    });

    if (directText || cachedTranscript) {
      // No Sarvam call needed — return immediately
      return res.json({ jobId: job._id, status: 'transcribed', cachedTranscript: !!cachedTranscript });
    }

    // Store audio buffer in memory (will be consumed by async Sarvam call)
    audioBuffers.set(String(job._id), {
      buffer:    req.file.buffer,
      mimetype:  req.file.mimetype,
      filename:  req.file.originalname,
      expiresAt: Date.now() + 60 * 60 * 1000, // 1h TTL
    });

    // Respond immediately, then do Sarvam async
    res.json({ jobId: job._id, status: 'pending' });

    // ── Async background: Sarvam transcription ──
    (async () => {
      try {
        await ReportJob.findByIdAndUpdate(job._id, { status: 'transcribing' });
        const audio = audioBuffers.get(String(job._id));
        if (!audio) throw new Error('Audio buffer expired before Sarvam could process it');

        const sarvamJobId = await startSarvamJob(credentials.sarvamApiKey, audio.buffer, audio.mimetype, audio.filename);
        await ReportJob.findByIdAndUpdate(job._id, { sarvamJobId });
        audioBuffers.delete(String(job._id));

        const transcript = await pollSarvamJob(credentials.sarvamApiKey, sarvamJobId);
        if (!transcript) throw new Error('Transcription returned empty.');

        // Cache transcript on today's visit
        const todayVisitForUpdate = await Visit.findOne({ patient_id, date: { $gte: todayStart, $lte: todayEnd } });
        if (todayVisitForUpdate) {
          await Visit.findByIdAndUpdate(todayVisitForUpdate._id, { ai_transcript: transcript });
        }

        await ReportJob.findByIdAndUpdate(job._id, { status: 'transcribed', transcript });
      } catch (err) {
        console.error('[Report] Sarvam error:', err.message);
        audioBuffers.delete(String(job._id));
        await ReportJob.findByIdAndUpdate(job._id, { status: 'failed', errorMessage: err.message });
      }
    })();

  } catch (err) {
    console.error('[Report] transcribeAudio error:', err.message);
    res.status(500).json({ error: err.message });
  }
}

// ─── GET /api/report/jobs/:jobId ────────────────────────────────────────────────
export async function getJobStatus(req, res) {
  const { ReportJob } = req.tenantModels;
  try {
    const job = await ReportJob.findById(req.params.jobId).select('-audioBuffer');
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json({
      jobId:      job._id,
      status:     job.status,
      transcript: job.transcript || '',
      errorMessage: job.errorMessage || null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ─── PATCH /api/report/jobs/:jobId/transcript ──────────────────────────────────
// Allow user to edit/review transcript before proceeding to generation
export async function editTranscript(req, res) {
  const { ReportJob } = req.tenantModels;
  try {
    const { jobId } = req.params;
    const { transcript } = req.body;

    if (!transcript || typeof transcript !== 'string') {
      return res.status(400).json({ error: 'transcript (string) is required' });
    }

    const job = await ReportJob.findById(jobId);
    if (!job) return res.status(404).json({ error: 'Job not found' });

    // Allow editing only if job is in transcribed state (before generation)
    if (job.status !== 'transcribed') {
      return res.status(400).json({
        error: `Cannot edit transcript in status: ${job.status}. Job must be in 'transcribed' state.`,
      });
    }

    // Update transcript
    await ReportJob.findByIdAndUpdate(jobId, { transcript: transcript.trim() });

    res.json({
      jobId,
      status: 'transcribed',
      transcript: transcript.trim(),
      message: 'Transcript updated successfully. Ready for report generation.',
    });
  } catch (err) {
    console.error('[Report] editTranscript error:', err.message);
    res.status(500).json({ error: err.message });
  }
}

// ─── POST /api/report/generate ─────────────────────────────────────────────────
// Accepts { jobId, template_id OR template_ids, detail_level, save_report, autofill }
// OR legacy { patient_id, template_id, transcript_text, ... } for backwards compat.
// Streams the LLM response via SSE.
// Supports single template (backward compat) or multiple templates (sequential generation)
export async function generateReport(req, res) {
  const { Patient, ReportJob, Visit } = req.tenantModels;
  const credentials = req.tenantConfig;

  try {
    const jobId = req.body.jobId;

    // ── New job-queue path ──
    if (jobId) {
      const job = await ReportJob.findById(jobId);
      if (!job) return res.status(404).json({ error: 'Job not found' });
      if (job.status !== 'transcribed') {
        return res.status(400).json({ error: `Job is not ready for generation (status: ${job.status})` });
      }

      // Allow transcript override (edit-and-regenerate)
      const transcriptOverride = (req.body.transcript || '').trim();
      const transcript = transcriptOverride || job.transcript;
      if (!transcript) return res.status(422).json({ error: 'Transcript is empty.' });

      // Support both single template_id and multiple template_ids
      const detailLevel = req.body.detail_level  || job.detailLevel;
      const saveReport  = req.body.save_report !== undefined ? req.body.save_report !== 'false' : job.saveReport;
      const runAutofill = req.body.autofill !== undefined ? req.body.autofill === 'true' : job.runAutofill;

      const templateIds = req.body.template_ids || (req.body.template_id ? [req.body.template_id] : [job.templateId]);
      if (!Array.isArray(templateIds) || templateIds.length === 0) {
        return res.status(400).json({ error: 'template_id or template_ids required' });
      }

      // Validate all templates exist
      const templates = [];
      for (const tId of templateIds) {
        const tpl = getTemplateById(tId);
        if (!tpl) return res.status(400).json({ error: `Unknown template_id: ${tId}` });
        templates.push(tpl);
      }

      const patient = await Patient.findById(job.patientId);
      if (!patient) return res.status(404).json({ error: 'Patient not found' });

      const patientName = `${patient.first_name} ${patient.last_name || ''}`.trim();
      const doctorName  = req.user?.name || 'Attending Doctor';
      const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

      await ReportJob.findByIdAndUpdate(jobId, { status: 'generating' });

      // Set up SSE
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();

      // Generate reports sequentially for each template
      const reports = {};
      for (const template of templates) {
        try {
          res.write(`data: ${JSON.stringify({ progress: `Generating ${template.name}...` })}\n\n`);
          const reportText = await streamFromTemplate(
            credentials.nvidiaApiKey, transcript, patientName, patient.gender,
            doctorName, today, template, detailLevel, res,
          );
          reports[template.id] = reportText;
          res.write(`data: ${JSON.stringify({ completed: template.id })}\n\n`);
        } catch (err) {
          res.write(`data: ${JSON.stringify({ error: `Failed to generate ${template.name}: ${err.message}` })}\n\n`);
          await ReportJob.findByIdAndUpdate(jobId, { status: 'failed', errorMessage: err.message });
          res.end();
          return;
        }
      }

      // Autofill (once, parallel with Drive save)
      let autofill_v2 = null;
      const drive_links = {};
      const fileRecords = [];

      const [autofillResult, driveResult] = await Promise.allSettled([
        runAutofill ? parseAutofillWithLLM(credentials.nvidiaApiKey, transcript) : Promise.resolve(null),
        (async () => {
          if (!saveReport) return;
          if (!patient.drive_folders?.root) {
            patient.drive_folders = await createPatientDriveFolders(credentials, patient.patientId, patientName);
            await patient.save();
          }
          const clinicalNotesFolderId = patient.drive_folders.clinical_notes;
          if (!clinicalNotesFolderId) return;
          const dateFolderName = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
          const dateFolderId   = await createSubfolder(credentials, clinicalNotesFolderId, dateFolderName);
          const dateStr  = new Date().toISOString().slice(0, 10);

          // Upload each report to Drive
          for (const template of templates) {
            const reportText = reports[template.id];
            if (!reportText) continue;
            const filename = `${template.name}_${patientName}_${dateStr}.txt`;
            const uploaded = await uploadTextToDrive(credentials, dateFolderId, reportText, filename);
            if (uploaded) {
              drive_links[template.id] = uploaded.webViewLink;
              fileRecords.push({
                file_name:     uploaded.name,
                category:      'Clinical Notes',
                drive_file_id: uploaded.id,
                web_view_link: uploaded.webViewLink,
                mime_type:     'text/plain',
              });
            }
          }
        })(),
      ]);

      if (autofillResult.status === 'fulfilled') autofill_v2 = autofillResult.value;
      if (fileRecords.length > 0) {
        patient.files.push(...fileRecords);
        await patient.save();
      }

      await ReportJob.findByIdAndUpdate(jobId, {
        status: 'done', reportText: reports[templateIds[0]], driveLinks: drive_links,
        autofillData: autofill_v2, transcript,
      });

      // Email automation (fire-and-forget)
      triggerAiReportReady({
        tenantModels: req.tenantModels,
        patientId: job.patientId,
        job: { reportText: reports[templateIds[0]], templateId: templates[0]?.name },
        doctorName,
      });

      // Send final metadata event
      res.write(`data: ${JSON.stringify({
        done: true,
        jobId, transcript,
        reports,
        drive_links,
        autofill_v2,
      })}\n\n`);
      res.end();
      return;
    }

    // ── Legacy path: direct transcript_text (no jobId) ──
    const { patient_id, template_id, template_ids, detail_level, save_report, autofill, transcript_text } = req.body;
    if (!patient_id)  return res.status(400).json({ error: 'patient_id required' });

    const templateIds = template_ids || (template_id ? [template_id] : []);
    if (templateIds.length === 0) {
      return res.status(400).json({ error: 'template_id or template_ids required' });
    }

    const directText = (transcript_text || '').trim();
    if (!req.file && !directText) return res.status(400).json({ error: 'No audio file or transcript_text provided' });

    // Validate all templates exist
    const templates = [];
    for (const tId of templateIds) {
      const tpl = getTemplateById(tId);
      if (!tpl) return res.status(400).json({ error: `Unknown template_id: ${tId}` });
      templates.push(tpl);
    }

    const patient = await Patient.findById(patient_id);
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    const patientName = `${patient.first_name} ${patient.last_name || ''}`.trim();
    const doctorName  = req.user?.name || 'Attending Doctor';
    const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    const detailLevel = detail_level || 'standard';
    const saveRep     = save_report !== 'false';
    const runAuto     = autofill === 'true';

    let transcript = directText;
    if (!transcript && req.file) {
      const sarvamJobId = await startSarvamJob(credentials.sarvamApiKey, req.file.buffer, req.file.mimetype, req.file.originalname);
      transcript = await pollSarvamJob(credentials.sarvamApiKey, sarvamJobId);
    }
    if (!transcript) return res.status(422).json({ error: 'Transcription returned empty.' });

    // Set up SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Generate reports sequentially for each template
    const reports = {};
    for (const template of templates) {
      try {
        res.write(`data: ${JSON.stringify({ progress: `Generating ${template.name}...` })}\n\n`);
        const reportText = await streamFromTemplate(credentials.nvidiaApiKey, transcript, patientName, patient.gender, doctorName, today, template, detailLevel, res);
        reports[template.id] = reportText;
        res.write(`data: ${JSON.stringify({ completed: template.id })}\n\n`);
      } catch (err) {
        res.write(`data: ${JSON.stringify({ error: `Failed to generate ${template.name}: ${err.message}` })}\n\n`);
        res.end();
        return;
      }
    }

    let autofill_v2 = null;
    const drive_links = {};
    const fileRecords = [];

    const [afResult, drResult] = await Promise.allSettled([
      runAuto ? parseAutofillWithLLM(credentials.nvidiaApiKey, transcript) : Promise.resolve(null),
      (async () => {
        if (!saveRep) return;
        if (!patient.drive_folders?.root) {
          patient.drive_folders = await createPatientDriveFolders(credentials, patient.patientId, patientName);
          await patient.save();
        }
        const clinicalNotesFolderId = patient.drive_folders.clinical_notes;
        if (!clinicalNotesFolderId) return;
        const dateFolderName = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
        const dateFolderId   = await createSubfolder(credentials, clinicalNotesFolderId, dateFolderName);
        const dateStr  = new Date().toISOString().slice(0, 10);

        // Upload each report to Drive
        for (const template of templates) {
          const reportText = reports[template.id];
          if (!reportText) continue;
          const filename = `${template.name}_${patientName}_${dateStr}.txt`;
          const uploaded = await uploadTextToDrive(credentials, dateFolderId, reportText, filename);
          if (uploaded) {
            drive_links[template.id] = uploaded.webViewLink;
            fileRecords.push({
              file_name: uploaded.name, category: 'Clinical Notes',
              drive_file_id: uploaded.id, web_view_link: uploaded.webViewLink, mime_type: 'text/plain',
            });
          }
        }
      })(),
    ]);

    if (afResult.status === 'fulfilled') autofill_v2 = afResult.value;
    if (fileRecords.length > 0) { patient.files.push(...fileRecords); await patient.save(); }

    // Email automation (fire-and-forget)
    triggerAiReportReady({
      tenantModels: req.tenantModels,
      patientId: patient._id,
      job: { reportText: reports[templateIds[0]], templateId: templates[0]?.name },
      doctorName,
    });

    res.write(`data: ${JSON.stringify({
      done: true, transcript,
      reports, drive_links, autofill_v2,
    })}\n\n`);
    res.end();

  } catch (err) {
    console.error('[Report] Error:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    } else {
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
      res.end();
    }
  }
}
