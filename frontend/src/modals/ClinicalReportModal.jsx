import { useRef, useState } from 'react';
import {
  X, Mic, MicOff, Loader2, CheckCircle, ExternalLink,
  FileText, ClipboardList, Mail, Minimize2, Maximize2,
  Sparkles, Save, SendHorizonal,
} from 'lucide-react';
import API from '../services/api';
import { useAuth } from '../Context/AuthContext.jsx';

const REPORT_TABS = [
  { key: 'short_report',   label: 'Short Report',   icon: FileText      },
  { key: 'tmd_template',   label: 'TMD Template',   icon: ClipboardList },
  { key: 'patient_letter', label: 'Patient Letter',  icon: Mail          },
];

const DEFAULT_SAVE = { short_report: true, tmd_template: true, patient_letter: true };

function ReportDisplay({ text }) {
  if (!text) return <p className="text-slate-400 italic">Not generated.</p>;
  return (
    <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap font-mono bg-slate-50 rounded-lg p-4 border border-slate-100 overflow-y-auto max-h-[280px]">
      {text}
    </div>
  );
}

// Simple toggle switch component
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

export default function ClinicalReportModal({ isOpen, onClose, patientId, patient, onSuccess }) {
  const { user } = useAuth();
  const mediaRecorderRef = useRef(null);
  const audioChunksRef   = useRef([]);
  const cancelledRef     = useRef(false); // set to true when user closes mid-recording

  const [stage, setStage]       = useState('idle');   // idle | recording | processing | done
  const [minimized, setMinimized] = useState(false);
  const [transcript, setTranscript]   = useState('');
  const [reports, setReports]         = useState(null);
  const [driveLinks, setDriveLinks]   = useState(null);
  const [autofillData, setAutofillData] = useState(null);
  const [error, setError]             = useState('');
  const [activeTab, setActiveTab]     = useState('short_report');

  // Save selections — which reports to upload to Drive
  const [saveToggles, setSaveToggles] = useState(DEFAULT_SAVE);
  // Autofill treatment page toggle
  const [autofillEnabled, setAutofillEnabled] = useState(false);
  // Temporary text input for testing (skips Sarvam)
  const [textInput, setTextInput] = useState('');

  function resetState() {
    setStage('idle');
    setTranscript('');
    setReports(null);
    setDriveLinks(null);
    setAutofillData(null);
    setError('');
    setActiveTab('short_report');
    setMinimized(false);
    setSaveToggles(DEFAULT_SAVE);
    setAutofillEnabled(false);
    setTextInput('');
  }

  function handleClose() {
    if (stage === 'recording') {
      cancelledRef.current = true;  // signal onstop to skip processing
      stopRecording();
    }
    resetState();
    cancelledRef.current = false;
    onClose();
  }

  async function startRecording() {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      recorder.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = () => { stream.getTracks().forEach(t => t.stop()); processRecording(); };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setStage('recording');
    } catch {
      setError('Microphone access denied. Please allow microphone permissions and try again.');
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
  }

  async function processRecording() {
    // Skip if user closed the modal while recording
    if (cancelledRef.current) return;
    // Guard: don't re-enter if already processing
    if (audioChunksRef.current.length === 0) return;
    const chunks = [...audioChunksRef.current];
    audioChunksRef.current = []; // clear immediately to prevent double-fire
    setStage('processing');
    try {
      const blob = new Blob(chunks, { type: 'audio/webm' });
      const formData = new FormData();
      formData.append('file', blob, 'dictation.webm');
      formData.append('patient_id', patientId);
      // Save flags — backend only uploads checked ones to Drive
      formData.append('save_short_report',   String(saveToggles.short_report));
      formData.append('save_tmd_template',   String(saveToggles.tmd_template));
      formData.append('save_patient_letter', String(saveToggles.patient_letter));
      // Layer 1 flag — backend runs the structured-extraction LLM only when this is true
      formData.append('autofill',            String(autofillEnabled));

      const { data } = await API.post('/report/generate', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 720000,
      });

      setTranscript(data.transcript);
      setReports(data.reports);
      setDriveLinks(data.drive_links);
      setAutofillData(data.autofill_v2 || null);
      setStage('done');
      setMinimized(false);

      // ── Layer 2: dispatch the structured autofill payload to the treatment page ──
      if (autofillEnabled && data.autofill_v2) {
        await applyAutofill(data.autofill_v2);
      }

      onSuccess?.(); // refresh ReportNotesSection + treatment page
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Unknown error';
      setError(msg);
      setStage('idle');
      setMinimized(false);
    }
  }

  // ── Text input submission (testing shortcut — skips Sarvam) ─────────────────
  async function processTextInput() {
    if (!textInput.trim()) return;
    setStage('processing');
    setError('');
    try {
      const formData = new FormData();
      formData.append('patient_id', patientId);
      formData.append('transcript_text', textInput.trim());
      formData.append('save_short_report',   String(saveToggles.short_report));
      formData.append('save_tmd_template',   String(saveToggles.tmd_template));
      formData.append('save_patient_letter', String(saveToggles.patient_letter));
      formData.append('autofill',            String(autofillEnabled));

      const { data } = await API.post('/report/generate', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 720000,
      });

      setTranscript(data.transcript);
      setReports(data.reports);
      setDriveLinks(data.drive_links);
      setAutofillData(data.autofill_v2 || null);
      setStage('done');
      setMinimized(false);

      if (autofillEnabled && data.autofill_v2) {
        await applyAutofill(data.autofill_v2);
      }

      onSuccess?.();
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Unknown error';
      setError(msg);
      setStage('idle');
      setMinimized(false);
    }
  }

  // ── Layer 2 — Frontend dispatcher ──────────────────────────────────────────
  // Takes the structured JSON produced by Layer 1 and fires parallel calls to
  // the existing endpoints that back every section of the Treatment Page.
  // Uses Promise.allSettled so one failure doesn't kill the others.
  async function applyAutofill(payload) {
    const calls = [];

    // 1. Patient-level fields: chief complaint, dental history, medical history (merged).
    const patientUpdate = {};
    if (payload.chief_complaint) patientUpdate.chief_complaint = payload.chief_complaint;
    if (payload.dental_history)  patientUpdate.dental_history  = payload.dental_history;
    if (Array.isArray(payload.medical_history) && payload.medical_history.length > 0) {
      const existing = patient?.medical_history || [];
      patientUpdate.medical_history = Array.from(new Set([...existing, ...payload.medical_history]));
    }
    if (Object.keys(patientUpdate).length > 0) {
      calls.push(API.put(`/patients/${patientId}`, patientUpdate));
    }

    // 2. Consultation note (single HTML block).
    if (payload.consultation_note) {
      calls.push(API.post(`/visits/patient/${patientId}/note`, { content: payload.consultation_note }));
    }

    // 3. Advice — single consolidated HTML block.
    // Handle both: new format (single `advice` string) or legacy array (`advices`).
    const adviceHtml = payload.advice
      || (Array.isArray(payload.advices) ? payload.advices.filter(Boolean).join('') : '');
    if (adviceHtml) {
      calls.push(API.post(`/visits/patient/${patientId}/advice`, { content: adviceHtml }));
    }

    // 4. Treatment plan — bulk push, mapping Layer 1 shape → visit.treatments shape.
    if (Array.isArray(payload.treatment_plan) && payload.treatment_plan.length > 0) {
      const treatments = payload.treatment_plan.map(t => ({
        treatment_name: [t.suggested_treatment, t.diagnosis].filter(Boolean).join(' — ') || 'Treatment',
        teeth_numbers:  Array.isArray(t.tooth_numbers) ? t.tooth_numbers.map(String) : [],
        cost:           Number(t.estimated_price) || 0,
        qty:            1,
        status:         'Planned',
      }));
      calls.push(API.post(`/visits/patient/${patientId}/treatments`, { treatments }));
    }

    // 5. Medications — one call per prescription (endpoint accepts a single drug).
    (payload.medications || []).forEach(m => {
      if (m?.drug_name) {
        calls.push(API.post(`/visits/patient/${patientId}/prescription`, {
          drug_name:    m.drug_name,
          dosage:       m.dosage || '',
          duration:     m.duration || '',
          instructions: m.instructions || '',
        }));
      }
    });

    // 6. Recall appointment — schedule a future Scheduled appointment if the doctor mentioned one.
    const recallDays = Number(payload.recall?.days_later);
    if (recallDays > 0 && user?._id && patient) {
      const start = new Date(Date.now() + recallDays * 24 * 60 * 60 * 1000);
      start.setHours(10, 0, 0, 0); // default 10:00 slot
      const end = new Date(start.getTime() + 30 * 60 * 1000);
      const title = `Recall - ${patient.first_name || ''} ${patient.last_name || ''}`.trim();
      calls.push(API.post('/appointments', {
        patient_id:  patientId,
        doctor_id:   user._id,
        start_time:  start.toISOString(),
        end_time:    end.toISOString(),
        title,
        type:        'Consultation',
        status:      'Scheduled',
        room_number: 'Room 1',
        notes:       payload.recall?.notes || 'AI-scheduled recall',
      }));
    }

    if (calls.length === 0) return;
    const results = await Promise.allSettled(calls);
    const failures = results.filter(r => r.status === 'rejected');
    if (failures.length > 0) {
      console.warn('[Autofill] Some endpoints failed:', failures.map(f => f.reason?.message || f.reason));
    }
  }

  if (!isOpen) return null;

  // ── MINIMIZED PILL ──────────────────────────────────────────────────────────
  if (minimized) {
    const pillLabel =
      stage === 'recording'  ? 'Recording…'          :
      stage === 'processing' ? 'Generating reports…' :
      stage === 'done'       ? 'Reports ready'       : 'AI Report';

    const pillColor =
      stage === 'recording'  ? 'bg-red-500'   :
      stage === 'processing' ? 'bg-[#137fec]' :
      stage === 'done'       ? 'bg-green-600' : 'bg-slate-700';

    return (
      <div
        className={`fixed bottom-6 right-6 z-[400] flex items-center gap-3 px-4 py-3 ${pillColor} text-white rounded-full shadow-2xl cursor-pointer select-none`}
        onClick={() => setMinimized(false)}
      >
        {stage === 'processing'
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
              Dictate the full consultation — the AI will generate all 3 clinical documents
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

          {/* ── IDLE / RECORDING ── */}
          {(stage === 'idle' || stage === 'recording') && (
            <div className="flex flex-col items-center gap-5">
              {/* Mic button */}
              <button
                onClick={stage === 'recording' ? stopRecording : startRecording}
                className={`relative size-24 rounded-full flex items-center justify-center shadow-xl transition-all duration-300 mt-2 ${
                  stage === 'recording'
                    ? 'bg-red-500 hover:bg-red-600 shadow-red-300'
                    : 'bg-[#137fec] hover:bg-blue-600 shadow-blue-300'
                }`}
              >
                {stage === 'recording' && (
                  <>
                    <span className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-40" />
                    <span className="absolute inset-[-8px] rounded-full border-2 border-red-300 animate-pulse" />
                  </>
                )}
                {stage === 'recording'
                  ? <MicOff size={36} className="text-white" />
                  : <Mic    size={36} className="text-white" />}
              </button>

              <div className="text-center">
                {stage === 'idle' ? (
                  <>
                    <p className="text-slate-700 font-semibold text-base">Click to start recording</p>
                    <p className="text-slate-400 text-sm mt-1">
                      Dictate the patient history, examination findings,<br />
                      diagnosis, and management plan in one go.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-red-600 font-semibold text-base animate-pulse">Recording… speak clearly</p>
                    <p className="text-slate-400 text-sm mt-1">Click the button again when done. You can minimize this window while recording.</p>
                  </>
                )}
              </div>

              {/* ── Text input for testing (only in idle) ── */}
              {stage === 'idle' && (
                <div className="w-full max-w-lg">
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <p className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-2">Testing — Text Input (skips Sarvam)</p>
                    <textarea
                      value={textInput}
                      onChange={e => setTextInput(e.target.value)}
                      placeholder="Paste or type the consultation transcript here…"
                      rows={4}
                      className="w-full text-sm border border-amber-200 rounded-lg p-3 resize-y focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white placeholder:text-amber-300"
                    />
                    <button
                      onClick={processTextInput}
                      disabled={!textInput.trim()}
                      className="mt-2 w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-amber-500 text-white hover:bg-amber-600"
                    >
                      <SendHorizonal size={15} /> Submit Text
                    </button>
                  </div>
                </div>
              )}

              {/* ── Save options (only in idle) ── */}
              {stage === 'idle' && (
                <div className="w-full max-w-lg space-y-3">

                  {/* Drive save checkboxes */}
                  <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Save size={14} className="text-slate-500" />
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Save to Drive</p>
                    </div>
                    <div className="flex flex-col gap-2">
                      {REPORT_TABS.map(tab => {
                        const Icon = tab.icon;
                        return (
                          <label key={tab.key} className="flex items-center gap-3 py-1.5 cursor-pointer group">
                            <input
                              type="checkbox"
                              checked={saveToggles[tab.key]}
                              onChange={e => setSaveToggles(prev => ({ ...prev, [tab.key]: e.target.checked }))}
                              className="w-4 h-4 rounded accent-[#137fec] cursor-pointer"
                            />
                            <Icon size={15} className="text-slate-400 group-hover:text-[#137fec] transition-colors" />
                            <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900">{tab.label}</span>
                          </label>
                        );
                      })}
                    </div>
                    {!saveToggles.short_report && !saveToggles.tmd_template && !saveToggles.patient_letter && (
                      <p className="text-xs text-amber-600 mt-2">No reports will be saved to Drive.</p>
                    )}
                  </div>

                  {/* Auto-fill treatment page toggle */}
                  <div
                    onClick={() => setAutofillEnabled(v => !v)}
                    className={`rounded-xl border-2 p-4 cursor-pointer transition-all ${
                      autofillEnabled
                        ? 'border-[#137fec] bg-blue-50/60 shadow-sm shadow-blue-100'
                        : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                    }`}
                  >
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
                          <span key={s} className="text-[11px] bg-[#137fec]/10 text-[#137fec] px-2.5 py-1 rounded-full font-medium">
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
              )}
            </div>
          )}

          {/* ── PROCESSING ── */}
          {stage === 'processing' && (
            <div className="flex flex-col items-center gap-5 py-10">
              <Loader2 size={52} className="text-[#137fec] animate-spin" />
              <div className="text-center">
                <p className="text-slate-700 font-semibold text-base">Generating clinical reports…</p>
                <p className="text-slate-400 text-sm mt-1">
                  Transcribing audio → Structuring documents → {autofillEnabled ? 'Filling treatment page' : 'Saving to Drive'}
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2 mt-2">
                {['Transcribing', 'AI Processing',
                  ...(saveToggles.short_report || saveToggles.tmd_template || saveToggles.patient_letter ? ['Saving to Drive'] : []),
                  ...(autofillEnabled ? ['Auto-filling Page'] : []),
                ].map((step, i) => (
                  <span key={i} className="text-xs px-3 py-1.5 bg-blue-50 text-blue-600 rounded-full font-medium animate-pulse"
                    style={{ animationDelay: `${i * 0.3}s` }}>
                    {step}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* ── DONE ── */}
          {stage === 'done' && reports && (
            <>
              {transcript && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle size={15} className="text-green-600" />
                    <p className="text-sm font-semibold text-green-700">Transcript</p>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed line-clamp-3">{transcript}</p>
                </div>
              )}

              {/* Drive save summary */}
              <div className={`rounded-xl p-4 border ${
                Object.keys(driveLinks || {}).length > 0
                  ? 'bg-blue-50 border-blue-200'
                  : 'bg-slate-50 border-slate-200'
              }`}>
                <p className="text-sm font-semibold mb-2 flex items-center gap-1.5 text-slate-700">
                  <Save size={14} />
                  Drive Save
                </p>
                {Object.keys(driveLinks || {}).length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {REPORT_TABS.map(tab => driveLinks?.[tab.key] && (
                      <a key={tab.key} href={driveLinks[tab.key]} target="_blank" rel="noreferrer"
                        className="text-xs flex items-center gap-1 text-blue-600 hover:text-blue-800 underline underline-offset-2">
                        <ExternalLink size={11} /> {tab.label}
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">No reports were saved to Drive.</p>
                )}
              </div>

              {/* Autofill summary */}
              {autofillEnabled && autofillData && (
                <div className="bg-[#137fec]/5 border border-[#137fec]/20 rounded-xl p-4">
                  <p className="text-sm font-semibold text-[#137fec] flex items-center gap-1.5 mb-1">
                    <Sparkles size={14} />
                    Treatment Page Auto-filled
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {autofillData.chief_complaint && (
                      <span className="text-[11px] bg-[#137fec]/10 text-[#137fec] px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
                        <CheckCircle size={10} /> Chief Complaint
                      </span>
                    )}
                    {autofillData.medical_history?.length > 0 && (
                      <span className="text-[11px] bg-[#137fec]/10 text-[#137fec] px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
                        <CheckCircle size={10} /> Medical History
                      </span>
                    )}
                    {autofillData.dental_history && (
                      <span className="text-[11px] bg-[#137fec]/10 text-[#137fec] px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
                        <CheckCircle size={10} /> Dental History
                      </span>
                    )}
                    {autofillData.consultation_note && (
                      <span className="text-[11px] bg-[#137fec]/10 text-[#137fec] px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
                        <CheckCircle size={10} /> Consultation Note
                      </span>
                    )}
                    {(autofillData.advice || autofillData.advices?.length > 0) && (
                      <span className="text-[11px] bg-[#137fec]/10 text-[#137fec] px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
                        <CheckCircle size={10} /> Advice
                      </span>
                    )}
                    {autofillData.treatment_plan?.length > 0 && (
                      <span className="text-[11px] bg-[#137fec]/10 text-[#137fec] px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
                        <CheckCircle size={10} /> {autofillData.treatment_plan.length} Treatment{autofillData.treatment_plan.length > 1 ? 's' : ''}
                      </span>
                    )}
                    {autofillData.medications?.length > 0 && (
                      <span className="text-[11px] bg-[#137fec]/10 text-[#137fec] px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
                        <CheckCircle size={10} /> {autofillData.medications.length} Medication{autofillData.medications.length > 1 ? 's' : ''}
                      </span>
                    )}
                    {Number(autofillData.recall?.days_later) > 0 && (
                      <span className="text-[11px] bg-[#137fec]/10 text-[#137fec] px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
                        <CheckCircle size={10} /> Recall in {autofillData.recall.days_later}d
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Report tabs */}
              <div>
                <div className="flex gap-1 border-b border-slate-200 mb-4">
                  {REPORT_TABS.map(tab => {
                    const Icon = tab.icon;
                    return (
                      <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                        className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors -mb-px border border-b-0 ${
                          activeTab === tab.key
                            ? 'bg-white text-[#137fec] border-slate-200'
                            : 'bg-slate-50 text-slate-500 hover:text-slate-700 border-transparent'
                        }`}
                      >
                        <Icon size={14} /> {tab.label}
                      </button>
                    );
                  })}
                </div>
                <ReportDisplay text={reports[activeTab]} />
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
