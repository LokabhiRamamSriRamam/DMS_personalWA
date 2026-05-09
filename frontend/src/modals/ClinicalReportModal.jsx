import { useRef, useState, useEffect, useCallback } from 'react';
import {
  X, Mic, MicOff, Loader2, CheckCircle, ExternalLink,
  FileText, Minimize2, Maximize2, Sparkles, Save, SendHorizonal,
  ChevronDown, Mail, MessageSquare, XCircle, Pause, Play, Edit3,
  RefreshCw,
} from 'lucide-react';
import { openExternal } from '../utils/openExternal';
import API from '../services/api';
import { useAuth } from '../Context/AuthContext.jsx';

function ReportDisplay({ text }) {
  if (!text) return <p className="text-slate-400 italic">Not generated.</p>;
  return (
    <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap font-mono bg-slate-50 rounded-lg p-4 border border-slate-100 overflow-y-auto max-h-[280px]">
      {text}
    </div>
  );
}

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
        checked ? 'bg-[#137fec]' : 'bg-slate-200'
      }`}
    >
      <span className={`inline-block size-4 rounded-full bg-white shadow transition-transform ${
        checked ? 'translate-x-6' : 'translate-x-1'
      }`} />
    </button>
  );
}

// ── Audio waveform visualizer ──────────────────────────────────────────────────
function WaveformBar({ analyserRef, active }) {
  const canvasRef = useRef(null);
  const rafRef    = useRef(null);

  useEffect(() => {
    if (!active || !analyserRef.current) return;
    const analyser = analyserRef.current;
    const canvas   = canvasRef.current;
    if (!canvas) return;
    const ctx    = canvas.getContext('2d');
    const data   = new Uint8Array(analyser.frequencyBinCount);

    function draw() {
      rafRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(data);
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      const bars   = 40;
      const gap    = 2;
      const barW   = (W - gap * (bars - 1)) / bars;
      const step   = Math.floor(data.length / bars);

      for (let i = 0; i < bars; i++) {
        const val    = data[i * step] / 255;
        const height = Math.max(3, val * H);
        const alpha  = 0.4 + val * 0.6;
        ctx.fillStyle = `rgba(19,127,236,${alpha})`;
        ctx.beginPath();
        ctx.roundRect(i * (barW + gap), (H - height) / 2, barW, height, 2);
        ctx.fill();
      }
    }
    draw();
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [active, analyserRef]);

  return (
    <canvas
      ref={canvasRef}
      width={320}
      height={48}
      className={`rounded-lg transition-opacity duration-300 ${active ? 'opacity-100' : 'opacity-0'}`}
      style={{ width: '100%', maxWidth: 320, height: 48 }}
    />
  );
}

const DETAIL_LEVELS = [
  { key: 'brief',    label: 'Brief'    },
  { key: 'standard', label: 'Standard' },
  { key: 'detailed', label: 'Detailed' },
];

export default function ClinicalReportModal({ isOpen, onClose, patientId, patient, onSuccess }) {
  const { user } = useAuth();
  const mediaRecorderRef = useRef(null);
  const audioChunksRef   = useRef([]);
  const cancelledRef     = useRef(false);
  const analyserRef      = useRef(null);
  const audioCtxRef      = useRef(null);
  const streamRef        = useRef(null);

  // stages: idle | recording | paused | transcribing | editing | generating | done
  const [stage, setStage]             = useState('idle');
  const [minimized, setMinimized]     = useState(false);
  const [transcript, setTranscript]   = useState('');
  const [editedTranscript, setEditedTranscript] = useState('');
  const [isEditingTranscript, setIsEditingTranscript] = useState(false);
  const [reportText, setReportText]   = useState('');
  const [streamingText, setStreamingText] = useState('');
  const [driveLinks, setDriveLinks]   = useState({});
  const [autofillData, setAutofillData] = useState(null);
  const [templateId, setTemplateId]   = useState('');
  const [error, setError]             = useState('');
  const [textInput, setTextInput]     = useState('');
  const [jobId, setJobId]             = useState(null);
  const [cachedTranscript, setCachedTranscript] = useState(false);
  const jobPollRef = useRef(null);

  // Template state
  const [templates, setTemplates]           = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [detailLevel, setDetailLevel]       = useState('standard');
  const [saveReport, setSaveReport]         = useState(true);
  const [autofillEnabled, setAutofillEnabled] = useState(false);

  // Share panel state
  const [showEmailPanel, setShowEmailPanel] = useState(false);
  const [showWaPanel, setShowWaPanel]       = useState(false);
  const [emailForm, setEmailForm] = useState({ to: '', subject: '', body: '' });
  const [waForm, setWaForm]       = useState({ to: '', caption: '' });
  const [sending, setSending]     = useState(null);
  const [sendResult, setSendResult] = useState(null);

  // Fetch templates once on first open
  useEffect(() => {
    if (isOpen && templates.length === 0) {
      API.get('/report/templates')
        .then(r => setTemplates(r.data))
        .catch(() => {});
    }
  }, [isOpen]);

  // Media session hardware button (Bluetooth mic pause/resume)
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    if (stage === 'recording' || stage === 'paused') {
      navigator.mediaSession.setActionHandler('pause', () => pauseRecording());
      navigator.mediaSession.setActionHandler('play',  () => resumeRecording());
    } else {
      navigator.mediaSession.setActionHandler('pause', null);
      navigator.mediaSession.setActionHandler('play',  null);
    }
  }, [stage]);

  function resetState() {
    setStage('idle');
    setTranscript('');
    setEditedTranscript('');
    setIsEditingTranscript(false);
    setReportText('');
    setStreamingText('');
    setDriveLinks({});
    setAutofillData(null);
    setTemplateId('');
    setError('');
    setMinimized(false);
    setSelectedTemplate(null);
    setDetailLevel('standard');
    setSaveReport(true);
    setAutofillEnabled(false);
    setTextInput('');
    setJobId(null);
    setCachedTranscript(false);
    setShowEmailPanel(false);
    setShowWaPanel(false);
    setEmailForm({ to: '', subject: '', body: '' });
    setWaForm({ to: '', caption: '' });
    setSending(null);
    setSendResult(null);
    if (jobPollRef.current) { clearInterval(jobPollRef.current); jobPollRef.current = null; }
  }

  function handleClose() {
    if (stage === 'recording' || stage === 'paused') {
      cancelledRef.current = true;
      stopRecording();
    }
    cleanupAudio();
    resetState();
    cancelledRef.current = false;
    onClose();
  }

  function cleanupAudio() {
    if (audioCtxRef.current) { audioCtxRef.current.close(); audioCtxRef.current = null; }
    analyserRef.current = null;
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
  }

  function handleTemplateChange(e) {
    const t = templates.find(tmpl => tmpl.id === e.target.value) || null;
    setSelectedTemplate(t);
  }

  // ── Share panel pre-fill ──────────────────────────────────────────────────────
  function openEmailPanel() {
    const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    const patientName  = patient ? `${patient.first_name} ${patient.last_name || ''}`.trim() : '';
    const patientEmail = patient?.contact?.email || '';
    setEmailForm({
      to:      patientEmail,
      subject: `Your visit summary — ${today}`,
      body:    `Hi ${patientName},\n\nPlease find your visit summary attached.\n\nWarm regards,\n${user?.name || 'Your Doctor'}`,
    });
    setShowEmailPanel(true);
    setShowWaPanel(false);
    setSendResult(null);

    API.get('/email/templates', { params: { event: 'aiReportReady', language: 'en' } })
      .then(res => {
        const active = res.data.find(t => t.isActive);
        if (!active) return;
        const data = {
          name: patientName, firstName: patient?.first_name || patientName,
          doctor: user?.name || 'Your Doctor', doctorName: user?.name || 'Your Doctor',
          date: today, templateName: selectedTemplate?.name || 'Clinical Report',
        };
        const subj = active.subject.replace(/\{\{(\w+)\}\}/g, (_, k) => data[k] ?? `{{${k}}}`);
        const body = active.body.replace(/\{\{(\w+)\}\}/g, (_, k) => data[k] ?? `{{${k}}}`);
        setEmailForm(f => ({ ...f, subject: subj, body }));
      })
      .catch(() => {});
  }

  function openWaPanel() {
    const patientMobile = patient?.contact?.mobile || '';
    const patientName   = patient ? `${patient.first_name} ${patient.last_name || ''}`.trim() : '';
    setWaForm({ to: patientMobile, caption: `Hi ${patientName}, please find your visit summary attached.` });
    setShowWaPanel(true);
    setShowEmailPanel(false);
    setSendResult(null);
  }

  async function handleSendEmail() {
    if (!emailForm.to.trim()) return;
    setSending('email'); setSendResult(null);
    try {
      await API.post('/email/send-report', {
        patient_id: patientId, to: emailForm.to.trim(), subject: emailForm.subject,
        body: emailForm.body, report_text: reportText, template_name: selectedTemplate?.name || 'Clinical Report',
      });
      setSendResult({ channel: 'email', status: 'ok', message: `Email sent to ${emailForm.to}` });
    } catch (err) {
      setSendResult({ channel: 'email', status: 'fail', message: err.response?.data?.error || err.message });
    } finally { setSending(null); }
  }

  async function handleSendWhatsApp() {
    if (!waForm.to.trim()) return;
    setSending('whatsapp'); setSendResult(null);
    try {
      await API.post('/whatsapp/send-report', {
        patient_id: patientId, to: waForm.to.trim(), caption: waForm.caption,
        report_text: reportText, template_name: selectedTemplate?.name || 'Clinical Report',
      });
      setSendResult({ channel: 'whatsapp', status: 'ok', message: `WhatsApp sent to ${waForm.to}` });
    } catch (err) {
      setSendResult({ channel: 'whatsapp', status: 'fail', message: err.response?.data?.error || err.message });
    } finally { setSending(null); }
  }

  // ── Recording ─────────────────────────────────────────────────────────────────
  function pickMimeType() {
    const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg', ''];
    return candidates.find(t => !t || MediaRecorder.isTypeSupported(t)) || '';
  }

  async function startRecording() {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Set up Web Audio analyser for waveform
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current = audioCtx;
      const source  = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      source.connect(analyser);
      analyserRef.current = analyser;

      audioChunksRef.current = [];
      const mimeType = pickMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      recorder.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = () => { stream.getTracks().forEach(t => t.stop()); processRecording(); };
      mediaRecorderRef.current = recorder;
      recorder.start(100); // timeslice 100ms for smoother waveform data
      setStage('recording');

      // MediaSession metadata for Bluetooth mic button
      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({ title: 'Recording — Dental DMS' });
        navigator.mediaSession.playbackState = 'playing';
      }
    } catch {
      setError('Microphone access denied. Please allow microphone permissions and try again.');
    }
  }

  function pauseRecording() {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.pause();
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
      setStage('paused');
    }
  }

  function resumeRecording() {
    if (mediaRecorderRef.current?.state === 'paused') {
      mediaRecorderRef.current.resume();
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
      setStage('recording');
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    cleanupAudio();
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'none';
  }

  function buildFormData(overrides = {}) {
    const fd = new FormData();
    fd.append('patient_id',   patientId);
    fd.append('template_id',  selectedTemplate.id);
    fd.append('detail_level', detailLevel);
    fd.append('save_report',  String(saveReport));
    fd.append('autofill',     String(autofillEnabled));
    Object.entries(overrides).forEach(([k, v]) => fd.append(k, v));
    return fd;
  }

  // ── Consume SSE stream from /api/report/generate ───────────────────────────
  async function consumeGenerateStream(payload) {
    setStage('generating');
    setStreamingText('');

    const token = localStorage.getItem('dms_token');
    const baseURL = API.defaults.baseURL || 'http://localhost:5000/api';
    const response = await fetch(`${baseURL}/report/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP ${response.status}`);
    }

    const reader  = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer  = '';
    let finalData = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop(); // keep incomplete line

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        try {
          const parsed = JSON.parse(trimmed.slice(6));
          if (parsed.error) throw new Error(parsed.error);
          if (parsed.token) {
            setStreamingText(prev => prev + parsed.token);
          }
          if (parsed.done) {
            finalData = parsed;
          }
        } catch (parseErr) {
          if (parseErr.message && !parseErr.message.startsWith('Unexpected')) throw parseErr;
        }
      }
    }
    return finalData;
  }

  async function processRecording() {
    if (cancelledRef.current) return;
    if (audioChunksRef.current.length === 0) return;
    const chunks = [...audioChunksRef.current];
    audioChunksRef.current = [];

    setStage('transcribing');
    setError('');

    try {
      const actualMime = mediaRecorderRef.current?.mimeType || 'audio/webm';
      const ext  = actualMime.startsWith('audio/mp4') ? 'mp4' : actualMime.startsWith('audio/ogg') ? 'ogg' : 'webm';
      const blob = new Blob(chunks, { type: actualMime });
      const fd   = buildFormData();
      fd.append('file', blob, `dictation.${ext}`);

      // POST /transcribe — returns jobId immediately
      const { data: transcribeData } = await API.post('/report/transcribe', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const newJobId = transcribeData.jobId;
      setJobId(newJobId);
      setCachedTranscript(!!transcribeData.cachedTranscript);

      if (transcribeData.status === 'transcribed') {
        // Direct (text input / cached) — skip polling
        await runGeneration(newJobId, null);
        return;
      }

      // Poll for transcription completion
      await new Promise((resolve, reject) => {
        jobPollRef.current = setInterval(async () => {
          try {
            const { data: jobData } = await API.get(`/report/jobs/${newJobId}`);
            if (jobData.status === 'transcribed') {
              clearInterval(jobPollRef.current); jobPollRef.current = null;
              resolve(jobData);
            } else if (jobData.status === 'failed') {
              clearInterval(jobPollRef.current); jobPollRef.current = null;
              reject(new Error(jobData.errorMessage || 'Transcription failed'));
            }
            // else still pending/transcribing — keep polling
          } catch (pollErr) {
            clearInterval(jobPollRef.current); jobPollRef.current = null;
            reject(pollErr);
          }
        }, 5000);
      });

      const { data: jobData } = await API.get(`/report/jobs/${newJobId}`);
      setTranscript(jobData.transcript);
      setEditedTranscript(jobData.transcript);

      // Show transcript for review before generating
      setStage('editing');

    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Unknown error');
      setStage('idle');
      setMinimized(false);
    }
  }

  async function runGeneration(jId, transcriptOverride) {
    const jIdToUse  = jId || jobId;
    try {
      const finalData = await consumeGenerateStream({
        jobId:        jIdToUse,
        template_id:  selectedTemplate?.id,
        detail_level: detailLevel,
        save_report:  String(saveReport),
        autofill:     String(autofillEnabled),
        ...(transcriptOverride != null ? { transcript: transcriptOverride } : {}),
      });

      const generatedText = finalData?.reports?.[finalData?.template_id] || streamingText;
      setReportText(generatedText);
      setStreamingText('');
      setTranscript(finalData?.transcript || transcript);
      setDriveLinks(finalData?.drive_links || {});
      setAutofillData(finalData?.autofill_v2 || null);
      setTemplateId(finalData?.template_id || selectedTemplate?.id || '');
      setIsEditingTranscript(false);
      setStage('done');
      setMinimized(false);

      if (autofillEnabled && finalData?.autofill_v2) await applyAutofill(finalData.autofill_v2);
      onSuccess?.();
    } catch (err) {
      setError(err.message || 'Generation failed');
      setStage('editing');
      setMinimized(false);
    }
  }

  async function processTextInput() {
    if (!textInput.trim()) return;
    setStage('transcribing');
    setError('');
    try {
      const fd = buildFormData({ transcript_text: textInput.trim() });
      const { data: transcribeData } = await API.post('/report/transcribe', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const newJobId = transcribeData.jobId;
      setJobId(newJobId);
      setTranscript(textInput.trim());
      setEditedTranscript(textInput.trim());
      setStage('editing');
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Unknown error');
      setStage('idle');
    }
  }

  async function applyAutofill(payload) {
    const calls = [];
    const patientUpdate = {};
    if (payload.chief_complaint) patientUpdate.chief_complaint = payload.chief_complaint;
    if (payload.dental_history)  patientUpdate.dental_history  = payload.dental_history;
    if (Array.isArray(payload.medical_history) && payload.medical_history.length > 0) {
      const existing = patient?.medical_history || [];
      patientUpdate.medical_history = Array.from(new Set([...existing, ...payload.medical_history]));
    }
    if (Object.keys(patientUpdate).length > 0) calls.push(API.put(`/patients/${patientId}`, patientUpdate));
    if (payload.consultation_note) calls.push(API.post(`/visits/patient/${patientId}/note`, { content: payload.consultation_note }));
    const adviceHtml = payload.advice || (Array.isArray(payload.advices) ? payload.advices.filter(Boolean).join('') : '');
    if (adviceHtml) calls.push(API.post(`/visits/patient/${patientId}/advice`, { content: adviceHtml }));
    if (Array.isArray(payload.treatment_plan) && payload.treatment_plan.length > 0) {
      const treatments = payload.treatment_plan.map(t => ({
        treatment_name: [t.suggested_treatment, t.diagnosis].filter(Boolean).join(' — ') || 'Treatment',
        teeth_numbers: Array.isArray(t.tooth_numbers) ? t.tooth_numbers.map(String) : [],
        cost: Number(t.estimated_price) || 0, qty: 1, status: 'Planned',
      }));
      calls.push(API.post(`/visits/patient/${patientId}/treatments`, { treatments }));
    }
    (payload.medications || []).forEach(m => {
      if (m?.drug_name) {
        calls.push(API.post(`/visits/patient/${patientId}/prescription`, {
          drug_name: m.drug_name, dosage: m.dosage || '',
          duration: m.duration || '', instructions: m.instructions || '',
        }));
      }
    });
    const recallDays = Number(payload.recall?.days_later);
    if (recallDays > 0 && user?._id && patient) {
      const start = new Date(Date.now() + recallDays * 24 * 60 * 60 * 1000);
      start.setHours(10, 0, 0, 0);
      const end = new Date(start.getTime() + 30 * 60 * 1000);
      calls.push(API.post('/appointments', {
        patient_id: patientId, doctor_id: user._id,
        start_time: start.toISOString(), end_time: end.toISOString(),
        title: `Recall - ${patient.first_name || ''} ${patient.last_name || ''}`.trim(),
        type: 'Consultation', status: 'Scheduled', room_number: 'Room 1',
        notes: payload.recall?.notes || 'AI-scheduled recall',
      }));
    }
    if (calls.length === 0) return;
    const results = await Promise.allSettled(calls);
    const failures = results.filter(r => r.status === 'rejected');
    if (failures.length > 0) console.warn('[Autofill] Some endpoints failed:', failures.map(f => f.reason?.message));
  }

  if (!isOpen) return null;

  // ── MINIMIZED PILL ──────────────────────────────────────────────────────────
  if (minimized) {
    const pillLabel =
      stage === 'recording'    ? 'Recording…'         :
      stage === 'paused'       ? 'Paused'             :
      stage === 'transcribing' ? 'Transcribing…'      :
      stage === 'editing'      ? 'Review transcript'  :
      stage === 'generating'   ? 'Generating report…' :
      stage === 'done'         ? 'Report ready'       : 'AI Report';

    const pillColor =
      stage === 'recording'    ? 'bg-red-500'   :
      stage === 'paused'       ? 'bg-amber-500' :
      stage === 'transcribing' ? 'bg-[#137fec]' :
      stage === 'generating'   ? 'bg-[#137fec]' :
      stage === 'done'         ? 'bg-green-600' : 'bg-slate-700';

    return (
      <div
        className={`fixed bottom-6 right-6 z-[400] flex items-center gap-3 px-4 py-3 ${pillColor} text-white rounded-full shadow-2xl cursor-pointer select-none`}
        onClick={() => setMinimized(false)}
      >
        {(stage === 'transcribing' || stage === 'generating')
          ? <Loader2 size={16} className="animate-spin" />
          : stage === 'recording'
          ? <span className="size-2 rounded-full bg-white animate-ping inline-block" />
          : stage === 'done'
          ? <CheckCircle size={16} />
          : <Mic size={16} />}
        <span className="text-sm font-semibold">{pillLabel}</span>
        <Maximize2 size={14} className="opacity-70" />
      </div>
    );
  }

  const canRecord = !!selectedTemplate;

  // ── FULL MODAL ──────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col overflow-hidden max-h-[92vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
              <span className="size-8 rounded-lg bg-[#137fec]/10 flex items-center justify-center">
                <Mic size={16} className="text-[#137fec]" />
              </span>
              AI Clinical Report Generator
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Select a template, then dictate the consultation — the AI will generate the document
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setMinimized(true)} title="Minimize"
              className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
              <Minimize2 size={18} />
            </button>
            <button onClick={handleClose} title="Close"
              className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">

          {/* ── IDLE / RECORDING / PAUSED ── */}
          {(stage === 'idle' || stage === 'recording' || stage === 'paused') && (
            <div className="flex flex-col items-center gap-5">

              {/* Template selector (idle only) */}
              {stage === 'idle' && (
                <div className="w-full max-w-lg space-y-4">
                  <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <FileText size={14} className="text-slate-500" />
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Document Template <span className="text-red-400 normal-case font-semibold">* required</span>
                      </p>
                    </div>
                    <div className="relative">
                      <select
                        value={selectedTemplate?.id || ''}
                        onChange={handleTemplateChange}
                        className="w-full appearance-none bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#137fec] pr-8"
                      >
                        <option value="" disabled>— Select a template —</option>
                        {Array.from(new Set(templates.map(t => t.category))).map(cat => (
                          <optgroup key={cat} label={cat}>
                            {templates.filter(t => t.category === cat).map(t => (
                              <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                    {selectedTemplate && (
                      <p className="text-xs text-slate-500 mt-2 leading-relaxed">{selectedTemplate.description}</p>
                    )}
                  </div>

                  <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Detail Level</p>
                    <div className="flex gap-2">
                      {DETAIL_LEVELS.map(dl => (
                        <button key={dl.key} onClick={() => setDetailLevel(dl.key)}
                          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors border ${
                            detailLevel === dl.key
                              ? 'bg-[#137fec] text-white border-[#137fec]'
                              : 'bg-white text-slate-600 border-slate-200 hover:border-[#137fec] hover:text-[#137fec]'
                          }`}>
                          {dl.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-3 py-1.5 cursor-pointer">
                      <input type="checkbox" checked={saveReport} onChange={e => setSaveReport(e.target.checked)}
                        className="w-4 h-4 rounded accent-[#137fec] cursor-pointer" />
                      <Save size={14} className="text-slate-400" />
                      <span className="text-sm font-medium text-slate-700">Save to Connect Cloud</span>
                    </label>

                    <div onClick={() => setAutofillEnabled(v => !v)}
                      className={`rounded-xl border-2 p-4 cursor-pointer transition-all ${
                        autofillEnabled
                          ? 'border-[#137fec] bg-blue-50/60 shadow-sm shadow-blue-100'
                          : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                      }`}>
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className={`mt-0.5 size-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                            autofillEnabled ? 'bg-[#137fec] text-white' : 'bg-white border border-slate-200 text-slate-400'
                          }`}>
                            <Sparkles size={16} />
                          </div>
                          <div>
                            <p className={`font-semibold text-sm ${autofillEnabled ? 'text-[#137fec]' : 'text-slate-700'}`}>
                              Auto-fill Treatment Page
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                              Consultation note, patient advice, and treatment plan entries will be auto-filled from the dictation.
                            </p>
                          </div>
                        </div>
                        <Toggle checked={autofillEnabled} onChange={setAutofillEnabled} />
                      </div>
                      {autofillEnabled && (
                        <div className="mt-3 pt-3 border-t border-blue-100 flex flex-wrap gap-2">
                          {['Clinical History', 'Notes', 'Advice', 'Treatments', 'Medications', 'Recall'].map(s => (
                            <span key={s} className="text-[11px] bg-[#137fec]/10 text-[#137fec] px-2.5 py-1 rounded-full font-medium">{s}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <p className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-2">Testing — Text Input (skips Sarvam)</p>
                    <textarea value={textInput} onChange={e => setTextInput(e.target.value)}
                      placeholder="Paste or type the consultation transcript here…"
                      rows={4}
                      className="w-full text-sm border border-amber-200 rounded-lg p-3 resize-y focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white placeholder:text-amber-300"
                    />
                    <button onClick={processTextInput} disabled={!textInput.trim() || !canRecord}
                      className="mt-2 w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-amber-500 text-white hover:bg-amber-600">
                      <SendHorizonal size={15} /> Submit Text
                    </button>
                    {!canRecord && (
                      <p className="text-xs text-amber-600 mt-2 text-center">Select a template above to enable submission.</p>
                    )}
                  </div>
                </div>
              )}

              {/* Waveform display (recording only) */}
              {(stage === 'recording' || stage === 'paused') && (
                <div className="w-full max-w-sm flex flex-col items-center gap-2">
                  <WaveformBar analyserRef={analyserRef} active={stage === 'recording'} />
                  {stage === 'paused' && (
                    <p className="text-xs text-amber-600 font-semibold animate-pulse">Recording paused — press Resume to continue</p>
                  )}
                </div>
              )}

              {/* Mic / Pause / Resume buttons */}
              <div className="flex items-center gap-4">
                {/* Main mic button */}
                <button
                  onClick={stage === 'recording' || stage === 'paused' ? stopRecording : startRecording}
                  disabled={stage === 'idle' && !canRecord}
                  className={`relative size-24 rounded-full flex items-center justify-center shadow-xl transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed ${
                    stage === 'recording'
                      ? 'bg-red-500 hover:bg-red-600 shadow-red-300'
                      : stage === 'paused'
                      ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-300'
                      : 'bg-[#137fec] hover:bg-blue-600 shadow-blue-300'
                  }`}
                >
                  {stage === 'recording' && (
                    <>
                      <span className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-40" />
                      <span className="absolute inset-[-8px] rounded-full border-2 border-red-300 animate-pulse" />
                    </>
                  )}
                  {stage === 'recording' || stage === 'paused'
                    ? <MicOff size={36} className="text-white" />
                    : <Mic    size={36} className="text-white" />}
                </button>

                {/* Pause / Resume (only while recording/paused) */}
                {(stage === 'recording' || stage === 'paused') && (
                  <button
                    onClick={stage === 'recording' ? pauseRecording : resumeRecording}
                    className={`size-14 rounded-full flex items-center justify-center shadow-lg transition-all ${
                      stage === 'paused'
                        ? 'bg-green-500 hover:bg-green-600 text-white'
                        : 'bg-white border-2 border-amber-400 text-amber-500 hover:bg-amber-50'
                    }`}
                    title={stage === 'recording' ? 'Pause recording' : 'Resume recording'}
                  >
                    {stage === 'recording' ? <Pause size={22} /> : <Play size={22} />}
                  </button>
                )}
              </div>

              <div className="text-center">
                {stage === 'idle' ? (
                  <>
                    <p className={`font-semibold text-base ${canRecord ? 'text-slate-700' : 'text-slate-400'}`}>
                      {canRecord ? 'Click to start recording' : 'Select a template to start'}
                    </p>
                    {canRecord && (
                      <p className="text-slate-400 text-sm mt-1">
                        Dictate the patient history, examination findings,<br />
                        diagnosis, and management plan in one go.
                      </p>
                    )}
                  </>
                ) : stage === 'paused' ? (
                  <p className="text-amber-600 font-semibold text-base">Paused — tap Resume or the mic button (Stop)</p>
                ) : (
                  <>
                    <p className="text-red-600 font-semibold text-base animate-pulse">Recording… speak clearly</p>
                    <p className="text-slate-400 text-sm mt-1">
                      Use Pause to take a break. Click Stop (mic) when fully done.
                    </p>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ── TRANSCRIBING ── */}
          {stage === 'transcribing' && (
            <div className="flex flex-col items-center gap-5 py-10">
              <Loader2 size={52} className="text-[#137fec] animate-spin" />
              <div className="text-center">
                <p className="text-slate-700 font-semibold text-base">Transcribing audio…</p>
                <p className="text-slate-400 text-sm mt-1">Sarvam is processing your dictation. This may take a minute.</p>
              </div>
            </div>
          )}

          {/* ── EDITING (transcript review) ── */}
          {stage === 'editing' && (
            <div className="flex flex-col gap-4">
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle size={15} className="text-green-600" />
                    <p className="text-sm font-semibold text-green-700">
                      Transcript ready{cachedTranscript ? ' (cached from today\'s visit)' : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => setIsEditingTranscript(v => !v)}
                    className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 px-2 py-1 rounded border border-slate-200 hover:bg-slate-50 transition-colors"
                  >
                    <Edit3 size={11} /> {isEditingTranscript ? 'Done editing' : 'Edit'}
                  </button>
                </div>
                {isEditingTranscript ? (
                  <textarea
                    value={editedTranscript}
                    onChange={e => setEditedTranscript(e.target.value)}
                    rows={6}
                    className="w-full text-sm border border-green-200 rounded-lg p-3 resize-y focus:outline-none focus:ring-2 focus:ring-green-300 bg-white"
                    placeholder="Edit the transcript if needed, then click Generate…"
                  />
                ) : (
                  <p className="text-sm text-slate-600 leading-relaxed line-clamp-5">{editedTranscript || transcript}</p>
                )}
              </div>

              <button
                onClick={() => runGeneration(jobId, isEditingTranscript ? editedTranscript : undefined)}
                disabled={!(editedTranscript || transcript)}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-[#137fec] hover:bg-blue-600 text-white font-semibold rounded-xl transition-colors disabled:opacity-40"
              >
                <Sparkles size={16} /> Generate {selectedTemplate?.name || 'Report'}
              </button>
            </div>
          )}

          {/* ── GENERATING (streaming) ── */}
          {stage === 'generating' && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3 py-4">
                <Loader2 size={28} className="text-[#137fec] animate-spin flex-shrink-0" />
                <div>
                  <p className="text-slate-700 font-semibold text-sm">Generating {selectedTemplate?.name || 'report'}…</p>
                  <p className="text-slate-400 text-xs mt-0.5">
                    {autofillEnabled ? 'Will auto-fill treatment page after generation.' : 'Saving to Connect Cloud after generation.'}
                  </p>
                </div>
              </div>
              {streamingText && (
                <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap font-mono bg-slate-50 rounded-lg p-4 border border-slate-100 overflow-y-auto max-h-[300px]">
                  {streamingText}
                  <span className="inline-block w-0.5 h-4 bg-[#137fec] ml-0.5 animate-pulse" />
                </div>
              )}
            </div>
          )}

          {/* ── DONE ── */}
          {stage === 'done' && (
            <>
              {transcript && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <CheckCircle size={15} className="text-green-600" />
                      <p className="text-sm font-semibold text-green-700">Transcript</p>
                    </div>
                    {jobId && (
                      <button
                        onClick={() => { setIsEditingTranscript(false); setEditedTranscript(transcript); setStage('editing'); }}
                        className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 px-2 py-1 rounded border border-slate-200 hover:bg-slate-50 transition-colors"
                      >
                        <RefreshCw size={11} /> Regenerate
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed line-clamp-3">{transcript}</p>
                </div>
              )}

              {driveLinks[templateId] && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <p className="text-sm font-semibold mb-2 flex items-center gap-1.5 text-slate-700">
                    <Save size={14} /> Saved to Connect Cloud
                  </p>
                  <button
                    onClick={() => openExternal(driveLinks[templateId])}
                    className="text-xs flex items-center gap-1 text-blue-600 hover:text-blue-800 underline underline-offset-2"
                  >
                    <ExternalLink size={11} /> {selectedTemplate?.name || 'Report'}
                  </button>
                </div>
              )}

              {autofillEnabled && autofillData && (
                <div className="bg-[#137fec]/5 border border-[#137fec]/20 rounded-xl p-4">
                  <p className="text-sm font-semibold text-[#137fec] flex items-center gap-1.5 mb-1">
                    <Sparkles size={14} /> Treatment Page Auto-filled
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {autofillData.chief_complaint && (
                      <span className="text-[11px] bg-[#137fec]/10 text-[#137fec] px-2.5 py-1 rounded-full font-medium flex items-center gap-1"><CheckCircle size={10} /> Chief Complaint</span>
                    )}
                    {autofillData.medical_history?.length > 0 && (
                      <span className="text-[11px] bg-[#137fec]/10 text-[#137fec] px-2.5 py-1 rounded-full font-medium flex items-center gap-1"><CheckCircle size={10} /> Medical History</span>
                    )}
                    {autofillData.consultation_note && (
                      <span className="text-[11px] bg-[#137fec]/10 text-[#137fec] px-2.5 py-1 rounded-full font-medium flex items-center gap-1"><CheckCircle size={10} /> Consultation Note</span>
                    )}
                    {(autofillData.advice || autofillData.advices?.length > 0) && (
                      <span className="text-[11px] bg-[#137fec]/10 text-[#137fec] px-2.5 py-1 rounded-full font-medium flex items-center gap-1"><CheckCircle size={10} /> Advice</span>
                    )}
                    {autofillData.treatment_plan?.length > 0 && (
                      <span className="text-[11px] bg-[#137fec]/10 text-[#137fec] px-2.5 py-1 rounded-full font-medium flex items-center gap-1"><CheckCircle size={10} /> {autofillData.treatment_plan.length} Treatment{autofillData.treatment_plan.length > 1 ? 's' : ''}</span>
                    )}
                    {autofillData.medications?.length > 0 && (
                      <span className="text-[11px] bg-[#137fec]/10 text-[#137fec] px-2.5 py-1 rounded-full font-medium flex items-center gap-1"><CheckCircle size={10} /> {autofillData.medications.length} Medication{autofillData.medications.length > 1 ? 's' : ''}</span>
                    )}
                    {Number(autofillData.recall?.days_later) > 0 && (
                      <span className="text-[11px] bg-[#137fec]/10 text-[#137fec] px-2.5 py-1 rounded-full font-medium flex items-center gap-1"><CheckCircle size={10} /> Recall in {autofillData.recall.days_later}d</span>
                    )}
                  </div>
                </div>
              )}

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <FileText size={15} className="text-slate-500" />
                  <p className="text-sm font-semibold text-slate-700">{selectedTemplate?.name || 'Generated Report'}</p>
                  {selectedTemplate?.type && (
                    <span className="text-[11px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{selectedTemplate.type}</span>
                  )}
                </div>
                <ReportDisplay text={reportText} />
              </div>

              {/* Share Panel */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
                  <p className="text-sm font-semibold text-slate-700">Share with Patient</p>
                  <div className="flex gap-2">
                    <button onClick={openEmailPanel}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                        showEmailPanel ? 'bg-[#137fec] text-white' : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                      }`}>
                      <Mail size={13} /> Email
                    </button>
                    <button onClick={openWaPanel}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                        showWaPanel ? 'bg-green-600 text-white' : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                      }`}>
                      <MessageSquare size={13} /> WhatsApp
                    </button>
                  </div>
                </div>

                {sendResult && (
                  <div className={`px-4 py-2.5 text-sm flex items-center gap-2 ${
                    sendResult.status === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                  }`}>
                    {sendResult.status === 'ok' ? <CheckCircle size={14} /> : <XCircle size={14} />}
                    {sendResult.message}
                  </div>
                )}

                {showEmailPanel && (
                  <div className="p-4 space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-500 block mb-1">To</label>
                      <input type="email" value={emailForm.to} onChange={e => setEmailForm(f => ({ ...f, to: e.target.value }))}
                        placeholder="patient@example.com"
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#137fec] outline-none" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 block mb-1">Subject</label>
                      <input type="text" value={emailForm.subject} onChange={e => setEmailForm(f => ({ ...f, subject: e.target.value }))}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#137fec] outline-none" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 block mb-1">Message</label>
                      <textarea value={emailForm.body} onChange={e => setEmailForm(f => ({ ...f, body: e.target.value }))} rows={3}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#137fec] outline-none resize-none" />
                    </div>
                    <p className="text-xs text-slate-400">
                      Attachment: {selectedTemplate?.name || 'Report'}_{(patient?.first_name || 'patient')}_{new Date().toISOString().slice(0,10)}.pdf
                    </p>
                    <div className="flex gap-2">
                      <button onClick={handleSendEmail} disabled={!emailForm.to.trim() || sending === 'email'}
                        className="flex items-center gap-1.5 px-4 py-2 bg-[#137fec] hover:bg-blue-600 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-60">
                        {sending === 'email' ? <Loader2 size={13} className="animate-spin" /> : <Mail size={13} />}
                        {sending === 'email' ? 'Sending…' : 'Send Email'}
                      </button>
                      <button onClick={() => setShowEmailPanel(false)}
                        className="px-3 py-2 text-xs font-semibold text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {showWaPanel && (
                  <div className="p-4 space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-500 block mb-1">To (with country code)</label>
                      <input type="tel" value={waForm.to} onChange={e => setWaForm(f => ({ ...f, to: e.target.value }))}
                        placeholder="+919876543210"
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#137fec] outline-none" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 block mb-1">Caption</label>
                      <textarea value={waForm.caption} onChange={e => setWaForm(f => ({ ...f, caption: e.target.value }))} rows={2}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#137fec] outline-none resize-none" />
                    </div>
                    <p className="text-xs text-slate-400">
                      Attachment: {selectedTemplate?.name || 'Report'}_{(patient?.first_name || 'patient')}_{new Date().toISOString().slice(0,10)}.pdf
                    </p>
                    <div className="flex gap-2">
                      <button onClick={handleSendWhatsApp} disabled={!waForm.to.trim() || sending === 'whatsapp'}
                        className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-60">
                        {sending === 'whatsapp' ? <Loader2 size={13} className="animate-spin" /> : <MessageSquare size={13} />}
                        {sending === 'whatsapp' ? 'Sending…' : 'Send via WhatsApp'}
                      </button>
                      <button onClick={() => setShowWaPanel(false)}
                        className="px-3 py-2 text-xs font-semibold text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {!showEmailPanel && !showWaPanel && !sendResult && (
                  <div className="px-4 py-3 text-xs text-slate-400 text-center">
                    Choose a channel above to send the report to the patient.
                  </div>
                )}
              </div>
            </>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50">
          <p className="text-xs text-slate-400">
            {stage === 'done'
              ? 'Scroll down on the treatment page to see the updated sections'
              : stage === 'editing'
              ? 'Review or edit the transcript, then click Generate'
              : 'You can minimize this window while recording or processing'}
          </p>
          <div className="flex gap-3">
            {stage === 'done' && (
              <button onClick={resetState}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                Record Again
              </button>
            )}
            <button onClick={handleClose}
              className="px-5 py-2 text-sm font-medium text-white bg-[#137fec] rounded-lg hover:bg-blue-600 transition-colors">
              {stage === 'done' ? 'Done' : 'Close'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
