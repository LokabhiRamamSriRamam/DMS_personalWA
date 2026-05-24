import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MessageSquare, ChevronDown, FileText, Receipt, Sparkles,
  X, Loader2, CheckCircle, XCircle, Settings, AlertCircle,
} from 'lucide-react';
import API from '../services/api';

export default function SendWhatsAppDropdown({ patientId, patient, fullWidth }) {
  const [open, setOpen]             = useState(false);
  const [loadState, setLoadState]   = useState('idle');
  const [waStatus, setWaStatus]     = useState(null);   // { connected, patientPhone, latestInvoice, latestAiReport }
  const [selected, setSelected]     = useState({ smart_report: true, invoice: false, ai_report: false });
  const [phoneTo, setPhoneTo]       = useState('');
  const [sending, setSending]       = useState(false);
  const [result, setResult]         = useState(null);

  const panelRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const mobile = patient?.contact?.mobile || patient?.contact?.phone || '';
    if (mobile) setPhoneTo(mobile);
  }, [patient?.contact?.mobile, patient?.contact?.phone]);

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
      const [sessionRes, statusRes] = await Promise.all([
        API.get('/wasender/session/status').catch(() => ({ data: {} })),
        API.get(`/email/patient-status/${patientId}`).catch(() => ({ data: {} })),
      ]);
      const connected = sessionRes.data?.status === 'connected' || sessionRes.data?.sessionStatus === 'connected';
      const emailStatus = statusRes.data || {};
      setWaStatus({
        connected,
        patientPhone:   patient?.contact?.mobile || patient?.contact?.phone || '',
        latestInvoice:  emailStatus.latestInvoice  || null,
        latestAiReport: emailStatus.latestAiReport || null,
        patientName:    emailStatus.patientName || '',
      });
      setSelected({
        smart_report: true,
        invoice:      !!emailStatus.latestInvoice,
        ai_report:    !!emailStatus.latestAiReport,
      });
    } catch {
      setWaStatus({ connected: false });
    } finally {
      setLoadState('ready');
    }
  }

  function toggle(key) {
    setSelected(s => ({ ...s, [key]: !s[key] }));
  }

  async function handleSend() {
    const include = Object.keys(selected).filter(k => selected[k]);
    if (!include.length || !phoneTo.trim()) return;
    setSending(true);
    setResult(null);
    try {
      const res = await API.post('/email/send-whatsapp-documents', {
        patient_id: patientId,
        phone: phoneTo.trim(),
        include,
      });
      const count = res.data.sent?.length || 0;
      setResult({ ok: true, message: `Sent ${count} document${count !== 1 ? 's' : ''} to ${phoneTo.trim()}` });
    } catch (err) {
      setResult({ ok: false, message: err.response?.data?.error || err.message });
    } finally {
      setSending(false);
    }
  }

  const anySelected    = Object.values(selected).some(Boolean);
  const missingPhone   = loadState === 'ready' && waStatus?.connected && !phoneTo.trim();

  return (
    <div className={`relative ${fullWidth ? 'w-full' : ''}`} ref={panelRef}>
      <button
        onClick={handleOpen}
        className={`px-4 py-2 border border-green-300 text-green-700 font-medium rounded-lg hover:bg-green-50 flex items-center gap-2 transition-colors text-sm ${fullWidth ? 'w-full justify-center' : ''}`}
      >
        <MessageSquare size={16} />
        Send via WhatsApp
        <ChevronDown size={14} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute bottom-full mb-2 right-0 w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <p className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <MessageSquare size={14} className="text-green-600" /> Send Documents via WhatsApp
            </p>
            <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
              <X size={15} />
            </button>
          </div>

          <div className="p-4 space-y-3 max-h-[85vh] overflow-y-auto">
            {loadState === 'loading' && (
              <div className="flex justify-center py-6">
                <Loader2 size={22} className="animate-spin text-green-600" />
              </div>
            )}

            {loadState === 'ready' && !waStatus?.connected && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-1">
                <p className="text-xs font-semibold text-amber-700">WhatsApp not connected</p>
                <p className="text-xs text-amber-600">Connect your WhatsApp session in Settings to send documents.</p>
                <button
                  onClick={() => { setOpen(false); navigate('/settings'); }}
                  className="mt-1 text-xs text-green-600 underline flex items-center gap-1 hover:text-green-800"
                >
                  <Settings size={11} /> Go to Settings → WhatsApp
                </button>
              </div>
            )}

            {loadState === 'ready' && waStatus?.connected && (
              <>
                {missingPhone && (
                  <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 flex items-start gap-2">
                    <AlertCircle size={14} className="text-orange-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-orange-700 leading-relaxed">
                      No mobile number on file. Enter it manually below.
                    </p>
                  </div>
                )}

                {/* What to include */}
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Send Documents</p>
                </div>

                <WaItemRow
                  checked={selected.smart_report}
                  onChange={() => toggle('smart_report')}
                  icon={<FileText size={14} className="text-blue-500" />}
                  label="Smart Report"
                  sub="Treatments, prescriptions & notes PDF"
                  available
                />
                <WaItemRow
                  checked={selected.invoice}
                  onChange={() => toggle('invoice')}
                  icon={<Receipt size={14} className="text-green-500" />}
                  label="Invoice"
                  sub={
                    waStatus.latestInvoice
                      ? `${waStatus.latestInvoice.invoice_id} · ₹${waStatus.latestInvoice.total_amount}`
                      : 'No invoice on file'
                  }
                  available={!!waStatus.latestInvoice}
                />
                <WaItemRow
                  checked={selected.ai_report}
                  onChange={() => toggle('ai_report')}
                  icon={<Sparkles size={14} className="text-purple-500" />}
                  label="AI Report"
                  sub={
                    waStatus.latestAiReport
                      ? `${waStatus.latestAiReport.templateId} · ${new Date(waStatus.latestAiReport.createdAt).toLocaleDateString('en-IN')}`
                      : 'Not generated yet'
                  }
                  available={!!waStatus.latestAiReport}
                />

                {/* Phone number */}
                <div className="pt-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Send to</label>
                  <input
                    type="tel"
                    value={phoneTo}
                    onChange={e => setPhoneTo(e.target.value)}
                    placeholder="91XXXXXXXXXX (with country code)"
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-green-400 outline-none ${
                      missingPhone && !phoneTo.trim()
                        ? 'border-orange-300 bg-orange-50'
                        : 'border-slate-300'
                    }`}
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Include country code, no + or spaces. E.g. 919876543210</p>
                </div>

                {result && (
                  <div className={`flex items-start gap-2 p-3 rounded-xl text-xs font-medium ${
                    result.ok ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'
                  }`}>
                    {result.ok ? <CheckCircle size={13} className="flex-shrink-0 mt-0.5" /> : <XCircle size={13} className="flex-shrink-0 mt-0.5" />}
                    {result.message}
                  </div>
                )}

                <button
                  onClick={handleSend}
                  disabled={sending || !anySelected || !phoneTo.trim()}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sending
                    ? <><Loader2 size={14} className="animate-spin" /> Sending…</>
                    : <><MessageSquare size={14} /> Send via WhatsApp</>}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function WaItemRow({ checked, onChange, icon, label, sub, available }) {
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
        className="accent-green-600 w-4 h-4 flex-shrink-0"
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
