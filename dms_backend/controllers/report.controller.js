import multer from 'multer';
import { 
  uploadFileToDrive, 
  createPatientDriveFolders, 
  createSubfolder 
} from '../services/googleDrive.service.js';

const upload = multer({ storage: multer.memoryStorage() });
export const uploadMiddleware = upload.single('file');

// ─── Sarvam Batch STT (for long recordings up to 10 min) ──────────────────────
async function transcribeAudioBatch(apiKey, buffer, mimetype, filename) {
  const BASE = 'https://api.sarvam.ai';
  const HEADERS = { 'api-subscription-key': apiKey };
  const audioFile = filename || 'dictation.webm';

  // 1. Create job
  const createRes = await fetch(`${BASE}/speech-to-text/job/v1`, {
    method: 'POST',
    headers: { ...HEADERS, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      job_parameters: { model: 'saaras:v3', mode: 'translate', language_code: 'unknown' },
    }),
  });
  if (!createRes.ok) throw new Error(`[Batch] Create job failed ${createRes.status}: ${await createRes.text()}`);
  const { job_id } = await createRes.json();

  // 2. Get signed upload URL
  const uploadUrlRes = await fetch(`${BASE}/speech-to-text/job/v1/upload-files`, {
    method: 'POST',
    headers: { ...HEADERS, 'Content-Type': 'application/json' },
    body: JSON.stringify({ job_id, files: [audioFile] }),
  });
  if (!uploadUrlRes.ok) throw new Error(`[Batch] Upload URL failed ${uploadUrlRes.status}: ${await uploadUrlRes.text()}`);
  const { upload_urls } = await uploadUrlRes.json();
  const signedUploadUrl = upload_urls[audioFile]?.file_url;
  if (!signedUploadUrl) throw new Error('[Batch] No signed upload URL returned');

  // 3. Upload audio binary
  const putRes = await fetch(signedUploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': mimetype, 'x-ms-blob-type': 'BlockBlob' },
    body: buffer,
  });
  if (!putRes.ok) throw new Error(`[Batch] File PUT to storage failed: ${putRes.status}`);

  // 4. Start the job
  const startRes = await fetch(`${BASE}/speech-to-text/job/v1/${job_id}/start`, {
    method: 'POST',
    headers: { ...HEADERS, 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  if (!startRes.ok) throw new Error(`[Batch] Start job failed ${startRes.status}: ${await startRes.text()}`);

  // 5. Poll status
  const MAX_POLLS = 75;
  let outputFilename = null;
  for (let i = 0; i < MAX_POLLS; i++) {
    await new Promise(r => setTimeout(r, 8000));
    const statusRes = await fetch(`${BASE}/speech-to-text/job/v1/${job_id}/status`, { headers: HEADERS });
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

  // 6. Get signed download URL
  const downloadUrlRes = await fetch(`${BASE}/speech-to-text/job/v1/download-files`, {
    method: 'POST',
    headers: { ...HEADERS, 'Content-Type': 'application/json' },
    body: JSON.stringify({ job_id, files: [outputFilename] }),
  });
  if (!downloadUrlRes.ok) throw new Error(`[Batch] Download URL failed ${downloadUrlRes.status}: ${await downloadUrlRes.text()}`);
  const { download_urls } = await downloadUrlRes.json();
  const signedDownloadUrl = download_urls[outputFilename]?.file_url;
  if (!signedDownloadUrl) throw new Error('[Batch] No signed download URL returned');

  // 7. Fetch the result JSON
  const resultRes = await fetch(signedDownloadUrl);
  if (!resultRes.ok) throw new Error(`[Batch] Result download failed: ${resultRes.status}`);
  const result = await resultRes.json();
  return result.transcript || '';
}

// ─── Sarvam LLM ────────────────────────────────────────────────────────────────
async function generateReportsWithLLM(apiKey, transcript, patientName, patientGender, doctorName, date) {
  const salutation = patientGender === 'Female' ? 'Ms' : patientGender === 'Male' ? 'Mr' : 'Mx';
  const today = date || new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  const systemPrompt = `You are a highly trained dental clinical documentation assistant. Respond with valid JSON only.`;

  const userPrompt = `The following is a doctor's dictation of a patient visit.
Patient: ${patientName}
Doctor: ${doctorName}
Date: ${today}

DICTATION:
"""
${transcript}
"""

Generate exactly three clinical documents from this dictation. Return as JSON:
{
  "short_report": "Concise summary...",
  "tmd_template": "Structured template...",
  "patient_letter": "Professional letter..."
}`;

  if (!apiKey) throw new Error('NVIDIA API Key not configured for this tenant.');

  const res = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'moonshotai/kimi-k2-instruct',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 4096,
      temperature: 1.0,
    }),
  });

  if (!res.ok) throw new Error(`LLM API error ${res.status}: ${await res.text()}`);

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || '{}';
  return JSON.parse(content);
}

// ─── Layer 1: Structured autofill extraction LLM ───────────────────────────────
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
      model: 'moonshotai/kimi-k2-instruct',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 4096,
      temperature: 0.3,
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

// ─── POST /api/report/generate ─────────────────────────────────────────────────
export async function generateReport(req, res) {
  const { Patient } = req.tenantModels;
  const credentials = req.tenantConfig;

  try {
    const { patient_id } = req.body;
    if (!patient_id) return res.status(400).json({ error: 'patient_id is required' });

    const directText = (req.body.transcript_text || '').trim();
    if (!req.file && !directText) return res.status(400).json({ error: 'No audio file or transcript text provided' });

    const saveShort  = req.body.save_short_report  !== 'false';
    const saveTmd    = req.body.save_tmd_template   !== 'false';
    const saveLetter = req.body.save_patient_letter !== 'false';
    const runAutofill = req.body.autofill === 'true';

    const patient = await Patient.findById(patient_id);
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    const patientName  = `${patient.first_name} ${patient.last_name || ''}`.trim();
    const doctorName   = req.user?.name || 'Attending Doctor';
    const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

    // 1. Transcribe
    let transcript;
    if (directText) {
      transcript = directText;
    } else {
      transcript = await transcribeAudioBatch(credentials.sarvamApiKey, req.file.buffer, req.file.mimetype, req.file.originalname);
    }
    if (!transcript) return res.status(422).json({ error: 'Transcription returned empty.' });

    // 2. LLM Reports
    const llmOutput = await generateReportsWithLLM(credentials.nvidiaApiKey, transcript, patientName, patient.gender, doctorName, today);

    const {
      short_report   = 'Report not generated.',
      tmd_template   = 'Template not generated.',
      patient_letter = 'Letter not generated.',
    } = llmOutput;

    // 2b. Autofill
    let autofill_v2 = null;
    if (runAutofill) {
      autofill_v2 = await parseAutofillWithLLM(credentials.nvidiaApiKey, transcript);
    }

    // 3. Save to Drive
    const anyToSave = saveShort || saveTmd || saveLetter;
    const drive_links = {};
    const fileRecords = [];

    if (anyToSave) {
      if (!patient.drive_folders?.root) {
        patient.drive_folders = await createPatientDriveFolders(credentials, patient.patientId, patientName);
        await patient.save();
      }

      const clinicalNotesFolderId = patient.drive_folders.clinical_notes;
      if (clinicalNotesFolderId) {
        const dateFolderName = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
        const dateFolderId = await createSubfolder(credentials, clinicalNotesFolderId, dateFolderName);

        const uploads = await Promise.all([
          saveShort  ? uploadTextToDrive(credentials, dateFolderId, short_report,   `Short_Report_${patientName}.txt`)    : null,
          saveTmd    ? uploadTextToDrive(credentials, dateFolderId, tmd_template,   `Clinical_Template_${patientName}.txt`) : null,
          saveLetter ? uploadTextToDrive(credentials, dateFolderId, patient_letter, `Patient_Letter_${patientName}.txt`)  : null,
        ]);

        const [shortFile, templateFile, letterFile] = uploads;

        if (shortFile) {
          drive_links.short_report = shortFile.webViewLink;
          fileRecords.push({ file_name: shortFile.name, category: 'Clinical Notes', drive_file_id: shortFile.id, web_view_link: shortFile.webViewLink, mime_type: 'text/plain' });
        }
        if (templateFile) {
          drive_links.tmd_template = templateFile.webViewLink;
          fileRecords.push({ file_name: templateFile.name, category: 'Clinical Notes', drive_file_id: templateFile.id, web_view_link: templateFile.webViewLink, mime_type: 'text/plain' });
        }
        if (letterFile) {
          drive_links.patient_letter = letterFile.webViewLink;
          fileRecords.push({ file_name: letterFile.name, category: 'Clinical Notes', drive_file_id: letterFile.id, web_view_link: letterFile.webViewLink, mime_type: 'text/plain' });
        }

        if (fileRecords.length > 0) {
          patient.files.push(...fileRecords);
          await patient.save();
        }
      }
    }

    res.json({ transcript, reports: { short_report, tmd_template, patient_letter }, drive_links, autofill_v2 });
  } catch (err) {
    console.error('[Report] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
}
