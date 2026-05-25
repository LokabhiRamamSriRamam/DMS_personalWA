import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mail, ChevronDown, FileText, Receipt, Sparkles,
  X, Loader2, CheckCircle, XCircle, Settings, AlertCircle,
} from 'lucide-react';
import API from '../services/api';
import { useAuth } from '../Context/AuthContext.jsx';

// Same substitution logic as the report delivery modal — {{token}} → value.
function applyVars(str, vars) {
  if (typeof str !== 'string') return '';
  return str.replace(/\{\{(\w+)\}\}/g, (_, k) => (vars[k] ?? ''));
}

export default function SendMailDropdown({ patientId, patient }) {
  const { user } = useAuth();
  const [open, setOpen]               = useState(false);
  const [loadState, setLoadState]     = useState('idle');
  const [emailStatus, setEmailStatus] = useState(null);
  const [htmlEnabled, setHtmlEnabled] = useState(false);
  const [selected, setSelected]       = useState({ smart_report: true, invoice: false, ai_report: false });
  const [emailTo, setEmailTo]         = useState('');
  const [sending, setSending]         = useState(false);
  const [result, setResult]           = useState(null);
  const [customSubject, setCustomSubject] = useState('');
  const [customBody, setCustomBody]       = useState('');

  const panelRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (patient?.contact?.email) setEmailTo(patient.contact.email);
  }, [patient?.contact?.email]);

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
      const [statusRes, dsRes] = await Promise.allSettled([
        API.get(`/email/patient-status/${patientId}`),
        API.get('/report/delivery-settings'),
      ]);

      const status = statusRes.status === 'fulfilled' ? statusRes.value.data : null;
      const ds     = dsRes.status     === 'fulfilled' ? dsRes.value.data     : null;

      if (status) {
        setEmailStatus(status);
        if (!emailTo && status.patientEmail) setEmailTo(status.patientEmail);
        setSelected({
          smart_report: true,
          invoice:      !!status.latestInvoice,
          ai_report:    !!status.latestAiReport,
        });
      } else {
        setEmailStatus({ emailEnabled: false, hasSmtp: false, latestInvoice: null, latestAiReport: null });
      }

      if (ds?.htmlEmail?.enabled) setHtmlEnabled(true);

      // Pre-fill compose form from Settings → Send Email, placeholders replaced
      if (ds?.email) {
        const patientFullName = patient
          ? `${patient.first_name} ${patient.last_name || ''}`.trim()
          : '';
        const vars = {
          patientName:  patientFullName,
          firstName:    patient?.first_name || patientFullName,
          doctorName:   user?.name || '',
          clinicName:   user?.clinicName || user?.tenantName || '',
          date:         new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
          templateName: 'Visit Summary',
          // legacy aliases used in older templates
          name:         patientFullName,
          first_name:   patient?.first_name || '',
          doctor:       user?.name || '',
          clinic:       user?.clinicName || user?.tenantName || '',
        };
        setCustomSubject(applyVars(ds.email.subject || '', vars));
        setCustomBody(applyVars(ds.email.body    || '', vars));
      }
    } catch {
      setEmailStatus({ emailEnabled: false, hasSmtp: false, latestInvoice: null, latestAiReport: null });
    } finally {
      setLoadState('ready');
    }
  }

  function toggle(key) { setSelected(s => ({ ...s, [key]: !s[key] })); }

  function selectAll() {
    setSelected({
      smart_report: true,
      invoice:   !!emailStatus?.latestInvoice,
      ai_report: !!emailStatus?.latestAiReport,
    });
  }

  async function handleSend() {
    const include = Object.keys(selected).filter(k => selected[k]);
    if (!include.length || !emailTo.trim()) return;
    setSending(true);
    setResult(null);
    try {
      const payload = {
        patient_id: patientId,
        to:         emailTo.trim(),
        include,
        subject:    customSubject.trim() || undefined,
        body:       customBody.trim()    || undefined,
      };
      const res = await API.post('/email/send-treatment-summary', payload);
      const count = res.data.attachments?.length || 0;
      setResult({ ok: true, message: `Sent to ${res.data.to} — ${count} attachment${count !== 1 ? 's' : ''}` });
    } catch (err) {
      setResult({ ok: false, message: err.response?.data?.error || err.message });
    } finally {
      setSending(false);
    }
  }

  const anySelected  = Object.values(selected).some(Boolean);
  const missingEmail = loadState === 'ready' && emailStatus?.emailEnabled && !emailStatus?.hasPatientEmail;
  const patientName  = emailStatus?.patientName || patient?.first_name || '';
  const automationActive = !!(emailStatus?.automationActive);

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={automationActive ? undefined : handleOpen}
        disabled={automationActive}
        title={automationActive ? 'Appointment-completed automation is on — manual send is disabled' : undefined}
        className={`px-4 py-2 border font-medium rounded-lg flex items-center gap-2 transition-colors text-sm ${
          automationActive
            ? 'border-slate-200 text-slate-400 bg-slate-50 cursor-not-allowed opacity-60'
            : 'border-slate-300 text-slate-600 hover:bg-slate-50 cursor-pointer'
        }`}
      >
        <Mail size={16} />
        Send Mail
        <ChevronDown size={14} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {automationActive && (
        <p className="mt-1 text-[11px] text-amber-600 flex items-center gap-1">
          <AlertCircle size={11} /> Auto-email on — disable in Settings
        </p>
      )}

      {open && !automationActive && (
        <div className="absolute bottom-full mb-2 right-0 w-[420px] bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden">
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
            {loadState === 'loading' && (
              <div className="flex justify-center py-6">
                <Loader2 size={22} className="animate-spin text-[#137fec]" />
              </div>
            )}

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
                  <Settings size={11} /> Go to Settings
                </button>
              </div>
            )}

            {loadState === 'ready' && emailStatus?.emailEnabled && (
              <>
                {missingEmail && (
                  <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 flex items-start gap-2">
                    <AlertCircle size={14} className="text-orange-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-orange-700 leading-relaxed">
                      No email on file for {patientName ? <strong>{patientName}</strong> : 'this patient'}.
                      Enter it below or update the patient record.
                    </p>
                  </div>
                )}

                {/* What to include */}
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Include</p>
                  <button onClick={selectAll} className="text-[11px] text-[#137fec] hover:underline font-medium">Select All</button>
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

                {/* Message composer — pre-filled from Settings → Send Email */}
                <div className="pt-1 border-t border-slate-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Message</p>
                    <div className="flex items-center gap-2">
                      {htmlEnabled && (
                        <span className="text-[10px] font-semibold bg-[#137fec]/10 text-[#137fec] px-2 py-0.5 rounded-full">
                          Rich HTML
                        </span>
                      )}
                      <button
                        onClick={() => { setOpen(false); navigate('/settings#send_email'); }}
                        className="text-[11px] text-slate-400 hover:text-slate-600 flex items-center gap-0.5"
                        title="Edit template in Settings"
                      >
                        <Settings size={11} /> Edit template
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 border border-slate-200 rounded-xl p-3 bg-slate-50">
                    <div>
                      <label className="text-[11px] text-slate-500 block mb-0.5">Subject</label>
                      <input
                        type="text"
                        value={customSubject}
                        onChange={e => setCustomSubject(e.target.value)}
                        placeholder="Email subject…"
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-[#137fec] outline-none bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-500 block mb-0.5">Body</label>
                      <textarea
                        value={customBody}
                        onChange={e => setCustomBody(e.target.value)}
                        rows={5}
                        placeholder="Email body…"
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-[#137fec] outline-none bg-white resize-none font-mono"
                      />
                    </div>
                  </div>
                </div>

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
