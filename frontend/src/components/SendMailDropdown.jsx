import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mail, ChevronDown, FileText, Receipt, Sparkles,
  X, Loader2, CheckCircle, XCircle, Settings, AlertCircle,
  ChevronDown as ChevronDownSm, Edit3,
} from 'lucide-react';
import API from '../services/api';
import { replacePlaceholders, SAMPLE_DATA } from '../utils/templateVariables';

export default function SendMailDropdown({ patientId, patient }) {
  const [open, setOpen]               = useState(false);
  const [loadState, setLoadState]     = useState('idle'); // idle | loading | ready
  const [emailStatus, setEmailStatus] = useState(null);
  const [templates, setTemplates]     = useState([]);     // active appointmentCompleted templates
  const [selected, setSelected]       = useState({ smart_report: true, invoice: false, ai_report: false });
  const [emailTo, setEmailTo]         = useState('');
  const [sending, setSending]         = useState(false);
  const [result, setResult]           = useState(null);   // { ok, message }

  // Template customisation
  const [selectedTemplate, setSelectedTemplate] = useState(''); // template._id or ''
  const [customSubject, setCustomSubject]        = useState('');
  const [customBody, setCustomBody]              = useState('');
  const [showEditor, setShowEditor]              = useState(false);

  const panelRef = useRef(null);
  const navigate = useNavigate();

  // Pre-fill email from prop whenever patient loads
  useEffect(() => {
    if (patient?.contact?.email) setEmailTo(patient.contact.email);
  }, [patient?.contact?.email]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function onDown(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  async function handleOpen() {
    setOpen(o => !o);
    setResult(null);
    if (loadState !== 'idle') return;
    setLoadState('loading');
    try {
      const [statusRes, templatesRes] = await Promise.all([
        API.get(`/email/patient-status/${patientId}`),
        API.get('/email/templates').catch(() => ({ data: [] })),
      ]);
      const status = statusRes.data;
      setEmailStatus(status);

      // Pre-fill email from backend if not already set
      if (!emailTo && status.patientEmail) setEmailTo(status.patientEmail);

      setSelected({
        smart_report: true,
        invoice:      !!status.latestInvoice,
        ai_report:    !!status.latestAiReport,
      });

      // Filter to active templates for the appointmentCompleted event
      const apptTemplates = (templatesRes.data || []).filter(
        t => t.event === 'appointmentCompleted' && t.isActive
      );
      setTemplates(apptTemplates);

      // Auto-select first template
      if (apptTemplates.length > 0) {
        const first = apptTemplates[0];
        setSelectedTemplate(first._id);
        setCustomSubject(first.subject);
        setCustomBody(first.body);
      }
    } catch {
      setEmailStatus({ emailEnabled: false, hasSmtp: false, latestInvoice: null, latestAiReport: null });
    } finally {
      setLoadState('ready');
    }
  }

  function toggle(key) {
    setSelected(s => ({ ...s, [key]: !s[key] }));
  }

  function selectAll() {
    setSelected({
      smart_report: true,
      invoice:   !!emailStatus?.latestInvoice,
      ai_report: !!emailStatus?.latestAiReport,
    });
  }

  function handleTemplateChange(templateId) {
    setSelectedTemplate(templateId);
    if (!templateId) {
      setCustomSubject('');
      setCustomBody('');
      return;
    }
    const tpl = templates.find(t => t._id === templateId);
    if (tpl) {
      setCustomSubject(tpl.subject);
      setCustomBody(tpl.body);
    }
  }

  async function handleSend() {
    const include = Object.keys(selected).filter(k => selected[k]);
    if (!include.length || !emailTo.trim()) return;
    setSending(true);
    setResult(null);
    try {
      const payload = {
        patient_id: patientId,
        to: emailTo.trim(),
        include,
        template_event: 'appointmentCompleted',
      };
      if (customSubject.trim()) payload.customSubject = customSubject.trim();
      if (customBody.trim())    payload.customBody    = customBody.trim();

      const res = await API.post('/email/send-treatment-summary', payload);
      const count = res.data.attachments?.length || 0;
      setResult({ ok: true, message: `Sent to ${res.data.to} — ${count} attachment${count !== 1 ? 's' : ''}` });
    } catch (err) {
      setResult({ ok: false, message: err.response?.data?.error || err.message });
    } finally {
      setSending(false);
    }
  }

  const anySelected = Object.values(selected).some(Boolean);
  const missingEmail = loadState === 'ready' && emailStatus?.emailEnabled && !emailStatus?.hasPatientEmail;
  const patientName  = emailStatus?.patientName || patient?.first_name || '';

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={handleOpen}
        className="px-4 py-2 border border-slate-300 text-slate-600 font-medium rounded-lg hover:bg-slate-50 flex items-center gap-2 transition-colors text-sm"
      >
        <Mail size={16} />
        Send Mail
        <ChevronDown size={14} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute bottom-full mb-2 right-0 w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <p className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <Mail size={14} className="text-[#137fec]" /> Send to Patient
            </p>
            <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
              <X size={15} />
            </button>
          </div>

          <div className="p-4 space-y-3 max-h-[85vh] overflow-y-auto">
            {/* Loading */}
            {loadState === 'loading' && (
              <div className="flex justify-center py-6">
                <Loader2 size={22} className="animate-spin text-[#137fec]" />
              </div>
            )}

            {/* Email not configured */}
            {loadState === 'ready' && !emailStatus?.emailEnabled && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-1">
                <p className="text-xs font-semibold text-amber-700">Email not configured</p>
                <p className="text-xs text-amber-600">
                  {emailStatus?.hasSmtp
                    ? 'Email is configured but not enabled. Enable it in Settings.'
                    : 'Set up your SMTP credentials in Settings to send emails.'}
                </p>
                <button
                  onClick={() => { setOpen(false); navigate('/settings'); }}
                  className="mt-1 text-xs text-[#137fec] underline flex items-center gap-1 hover:text-blue-700"
                >
                  <Settings size={11} /> Go to Settings → Email
                </button>
              </div>
            )}

            {/* Main UI */}
            {loadState === 'ready' && emailStatus?.emailEnabled && (
              <>
                {/* Missing patient email warning */}
                {missingEmail && (
                  <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 flex items-start gap-2">
                    <AlertCircle size={14} className="text-orange-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-orange-700 leading-relaxed">
                      <strong>Email not set</strong> for {patientName ? <strong>{patientName}</strong> : 'this patient'}.
                      You can enter it manually below, or update the patient record.
                    </p>
                  </div>
                )}

                {/* What to include */}
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Include</p>
                  <button onClick={selectAll} className="text-[11px] text-[#137fec] hover:underline font-medium">
                    Select All
                  </button>
                </div>

                <ItemRow
                  checked={selected.smart_report}
                  onChange={() => toggle('smart_report')}
                  icon={<FileText size={14} className="text-blue-500" />}
                  label="Smart Report"
                  sub="Treatments, prescriptions & notes"
                  available
                />

                <ItemRow
                  checked={selected.invoice}
                  onChange={() => toggle('invoice')}
                  icon={<Receipt size={14} className="text-green-500" />}
                  label="Invoice"
                  sub={
                    emailStatus.latestInvoice
                      ? `${emailStatus.latestInvoice.invoice_id} · ₹${emailStatus.latestInvoice.total_amount} · ${emailStatus.latestInvoice.status}`
                      : 'No invoice on file'
                  }
                  available={!!emailStatus.latestInvoice}
                />

                <ItemRow
                  checked={selected.ai_report}
                  onChange={() => toggle('ai_report')}
                  icon={<Sparkles size={14} className="text-purple-500" />}
                  label="AI Report"
                  sub={
                    emailStatus.latestAiReport
                      ? `${emailStatus.latestAiReport.templateId} · ${new Date(emailStatus.latestAiReport.createdAt).toLocaleDateString('en-IN')}`
                      : 'Not generated yet'
                  }
                  available={!!emailStatus.latestAiReport}
                />

                {/* Template picker */}
                <div className="pt-1 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Email Template</p>
                    <button
                      type="button"
                      onClick={() => setShowEditor(e => !e)}
                      className="text-[11px] text-[#137fec] hover:underline font-medium flex items-center gap-1"
                    >
                      <Edit3 size={11} /> {showEditor ? 'Hide editor' : 'Edit message'}
                    </button>
                  </div>
                  {templates.length > 0 ? (
                    <select
                      value={selectedTemplate}
                      onChange={e => handleTemplateChange(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#137fec] outline-none bg-white"
                    >
                      <option value="">— Use default message —</option>
                      {templates.map(t => (
                        <option key={t._id} value={t._id}>{t.subject}</option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-xs text-slate-400 italic">
                      No active templates — using system default.{' '}
                      <button onClick={() => { setOpen(false); navigate('/settings'); }} className="text-[#137fec] hover:underline">Create one in Settings</button>
                    </p>
                  )}
                </div>

                {/* Editable subject / body */}
                {showEditor && (
                  <div className="space-y-2 pt-1 border border-slate-200 rounded-xl p-3 bg-slate-50">
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Customise message</p>
                    <div>
                      <label className="text-[11px] text-slate-500 block mb-0.5">Subject</label>
                      <input
                        type="text"
                        value={customSubject}
                        onChange={e => setCustomSubject(e.target.value)}
                        placeholder="Subject line…"
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-[#137fec] outline-none bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-500 block mb-0.5">Body</label>
                      <textarea
                        value={customBody}
                        onChange={e => setCustomBody(e.target.value)}
                        rows={5}
                        placeholder="Message body… use {{name}}, {{doctor}}, {{date}}, etc."
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-[#137fec] outline-none bg-white resize-none font-mono"
                      />
                    </div>
                    {(customSubject || customBody) && (
                      <div className="bg-white border border-slate-200 rounded-lg p-2.5 space-y-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Preview</p>
                        {customSubject && (
                          <p className="text-xs font-semibold text-slate-700">
                            {replacePlaceholders(customSubject, { ...SAMPLE_DATA, name: patientName || SAMPLE_DATA.name })}
                          </p>
                        )}
                        {customBody && (
                          <p className="text-xs text-slate-500 whitespace-pre-wrap">
                            {replacePlaceholders(customBody, { ...SAMPLE_DATA, name: patientName || SAMPLE_DATA.name })}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Email address */}
                <div className="pt-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Send to</label>
                  <input
                    type="email"
                    value={emailTo}
                    onChange={e => setEmailTo(e.target.value)}
                    placeholder={missingEmail ? `Enter ${patientName}'s email` : 'patient@example.com'}
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-[#137fec] outline-none ${
                      missingEmail && !emailTo.trim()
                        ? 'border-orange-300 bg-orange-50'
                        : 'border-slate-300'
                    }`}
                  />
                </div>

                {/* Result banner */}
                {result && (
                  <div className={`flex items-start gap-2 p-3 rounded-xl text-xs font-medium ${
                    result.ok ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'
                  }`}>
                    {result.ok
                      ? <CheckCircle size={13} className="flex-shrink-0 mt-0.5" />
                      : <XCircle    size={13} className="flex-shrink-0 mt-0.5" />}
                    {result.message}
                  </div>
                )}

                {/* Send button */}
                <button
                  onClick={handleSend}
                  disabled={sending || !anySelected || !emailTo.trim()}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#137fec] hover:bg-blue-600 text-white font-semibold rounded-xl text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sending
                    ? <><Loader2 size={14} className="animate-spin" /> Sending…</>
                    : <><Mail size={14} /> Send Email</>}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ItemRow({ checked, onChange, icon, label, sub, available }) {
  return (
    <label className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
      available
        ? 'border-slate-100 hover:bg-slate-50 cursor-pointer'
        : 'border-slate-100 opacity-40 cursor-not-allowed'
    }`}>
      <input
        type="checkbox"
        checked={checked}
        disabled={!available}
        onChange={onChange}
        className="accent-[#137fec] w-4 h-4 flex-shrink-0"
      />
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className="flex-shrink-0">{icon}</span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-700">{label}</p>
          <p className="text-xs text-slate-400 truncate">{sub}</p>
        </div>
      </div>
    </label>
  );
}
