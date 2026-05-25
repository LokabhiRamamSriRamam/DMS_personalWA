import { useRef, useState, useEffect, useCallback } from 'react';
import {
  X, Mic, MicOff, Loader2, CheckCircle, ExternalLink,
  FileText, Minimize2, Maximize2, Sparkles, Save, SendHorizonal,
  ChevronDown, Mail, MessageSquare, XCircle, Pause, Play, Edit3,
  RefreshCw, Headphones, HelpCircle,
} from 'lucide-react';
import { openExternal } from '../utils/openExternal';
import API from '../services/api';
import { useAuth } from '../Context/AuthContext.jsx';

// Substitute {{placeholder}} tokens; unknown tokens collapse to ''.
export function applyVars(str, vars) {
  if (typeof str !== 'string') return '';
  return str.replace(/\{\{(\w+)\}\}/g, (_, k) => (vars[k] ?? ''));
}

// Build the variable map used for report-delivery templates.
export function reportDeliveryVars(patient, user, selectedTemplate) {
  const patientName = patient ? `${patient.first_name} ${patient.last_name || ''}`.trim() : '';
  return {
    patientName,
    firstName:    patient?.first_name || patientName,
    doctorName:   user?.name || 'Your Doctor',
    clinicName:   user?.clinicName || user?.tenantName || '',
    date:         new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
    templateName: selectedTemplate?.name || 'clinical report',
  };
}

// Parse a backend error — may be a JSON-serialized classified error or a plain string.
function parseError(raw) {
  if (!raw) return null;
  try {
    const obj = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (obj && obj.source && obj.userMessage) return obj;
  } catch { /* not JSON */ }
  return { source: 'unknown', code: 'unknown', userMessage: raw, detail: raw };
}

const SOURCE_LABEL = { sarvam: 'Connect Transcribe', nvidia: 'Molaris.ai', unknown: 'Error' };
const CODE_COLOR   = {
  auth:       'bg-amber-50 border-amber-200 text-amber-800',
  rate_limit: 'bg-orange-50 border-orange-200 text-orange-800',
  timeout:    'bg-blue-50  border-blue-200  text-blue-800',
  config:     'bg-amber-50 border-amber-200 text-amber-800',
  server:     'bg-red-50   border-red-200   text-red-700',
  empty:      'bg-yellow-50 border-yellow-200 text-yellow-800',
  unknown:    'bg-red-50   border-red-200   text-red-700',
};

function ErrorBadge({ error }) {
  const [expanded, setExpanded] = useState(false);
  const parsed = parseError(error);
  if (!parsed) return null;
  const colors = CODE_COLOR[parsed.code] || CODE_COLOR.unknown;
  const sourceLabel = SOURCE_LABEL[parsed.source] || 'Error';
  const showDetail  = parsed.detail && parsed.detail !== parsed.userMessage;

  return (
    <div className={`border rounded-lg px-4 py-3 text-sm ${colors}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 min-w-0">
          <XCircle size={15} className="mt-0.5 flex-shrink-0" />
          <span>{parsed.userMessage}</span>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-black/10 uppercase tracking-wide">
            {sourceLabel}
          </span>
          {showDetail && (
            <button
              onClick={() => setExpanded(v => !v)}
              className="text-[10px] underline opacity-60 hover:opacity-100"
            >
              {expanded ? 'hide' : 'details'}
            </button>
          )}
        </div>
      </div>
      {expanded && showDetail && (
        <pre className="mt-2 text-[10px] opacity-70 whitespace-pre-wrap break-all font-mono border-t border-current/20 pt-2">
          {parsed.detail}
        </pre>
      )}
    </div>
  );
}

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

export default function ClinicalReportModal({ isOpen, onClose, patientId, appointmentId, patient, onSuccess }) {
  const { user } = useAuth();
  const mediaRecorderRef  = useRef(null);
  const audioChunksRef    = useRef([]);
  const cancelledRef      = useRef(false);
  const analyserRef       = useRef(null);
  const audioCtxRef       = useRef(null);
  const streamRef         = useRef(null);
  const audioPlaybackRef  = useRef(null);   // <audio> element for preview
  const playbackUrlRef    = useRef(null);   // ObjectURL — always revoke before replacing
  const isGeneratingRef   = useRef(false);  // synchronous lock — blocks double-submit before state updates
  const generateAbortRef  = useRef(null);   // AbortController for the in-flight generate stream

  // stages: idle | recording | paused | transcribing | editing | generating | done
  const [stage, setStage]             = useState('idle');
  const [minimized, setMinimized]     = useState(false);
  const [transcript, setTranscript]   = useState('');
  const [editedTranscript, setEditedTranscript] = useState('');
  const [isEditingTranscript, setIsEditingTranscript] = useState(false);
  const [reportText, setReportText]   = useState('');
  const [isEditingReport, setIsEditingReport] = useState(false);
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

  // Playback preview state
  const [playbackUrl, setPlaybackUrl]       = useState(null);
  const [isPlayingBack, setIsPlayingBack]   = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0); // seconds
  const [playbackDuration, setPlaybackDuration] = useState(0); // seconds

  // Delivery panel state (Approve & Send)
  const [emailForm, setEmailForm] = useState({ to: '', subject: '', body: '' });
  const [deliver, setDeliver]               = useState({ cloud: true, email: false, whatsapp: false });
  const [waForm, setWaForm]                 = useState({ to: '', text: '' });
  const [delivering, setDelivering]         = useState(false);
  const [deliverResults, setDeliverResults] = useState({});

  // Fetch templates once on first open
  useEffect(() => {
    if (isOpen && templates.length === 0) {
      console.log('[ClinicalReportModal] Fetching templates');
      API.get('/report/templates')
        .then(r => {
          console.log('[ClinicalReportModal] Templates loaded:', r.data.length, 'templates');
          setTemplates(r.data);
        })
        .catch(err => {
          console.error('[ClinicalReportModal] Failed to load templates:', err.message);
        });
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

  function fmtTime(secs) {
    const s = Math.floor(secs || 0);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }

  function revokePlaybackUrl() {
    if (playbackUrlRef.current) {
      URL.revokeObjectURL(playbackUrlRef.current);
      playbackUrlRef.current = null;
    }
    setPlaybackUrl(null);
    setIsPlayingBack(false);
    setPlaybackProgress(0);
    setPlaybackDuration(0);
  }

  function resetState() {
    setStage('idle');
    setTranscript('');
    setEditedTranscript('');
    setIsEditingTranscript(false);
    setReportText('');
    setIsEditingReport(false);
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
    setEmailForm({ to: '', subject: '', body: '' });
    setDeliver({ cloud: true, email: false, whatsapp: false });
    setWaForm({ to: '', text: '' });
    setDelivering(false);
    setDeliverResults({});
    revokePlaybackUrl();
    if (jobPollRef.current) { clearInterval(jobPollRef.current); jobPollRef.current = null; }
    if (generateAbortRef.current) { generateAbortRef.current.abort(); generateAbortRef.current = null; }
    isGeneratingRef.current = false;
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
    if (audioPlaybackRef.current) { audioPlaybackRef.current.pause(); audioPlaybackRef.current.src = ''; }
    revokePlaybackUrl();
    if (audioCtxRef.current) { audioCtxRef.current.close(); audioCtxRef.current = null; }
    analyserRef.current = null;
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
  }

  function handleTemplateChange(e) {
    const t = templates.find(tmpl => tmpl.id === e.target.value) || null;
    setSelectedTemplate(t);
  }


  // ── Prefill the delivery forms once the report is ready ─────────────────────────
  useEffect(() => {
    if (stage !== 'done') return;
    console.log('[deliverySetup] Report ready, fetching delivery settings');

    const patientName  = patient ? `${patient.first_name} ${patient.last_name || ''}`.trim() : '';
    const patientEmail = patient?.contact?.email  || '';
    const patientPhone = patient?.contact?.mobile || '';

    const vars = reportDeliveryVars(patient, user, selectedTemplate);

    setEmailForm({ to: patientEmail, subject: '', body: '' });
    setWaForm({ to: patientPhone, text: '' });
    setDeliverResults({});

    // Pull the tenant's unified Report Delivery templates + defaults, then
    // substitute placeholders for this patient/doctor/report.
    API.get('/report/delivery-settings')
      .then(res => {
        console.log('[deliverySetup] Delivery settings loaded:', res.data);
        const s = res.data || {};
        setEmailForm(f => ({
          ...f,
          subject: applyVars(s.email?.subject || 'Your visit summary — {{date}}', vars),
          body:    applyVars(s.email?.body    || 'Hi {{patientName}},\n\nPlease find your {{templateName}} attached.\n\nWarm regards,\n{{doctorName}}', vars),
        }));
        setWaForm(f => ({
          ...f,
          text: applyVars(s.whatsapp?.text || 'Hi {{patientName}}, please find your {{templateName}} from {{doctorName}}.', vars),
        }));
        setDeliver({
          cloud:    s.defaults?.cloud    ?? true,
          email:    s.defaults?.email    ?? false,
          whatsapp: s.defaults?.whatsapp ?? false,
        });
      })
      .catch(err => {
        console.error('[deliverySetup] Failed to load delivery settings:', err.message);
        // Fallback if settings can't load — sensible substituted defaults.
        setEmailForm(f => ({ ...f,
          subject: applyVars('Your visit summary — {{date}}', vars),
          body:    applyVars('Hi {{patientName}},\n\nPlease find your {{templateName}} attached.\n\nWarm regards,\n{{doctorName}}', vars),
        }));
        setWaForm(f => ({ ...f, text: applyVars('Hi {{patientName}}, please find your {{templateName}} from {{doctorName}}.', vars) }));
        setDeliver({ cloud: true, email: false, whatsapp: false });
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  // ── Approve & Send: run each ticked channel, collect per-channel results ────────
  async function handleCancelGeneration() {
    if (generateAbortRef.current) {
      generateAbortRef.current.abort();
      generateAbortRef.current = null;
    }
    isGeneratingRef.current = false;
    if (jobId) {
      try { await API.patch(`/report/jobs/${jobId}/cancel`); } catch { /* ignore */ }
    }
    setStage('editing');
  }

  async function handleApproveAndSend() {
    console.log('[handleApproveAndSend] Starting delivery. Channels:', deliver);
    setDelivering(true);
    const results = {};
    let cloudLink = driveLinks[templateId] || '';

    if (deliver.cloud) {
      console.log('[handleApproveAndSend] Saving to cloud. CloudLink exists:', !!cloudLink);
      try {
        if (cloudLink) {
          console.log('[handleApproveAndSend] Report already saved to cloud:', cloudLink);
          results.cloud = { status: 'ok', message: 'Already saved to Connect Cloud' };
        } else {
          console.log('[handleApproveAndSend] Posting to /report/jobs/' + jobId + '/save-to-drive');
          const { data } = await API.post(`/report/jobs/${jobId}/save-to-drive`, { report_text: reportText });
          console.log('[handleApproveAndSend] Cloud save response:', data);
          cloudLink = data.webViewLink;
          setDriveLinks(d => ({ ...d, [data.templateId || templateId]: data.webViewLink }));
          results.cloud = { status: 'ok', message: 'Saved to Connect Cloud' };
        }
      } catch (err) {
        console.error('[handleApproveAndSend] Cloud save failed:', err.response?.data || err.message);
        results.cloud = { status: 'fail', message: err.response?.data?.error || err.message };
      }
    }

    if (deliver.email) {
      console.log('[handleApproveAndSend] Sending email to:', emailForm.to);
      if (!emailForm.to.trim()) {
        console.warn('[handleApproveAndSend] Email recipient empty');
        results.email = { status: 'fail', message: 'Patient email is required.' };
      } else {
        try {
          console.log('[handleApproveAndSend] Posting to /email/send-report');
          await API.post('/email/send-report', {
            patient_id:    patientId,
            to:            emailForm.to.trim(),
            subject:       emailForm.subject,
            body:          emailForm.body,
            report_text:   reportText,
            template_name: selectedTemplate?.name || 'Clinical Report',
          });
          console.log('[handleApproveAndSend] Email sent successfully');
          results.email = { status: 'ok', message: `Emailed to ${emailForm.to.trim()}` };
        } catch (err) {
          console.error('[handleApproveAndSend] Email send failed:', err.response?.data || err.message);
          results.email = { status: 'fail', message: err.response?.data?.error || err.message };
        }
      }
    }

    if (deliver.whatsapp) {
      console.log('[handleApproveAndSend] Sending WhatsApp to:', waForm.to);
      if (!waForm.to.trim()) {
        console.warn('[handleApproveAndSend] WhatsApp recipient empty');
        results.whatsapp = { status: 'fail', message: 'Patient phone is required.' };
      } else {
        try {
          console.log('[handleApproveAndSend] Posting to /email/send-whatsapp-documents');
          await API.post('/email/send-whatsapp-documents', {
            patient_id: patientId,
            phone:      waForm.to.trim(),
            include:    ['ai_report'],
            job_id:     jobId,
            message:    waForm.text || undefined,
          });
          console.log('[handleApproveAndSend] WhatsApp sent successfully');
          results.whatsapp = { status: 'ok', message: `Sent on WhatsApp to ${waForm.to.trim()}` };
        } catch (err) {
          console.error('[handleApproveAndSend] WhatsApp send failed:', err.response?.data || err.message);
          results.whatsapp = { status: 'fail', message: err.response?.data?.message || err.response?.data?.error || err.message };
        }
      }
    }

    console.log('[handleApproveAndSend] Delivery complete. Results:', results);
    setDeliverResults(results);
    setDelivering(false);
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
      let recorder;
      try {
        recorder = (mimeType !== null && mimeType !== '')
          ? new MediaRecorder(stream, { mimeType })
          : new MediaRecorder(stream);
      } catch {
        recorder = new MediaRecorder(stream);
      }
      recorder.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = () => { stream.getTracks().forEach(t => t.stop()); processRecording(); };
      mediaRecorderRef.current = recorder;
      recorder.start(100);
      setStage('recording');

      // Detect interruptions (incoming call, hardware loss)
      const track = stream.getAudioTracks()[0];
      if (track) {
        track.onmute  = () => setError('⚠️ Microphone paused — was there an incoming call? Your recording is on hold. Tap Pause then Resume, or Stop to process what was captured.');
        track.onunmute = () => setError('');
        track.onended = () => {
          // Stream was taken away — stop and process whatever we have
          if (mediaRecorderRef.current?.state === 'recording' || mediaRecorderRef.current?.state === 'paused') {
            try { mediaRecorderRef.current.stop(); } catch { /* ignore */ }
          }
          setError('Recording interrupted — your microphone was disconnected (incoming call?). Processing audio captured so far…');
        };
      }

      // MediaSession metadata for Bluetooth mic button
      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({ title: 'Recording — Dental DMS' });
        navigator.mediaSession.playbackState = 'playing';
      }
    } catch (err) {
      const name = err?.name || '';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setError('Microphone access was denied. Please allow microphone permissions in your browser settings and try again.');
      } else if (name === 'NotFoundError') {
        setError('No microphone found. Please connect a microphone and try again.');
      } else if (name === 'NotReadableError') {
        setError('Microphone is in use by another app. Close it and try again.');
      } else {
        setError('Could not access the microphone. Please try again.');
      }
    }
  }

  function pauseRecording() {
    if (mediaRecorderRef.current?.state !== 'recording') return;

    // Flush any buffered data before pausing so preview blob is complete
    try { mediaRecorderRef.current.requestData(); } catch { /* not supported on all browsers */ }
    mediaRecorderRef.current.pause();
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
    setStage('paused');

    // Build preview blob after a short wait for the requestData flush
    setTimeout(() => {
      const chunks = [...audioChunksRef.current];
      if (chunks.length === 0) return;
      const mime = mediaRecorderRef.current?.mimeType || 'audio/webm';
      revokePlaybackUrl(); // discard any previous preview
      const blob = new Blob(chunks, { type: mime });
      const url  = URL.createObjectURL(blob);
      playbackUrlRef.current = url;
      setPlaybackUrl(url);
    }, 150);
  }

  function resumeRecording() {
    // Stop playback first if the user is listening
    if (audioPlaybackRef.current) {
      audioPlaybackRef.current.pause();
      audioPlaybackRef.current.currentTime = 0;
    }
    setIsPlayingBack(false);

    if (mediaRecorderRef.current?.state === 'paused') {
      mediaRecorderRef.current.resume();
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
      setStage('recording');
    }
  }

  function togglePlayback() {
    const audio = audioPlaybackRef.current;
    if (!audio) return;
    if (isPlayingBack) {
      audio.pause();
      setIsPlayingBack(false);
    } else {
      audio.play().catch(() => {}); // iOS may reject if not from gesture — button tap satisfies this
      setIsPlayingBack(true);
    }
  }

  function seekPlayback(e) {
    const audio = audioPlaybackRef.current;
    if (!audio || !playbackDuration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audio.currentTime = ratio * playbackDuration;
    setPlaybackProgress(audio.currentTime);
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
    if (appointmentId) fd.append('appointment_id', appointmentId);
    Object.entries(overrides).forEach(([k, v]) => fd.append(k, v));
    return fd;
  }

  // ── Consume SSE stream from /api/report/generate ───────────────────────────
  async function consumeGenerateStream(payload, signal) {
    setStage('generating');
    setStreamingText('');

    const token = localStorage.getItem('dms_token');
    const baseURL = API.defaults.baseURL || 'http://localhost:5000/api';
    const generateUrl = `${baseURL}/report/generate`;

    console.log('[generateStream] Starting report generation');
    console.log('[generateStream] URL:', generateUrl);
    console.log('[generateStream] Payload:', payload);
    console.log('[generateStream] Token present:', !!token);

    const response = await fetch(generateUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
      signal,
    });

    console.log('[generateStream] Response status:', response.status);
    console.log('[generateStream] Response ok:', response.ok);
    console.log('[generateStream] Content-Type:', response.headers.get('content-type'));

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      console.error('[generateStream] HTTP Error:', response.status, errData);
      throw new Error(errData.error || `HTTP ${response.status}`);
    }

    const reader  = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer  = '';
    let finalData = null;
    let totalTokens = 0;

    while (true) {
      try {
        const { done, value } = await reader.read();
        if (done) {
          console.log('[generateStream] Stream ended. Total tokens:', totalTokens);
          break;
        }
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // keep incomplete line

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;
          try {
            const parsed = JSON.parse(trimmed.slice(6));
            console.log('[generateStream] Received data:', parsed);

            if (parsed.error) {
              console.error('[generateStream] Error in stream:', parsed.error);
              throw new Error(parsed.error);
            }
            if (parsed.token) {
              totalTokens++;
              setStreamingText(prev => prev + parsed.token);
            }
            if (parsed.done) {
              console.log('[generateStream] Completion data received:', parsed);
              finalData = parsed;
            }
          } catch (parseErr) {
            console.error('[generateStream] Parse error:', parseErr.message, 'Line:', trimmed);
            if (parseErr.message && !parseErr.message.startsWith('Unexpected')) throw parseErr;
          }
        }
      } catch (readErr) {
        console.error('[generateStream] Read error:', readErr);
        throw readErr;
      }
    }
    return finalData;
  }

  async function processRecording() {
    if (cancelledRef.current) return;
    if (audioChunksRef.current.length === 0) {
      console.warn('[processRecording] No audio chunks');
      return;
    }
    const chunks = [...audioChunksRef.current];
    audioChunksRef.current = [];

    console.log('[processRecording] Starting transcription. Audio chunks:', chunks.length);
    setStage('transcribing');
    setError('');

    try {
      const actualMime = mediaRecorderRef.current?.mimeType || 'audio/webm';
      const ext  = actualMime.startsWith('audio/mp4') ? 'mp4' : actualMime.startsWith('audio/ogg') ? 'ogg' : 'webm';
      const blob = new Blob(chunks, { type: actualMime });
      console.log('[processRecording] Audio blob size:', blob.size, 'MIME:', actualMime);

      const fd   = buildFormData();
      fd.append('file', blob, `dictation.${ext}`);

      // POST /transcribe — returns jobId immediately
      console.log('[processRecording] Posting to /report/transcribe');
      const { data: transcribeData } = await API.post('/report/transcribe', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const newJobId = transcribeData.jobId;
      console.log('[processRecording] Transcribe response:', transcribeData);
      setJobId(newJobId);
      setCachedTranscript(!!transcribeData.cachedTranscript);

      if (transcribeData.status === 'transcribed') {
        // Direct (text input / cached) — skip polling
        console.log('[processRecording] Transcript cached/direct. Running generation immediately');
        await runGeneration(newJobId, null);
        return;
      }

      // Poll for transcription completion
      console.log('[processRecording] Starting polling for transcription completion');
      await new Promise((resolve, reject) => {
        let pollCount = 0;
        jobPollRef.current = setInterval(async () => {
          try {
            pollCount++;
            console.log('[processRecording] Poll #' + pollCount + ' for jobId:', newJobId);
            const { data: jobData } = await API.get(`/report/jobs/${newJobId}`);
            console.log('[processRecording] Poll response status:', jobData.status);

            if (jobData.status === 'transcribed') {
              clearInterval(jobPollRef.current); jobPollRef.current = null;
              console.log('[processRecording] Transcription complete after ' + pollCount + ' polls');
              resolve(jobData);
            } else if (jobData.status === 'failed') {
              clearInterval(jobPollRef.current); jobPollRef.current = null;
              console.error('[processRecording] Transcription failed:', jobData.errorMessage);
              reject(new Error(jobData.errorMessage || 'Transcription failed'));
            }
            // else still pending/transcribing — keep polling
          } catch (pollErr) {
            clearInterval(jobPollRef.current); jobPollRef.current = null;
            console.error('[processRecording] Poll error:', pollErr);
            reject(pollErr);
          }
        }, 5000);
      });

      const { data: jobData } = await API.get(`/report/jobs/${newJobId}`);
      console.log('[processRecording] Final job data:', jobData);
      setTranscript(jobData.transcript);
      setEditedTranscript(jobData.transcript);

      // Show transcript for review before generating
      setStage('editing');
      console.log('[processRecording] Ready for review');

    } catch (err) {
      console.error('[processRecording] Error:', err.response?.data || err.message);
      setError(err.response?.data?.error || err.message || 'Unknown error');
      setStage('idle');
      setMinimized(false);
    }
  }

  async function runGeneration(jId, transcriptOverride) {
    // Synchronous lock — a second call (double-click, retry, StrictMode re-invoke)
    // is ignored immediately, before any async state update can let it through.
    if (isGeneratingRef.current) {
      console.warn('[runGeneration] Generation already in progress, ignoring duplicate call');
      return;
    }
    isGeneratingRef.current = true;
    console.log('[runGeneration] Starting generation. jobId:', jId, 'transcriptOverride:', !!transcriptOverride);

    const jIdToUse  = jId || jobId;
    const controller = new AbortController();
    // Abort any prior in-flight stream before starting a new one.
    if (generateAbortRef.current) {
      console.log('[runGeneration] Aborting previous generation');
      generateAbortRef.current.abort();
    }
    generateAbortRef.current = controller;

    try {
      console.log('[runGeneration] Calling consumeGenerateStream with:', {
        jobId: jIdToUse,
        template_id: selectedTemplate?.id,
        detail_level: detailLevel,
        save_report: saveReport,
        autofill: autofillEnabled,
      });

      const finalData = await consumeGenerateStream({
        jobId:        jIdToUse,
        template_id:  selectedTemplate?.id,
        detail_level: detailLevel,
        save_report:  String(saveReport),
        autofill:     String(autofillEnabled),
        ...(transcriptOverride != null ? { transcript: transcriptOverride } : {}),
      }, controller.signal);

      console.log('[runGeneration] Generation complete. Final data:', finalData);

      const reportsMap = finalData?.reports || {};
      const resolvedTemplateId = selectedTemplate?.id || Object.keys(reportsMap)[0] || '';
      const generatedText = (reportsMap[resolvedTemplateId] || Object.values(reportsMap)[0] || streamingText || '').trim();

      console.log('[runGeneration] Generated text length:', generatedText.length);
      console.log('[runGeneration] Resolved template ID:', resolvedTemplateId);

      // Guard: an empty result is a failure, not a "done" — keep the user on the
      // review step with an actionable message instead of a blank report.
      if (!generatedText) {
        console.warn('[runGeneration] Empty generated text. Reports map:', reportsMap);
        setError('The AI returned an empty report. Try again, or edit the transcript and regenerate.');
        setStreamingText('');
        setStage('editing');
        setMinimized(false);
        return;
      }

      setReportText(generatedText);
      setStreamingText('');
      setTranscript(finalData?.transcript || transcript);
      setDriveLinks(finalData?.drive_links || {});
      setAutofillData(finalData?.autofill_v2 || null);
      setTemplateId(resolvedTemplateId);
      setIsEditingTranscript(false);
      setStage('done');
      setMinimized(false);

      console.log('[runGeneration] Report generation successful');

      if (autofillEnabled && finalData?.autofill_v2) {
        console.log('[runGeneration] Applying autofill data');
        await applyAutofill(finalData.autofill_v2);
      }
      onSuccess?.();
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('[runGeneration] Generation was cancelled');
        return; // superseded/cancelled — not an error to show
      }
      console.error('[runGeneration] Error:', err.message, err);
      setError(err.message || 'Generation failed');
      setStage('editing');
      setMinimized(false);
    } finally {
      isGeneratingRef.current = false;
      if (generateAbortRef.current === controller) generateAbortRef.current = null;
    }
  }

  async function processTextInput() {
    if (!textInput.trim()) {
      console.warn('[processTextInput] Empty text input');
      return;
    }
    console.log('[processTextInput] Processing text input, length:', textInput.length);
    setStage('transcribing');
    setError('');
    try {
      const fd = buildFormData({ transcript_text: textInput.trim() });
      console.log('[processTextInput] Posting to /report/transcribe with text');
      const { data: transcribeData } = await API.post('/report/transcribe', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      console.log('[processTextInput] Response:', transcribeData);
      const newJobId = transcribeData.jobId;
      setJobId(newJobId);
      setTranscript(textInput.trim());
      setEditedTranscript(textInput.trim());
      setStage('editing');
      console.log('[processTextInput] Ready for review');
    } catch (err) {
      console.error('[processTextInput] Error:', err.response?.data || err.message);
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
      payload.treatment_plan.forEach(t => {
        calls.push(API.post(`/visits/patient/${patientId}/treatments`, {
          treatments: [{
            treatment_name: [t.suggested_treatment, t.diagnosis].filter(Boolean).join(' — ') || 'Treatment',
            teeth_numbers: Array.isArray(t.tooth_numbers) ? t.tooth_numbers.map(String) : [],
            cost: Number(t.estimated_price) || 0,
            qty: 1,
            status: 'Planned',
          }],
        }));
      });
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

  // Step indicator: Dictate → Review → Deliver
  const STEPS = ['Dictate', 'Review', 'Deliver'];
  const currentStep =
    stage === 'editing' || stage === 'generating' ? 1 :
    stage === 'done' ? 2 : 0;

  // Delivery outcome flags
  const deliveryAttempted = Object.keys(deliverResults).length > 0;
  const deliverySucceeded = deliveryAttempted && Object.values(deliverResults).every(r => r.status === 'ok');

  const CHANNEL_LABEL = { cloud: 'Saved to Connect Cloud', email: 'Emailed to patient', whatsapp: 'Sent on WhatsApp' };

  // ── FULL MODAL ──────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[300] flex items-stretch sm:items-center justify-center bg-black/50 backdrop-blur-sm sm:p-4">
      <div className="bg-white w-full sm:max-w-3xl shadow-2xl overflow-y-auto overscroll-contain h-[100dvh] sm:max-h-[92vh] sm:rounded-2xl">

        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-slate-100">
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4">
            <h3 className="font-bold text-base sm:text-lg text-slate-800 flex items-center gap-2 min-w-0">
              <span className="size-8 rounded-lg bg-[#137fec]/10 flex items-center justify-center flex-shrink-0">
                <Mic size={16} className="text-[#137fec]" />
              </span>
              <span className="truncate">AI Clinical Report</span>
            </h3>
            <div className="flex items-center gap-1 flex-shrink-0">
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

          {/* Step indicator */}
          <div className="flex items-center gap-1.5 sm:gap-2 px-4 sm:px-6 pb-3">
            {STEPS.map((label, i) => (
              <div key={label} className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
                <span className={`flex items-center justify-center size-5 rounded-full text-[10px] font-bold flex-shrink-0 transition-colors ${
                  i < currentStep ? 'bg-green-500 text-white'
                  : i === currentStep ? 'bg-[#137fec] text-white'
                  : 'bg-slate-200 text-slate-400'
                }`}>
                  {i < currentStep ? <CheckCircle size={12} /> : i + 1}
                </span>
                <span className={`text-xs font-semibold truncate ${
                  i === currentStep ? 'text-[#137fec]' : i < currentStep ? 'text-green-600' : 'text-slate-400'
                }`}>{label}</span>
                {i < STEPS.length - 1 && (
                  <span className={`hidden sm:block flex-1 h-0.5 rounded-full ${i < currentStep ? 'bg-green-400' : 'bg-slate-200'}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="px-4 sm:px-6 py-4 sm:py-5 flex flex-col gap-4 sm:gap-5">

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
                    <button
                      type="button"
                      onClick={() => window.dispatchEvent(new CustomEvent('smilo:open-node', { detail: { nodeId: 'ai-report-templates' } }))}
                      className="mt-3 flex items-center gap-1.5 text-xs text-[#137fec] hover:text-blue-700 font-medium transition-colors"
                    >
                      <HelpCircle size={13} />
                      How do I choose the right template?
                    </button>
                  </div>

                  <div className="bg-slate-50 rounded-xl border border-slate-200 p-3 sm:p-4">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 sm:mb-3">Detail Level</p>
                    <div className="flex gap-2">
                      {DETAIL_LEVELS.map(dl => (
                        <button key={dl.key} onClick={() => setDetailLevel(dl.key)}
                          className={`flex-1 py-2.5 sm:py-2 rounded-lg text-sm font-medium transition-colors border ${
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
                            <p className="hidden sm:block text-xs text-slate-500 mt-0.5 leading-relaxed">
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
                    <p className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-2">Testing — Text Input (skips AI transcription)</p>
                    <textarea value={textInput} onChange={e => setTextInput(e.target.value)}
                      placeholder="Paste or type the consultation transcript here…"
                      rows={3}
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

              {/* Hidden audio element for preview playback */}
              {playbackUrl && (
                <audio
                  ref={audioPlaybackRef}
                  src={playbackUrl}
                  preload="metadata"
                  onLoadedMetadata={e => setPlaybackDuration(e.target.duration)}
                  onTimeUpdate={e => setPlaybackProgress(e.target.currentTime)}
                  onEnded={() => setIsPlayingBack(false)}
                  onPause={() => setIsPlayingBack(false)}
                  onPlay={() => setIsPlayingBack(true)}
                  style={{ display: 'none' }}
                />
              )}

              {/* Waveform display (recording only) */}
              {(stage === 'recording' || stage === 'paused') && (
                <div className="w-full max-w-sm flex flex-col items-center gap-3">
                  <WaveformBar analyserRef={analyserRef} active={stage === 'recording'} />

                  {/* Playback preview — shown when paused and blob is ready */}
                  {stage === 'paused' && playbackUrl && (
                    <div className="w-full bg-amber-50 border border-amber-200 rounded-xl p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Headphones size={13} className="text-amber-600 flex-shrink-0" />
                        <p className="text-xs font-semibold text-amber-700">
                          Preview recording — plays through your earphone or speaker
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Play / Pause button */}
                        <button
                          onClick={togglePlayback}
                          className="size-9 rounded-full bg-amber-500 hover:bg-amber-600 text-white flex items-center justify-center flex-shrink-0 transition-colors shadow"
                        >
                          {isPlayingBack ? <Pause size={15} /> : <Play size={15} />}
                        </button>

                        {/* Progress bar */}
                        <div className="flex-1 flex flex-col gap-1">
                          <div
                            className="h-2 bg-amber-200 rounded-full cursor-pointer relative overflow-hidden"
                            onClick={seekPlayback}
                          >
                            <div
                              className="h-full bg-amber-500 rounded-full transition-all"
                              style={{ width: playbackDuration ? `${(playbackProgress / playbackDuration) * 100}%` : '0%' }}
                            />
                          </div>
                          <div className="flex justify-between text-[10px] text-amber-600 font-medium">
                            <span>{fmtTime(playbackProgress)}</span>
                            <span>{fmtTime(playbackDuration)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {stage === 'paused' && !playbackUrl && (
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
                  <p className="text-amber-600 font-semibold text-base">
                    Paused — {playbackUrl ? 'listen back above, then ' : ''}tap Resume or Stop (mic button)
                  </p>
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
                <p className="text-slate-400 text-sm mt-1">Molaris AI is processing your dictation. This may take a minute.</p>
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
              <div className="flex items-start justify-between gap-3 py-4">
                <div className="flex items-center gap-3">
                  <Loader2 size={28} className="text-[#137fec] animate-spin flex-shrink-0" />
                  <div>
                    <p className="text-slate-700 font-semibold text-sm">Generating {selectedTemplate?.name || 'report'}…</p>
                    <p className="text-slate-400 text-xs mt-0.5">
                      {autofillEnabled ? 'Will auto-fill treatment page after generation.' : 'Saving to Connect Cloud after generation.'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleCancelGeneration}
                  className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition-colors"
                  title="Cancel and go back to edit the transcript"
                >
                  <XCircle size={13} /> Cancel
                </button>
              </div>
              {streamingText && (
                <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap font-mono bg-slate-50 rounded-lg p-4 border border-slate-100 overflow-y-auto max-h-[30vh] sm:max-h-[300px]">
                  {streamingText}
                  <span className="inline-block w-0.5 h-4 bg-[#137fec] ml-0.5 animate-pulse" />
                </div>
              )}
            </div>
          )}

          {/* ── DONE: success acknowledgement ── */}
          {stage === 'done' && deliverySucceeded && (
            <div className="flex flex-col items-center justify-center text-center py-8 gap-4">
              <div className="size-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle size={36} className="text-green-600" />
              </div>
              <div>
                <p className="text-lg font-bold text-slate-800">Report delivered</p>
                <p className="text-sm text-slate-500 mt-1">Everything you selected was completed successfully.</p>
              </div>
              <div className="w-full max-w-sm space-y-2">
                {Object.entries(deliverResults).map(([channel, r]) => (
                  <div key={channel} className="flex items-center gap-2 text-sm bg-green-50 text-green-700 px-3 py-2.5 rounded-lg">
                    <CheckCircle size={15} className="flex-shrink-0" />
                    <span className="font-semibold">{CHANNEL_LABEL[channel] || channel}</span>
                  </div>
                ))}
              </div>
              {driveLinks[templateId] && (
                <button onClick={() => openExternal(driveLinks[templateId])}
                  className="text-xs flex items-center gap-1 text-blue-600 hover:text-blue-800 underline underline-offset-2">
                  <ExternalLink size={12} /> Open the saved file
                </button>
              )}
              <button onClick={() => setDeliverResults({})}
                className="mt-1 text-xs font-semibold text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded border border-slate-200 hover:bg-slate-50">
                Send to another channel
              </button>
            </div>
          )}

          {/* ── DONE: report + delivery ── */}
          {stage === 'done' && !deliverySucceeded && (
            <>
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
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText size={15} className="text-slate-500 flex-shrink-0" />
                    <p className="text-sm font-semibold text-slate-700 truncate">{selectedTemplate?.name || 'Generated Report'}</p>
                    {selectedTemplate?.type && (
                      <span className="text-[11px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full flex-shrink-0">{selectedTemplate.type}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {jobId && (
                      <button
                        onClick={() => { setIsEditingTranscript(false); setEditedTranscript(transcript); setStage('editing'); }}
                        className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 px-2 py-1 rounded border border-slate-200 hover:bg-slate-50 transition-colors"
                        title="Go back and regenerate from the transcript"
                      >
                        <RefreshCw size={11} /> Regenerate
                      </button>
                    )}
                    <button
                      onClick={() => setIsEditingReport(v => !v)}
                      className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 px-2 py-1 rounded border border-slate-200 hover:bg-slate-50 transition-colors"
                    >
                      <Edit3 size={11} /> {isEditingReport ? 'Done editing' : 'Edit'}
                    </button>
                  </div>
                </div>
                {isEditingReport ? (
                  <textarea
                    autoFocus
                    value={reportText}
                    onChange={e => setReportText(e.target.value)}
                    rows={8}
                    className="w-full text-sm text-slate-700 leading-relaxed font-mono bg-white rounded-lg p-4 border border-[#137fec]/40 focus:outline-none focus:ring-2 focus:ring-[#137fec] resize-y max-h-[280px]"
                    placeholder="Edit the patient letter…"
                  />
                ) : (
                  <div onClick={() => setIsEditingReport(true)} className="cursor-text group relative" title="Click to edit">
                    <ReportDisplay text={reportText} />
                    <span className="absolute top-2 right-2 text-[10px] font-semibold text-slate-400 bg-white/80 px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 pointer-events-none">
                      <Edit3 size={10} /> Click to edit
                    </span>
                  </div>
                )}
              </div>

              {/* Delivery Panel — checkboxes right under the report */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                  <p className="text-sm font-semibold text-slate-700">Approve &amp; Send</p>
                  <p className="text-xs text-slate-400 mt-0.5">Pick where this report should go, review each message, then approve.</p>
                </div>

                <div className="p-4 space-y-3">
                  {/* Save to Connect Cloud */}
                  <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                    <input type="checkbox" checked={deliver.cloud}
                      onChange={e => setDeliver(d => ({ ...d, cloud: e.target.checked }))}
                      className="mt-0.5 w-4 h-4 rounded accent-[#137fec] cursor-pointer" />
                    <Save size={16} className="text-slate-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-700">Save to Connect Cloud</p>
                      {driveLinks[templateId]
                        ? <button onClick={(e) => { e.preventDefault(); openExternal(driveLinks[templateId]); }}
                            className="text-xs flex items-center gap-1 text-blue-600 hover:text-blue-800 underline underline-offset-2 mt-0.5">
                            <ExternalLink size={11} /> Already saved — view file
                          </button>
                        : <p className="text-xs text-slate-400 mt-0.5">Stores the report in the patient's Drive folder.</p>}
                    </div>
                  </label>

                  {/* Email to patient */}
                  <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <label className="flex items-start gap-3 p-3 cursor-pointer hover:bg-slate-50 transition-colors">
                      <input type="checkbox" checked={deliver.email}
                        onChange={e => setDeliver(d => ({ ...d, email: e.target.checked }))}
                        className="mt-0.5 w-4 h-4 rounded accent-[#137fec] cursor-pointer" />
                      <Mail size={16} className="text-slate-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-700">Email to patient</p>
                        <p className="text-xs text-slate-400 mt-0.5">PDF attached. Review the message below.</p>
                      </div>
                    </label>
                    {deliver.email && (
                      <div className="px-4 pb-4 pt-1 space-y-2 bg-slate-50/60 border-t border-slate-100">
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
                          <textarea value={emailForm.body} onChange={e => setEmailForm(f => ({ ...f, body: e.target.value }))} rows={2}
                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#137fec] outline-none resize-none sm:rows-3" />
                        </div>
                        <p className="text-xs text-slate-400">
                          Attachment: {selectedTemplate?.name || 'Report'}_{(patient?.first_name || 'patient')}_{new Date().toISOString().slice(0,10)}.pdf
                        </p>
                      </div>
                    )}
                  </div>

                  {/* WhatsApp to patient */}
                  <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <label className="flex items-start gap-3 p-3 cursor-pointer hover:bg-slate-50 transition-colors">
                      <input type="checkbox" checked={deliver.whatsapp}
                        onChange={e => setDeliver(d => ({ ...d, whatsapp: e.target.checked }))}
                        className="mt-0.5 w-4 h-4 rounded accent-[#137fec] cursor-pointer" />
                      <MessageSquare size={16} className="text-slate-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-700">WhatsApp to patient</p>
                        <p className="text-xs text-slate-400 mt-0.5">Sends the AI report as a PDF document. Review message below.</p>
                      </div>
                    </label>
                    {deliver.whatsapp && (
                      <div className="px-4 pb-4 pt-1 space-y-2 bg-slate-50/60 border-t border-slate-100">
                        <div>
                          <label className="text-xs font-semibold text-slate-500 block mb-1">Phone</label>
                          <input type="text" value={waForm.to} onChange={e => setWaForm(f => ({ ...f, to: e.target.value }))}
                            placeholder="+91 98765 43210"
                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#137fec] outline-none" />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-slate-500 block mb-1">Message</label>
                          <textarea value={waForm.text} onChange={e => setWaForm(f => ({ ...f, text: e.target.value }))} rows={2}
                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#137fec] outline-none resize-none sm:rows-3" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Per-channel results */}
                  {Object.keys(deliverResults).length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      {Object.entries(deliverResults).map(([channel, r]) => (
                        <div key={channel} className={`text-sm flex items-center gap-2 px-3 py-2 rounded-lg ${
                          r.status === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                        }`}>
                          {r.status === 'ok' ? <CheckCircle size={14} /> : <XCircle size={14} />}
                          <span className="capitalize font-semibold">{channel === 'cloud' ? 'Cloud' : channel}:</span> {r.message}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {error && <ErrorBadge error={error} />}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-slate-50 border-t border-slate-100 px-4 sm:px-6 py-3 sm:py-4">
          {/* Desktop: single row with hint left + buttons right */}
          {/* Mobile: buttons stacked, primary action on top */}
          {stage === 'done' && deliverySucceeded ? (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2 sm:gap-3">
              <button onClick={resetState}
                className="w-full sm:w-auto px-4 py-2.5 sm:py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors">
                Record Again
              </button>
              <button onClick={handleClose}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 sm:py-2 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors">
                <CheckCircle size={15} /> Done
              </button>
            </div>
          ) : stage === 'done' ? (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              {/* Result chips — desktop left, hidden on mobile (already shown in body) */}
              <div className="hidden sm:flex flex-wrap items-center gap-1.5">
                {Object.keys(deliverResults).length > 0 ? (
                  Object.entries(deliverResults).map(([channel, r]) => (
                    <span key={channel} title={r.message}
                      className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full ${
                        r.status === 'ok' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                      {r.status === 'ok' ? <CheckCircle size={11} /> : <XCircle size={11} />}
                      {channel === 'cloud' ? 'Cloud' : channel === 'whatsapp' ? 'WhatsApp' : 'Email'}
                    </span>
                  ))
                ) : (
                  <p className="text-xs text-slate-400">Tick a channel, then Approve &amp; Send</p>
                )}
              </div>
              {/* Mobile: Approve & Send full-width first, secondaries side-by-side below */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
                <button
                  onClick={handleApproveAndSend}
                  disabled={delivering || (!deliver.cloud && !deliver.email && !deliver.whatsapp)}
                  className="order-first sm:order-last w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 sm:py-2 text-sm font-semibold text-white bg-[#137fec] rounded-xl sm:rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {delivering ? <Loader2 size={15} className="animate-spin" /> : <SendHorizonal size={15} />}
                  {delivering ? 'Sending…' : 'Approve & Send'}
                </button>
                <div className="flex gap-2">
                  <button onClick={handleClose}
                    className="flex-1 sm:flex-none px-4 py-2.5 sm:py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors">
                    Close
                  </button>
                  <button onClick={resetState}
                    className="flex-1 sm:flex-none px-4 py-2.5 sm:py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors">
                    Record Again
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <p className="hidden sm:block text-xs text-slate-400 truncate">
                {stage === 'editing'
                  ? 'Review or edit the transcript, then click Generate'
                  : 'You can minimize this window while recording or processing'}
              </p>
              <button onClick={handleClose}
                className="w-full sm:w-auto px-5 py-2.5 sm:py-2 text-sm font-medium text-white bg-[#137fec] rounded-xl sm:rounded-lg hover:bg-blue-600 transition-colors">
                Close
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
