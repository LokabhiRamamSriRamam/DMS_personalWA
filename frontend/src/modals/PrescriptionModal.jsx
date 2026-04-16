import { useState, useEffect } from 'react';
import { Printer, X } from 'lucide-react';
import API from '../services/api';

// ── Update these with your clinic details ─────────────────────────────────────
const CLINIC = {
  name:    'Dental Clinic',
  tagline: 'Your Smile, Our Priority',
  phone:   '+91 98765 43210',
  address: '123 Main Street, City, State – 000000',
  email:   'info@dentalclinic.com',
};
// ─────────────────────────────────────────────────────────────────────────────

function SectionBlock({ title, rx, children }) {
  return (
    <div className="mb-5">
      <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-1 mb-2 flex items-center gap-1.5">
        {rx && <span className="text-lg font-bold text-[#137fec] leading-none">℞</span>}
        {title}
      </h4>
      {children}
    </div>
  );
}

const DONE = ['Completed', 'Cancelled', 'No Show'];

export default function PrescriptionModal({ isOpen, onClose, patient, visits, doctorName }) {
  const [nextRecall, setNextRecall] = useState(null);

  useEffect(() => {
    if (!isOpen || !patient?._id) return;
    API.get(`/appointments/patient/${patient._id}`).then(res => {
      const now  = new Date();
      const next = (Array.isArray(res.data) ? res.data : [])
        .filter(a => !DONE.includes(a.status) && new Date(a.start_time) >= now)
        .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))[0] || null;
      setNextRecall(next);
    }).catch(() => {});
  }, [isOpen, patient?._id]);

  if (!isOpen || !patient) return null;

  const age      = patient.dob ? new Date().getFullYear() - new Date(patient.dob).getFullYear() : '-';
  const fullName = `${patient.first_name} ${patient.last_name || ''}`.trim();
  const today    = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  const sorted = [...visits].sort((a, b) => new Date(b.date) - new Date(a.date));

  const todayIso = new Date().toISOString().slice(0, 10);
  const isToday  = d => !!d && new Date(d).toISOString().slice(0, 10) === todayIso;

  // Observation: latest diagnosis_notes from findings
  const latestFindings = sorted.find(v => v.findings?.diagnosis_notes)?.findings?.diagnosis_notes || '';

  // Latest consultation note from today (HTML)
  const allNotes = sorted
    .flatMap(v => (v.consultation_notes || []).map(n => ({ ...n, visitDate: v.date })))
    .filter(n => isToday(n.created_at))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const latestNote = allNotes[0] || null;

  // Prescriptions from today's visit only
  const prescriptions = sorted.find(v => v.prescriptions?.length > 0 && isToday(v.date))?.prescriptions || [];

  // Latest advice from today (HTML)
  const allAdvices = sorted
    .flatMap(v => (v.advices || []).map(a => ({ ...a, visitDate: v.date })))
    .filter(a => isToday(a.created_at))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const latestAdvice = allAdvices[0] || null;

  // ── Print ──────────────────────────────────────────────────────────────────
  function handlePrint() {
    const rxRows = prescriptions.map((p, i) => `
      <tr>
        <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;">${i + 1}. ${p.drug_name}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;text-align:center;">${p.dosage || '-'}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;text-align:center;">${p.duration || '-'}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;">${p.instructions || '-'}</td>
      </tr>`).join('');

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Prescription – ${fullName}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: Arial, sans-serif; color: #1a202c; font-size: 13px; padding: 32px 40px; }

    .clinic-header { text-align:center; border-bottom:2.5px solid #137fec; padding-bottom:14px; margin-bottom:16px; }
    .clinic-name   { font-size:24px; font-weight:700; color:#137fec; letter-spacing:-0.5px; }
    .clinic-tagline{ font-size:12px; color:#718096; margin-top:3px; font-style:italic; }
    .clinic-contact{ font-size:12px; color:#4a5568; margin-top:8px; display:flex; justify-content:center; gap:18px; flex-wrap:wrap; }

    .meta-row { display:flex; justify-content:space-between; align-items:baseline; margin-bottom:10px; }
    .doctor   { font-size:14px; font-weight:700; }
    .date-lbl { font-size:12px; color:#718096; }

    .patient-strip { background:#ebf8ff; border:1px solid #bee3f8; border-radius:6px; padding:8px 14px;
      margin-bottom:18px; display:flex; flex-wrap:wrap; gap:16px; font-size:12px; align-items:center; }
    .patient-strip .pname { font-size:14px; font-weight:700; }

    .section       { margin-bottom:16px; }
    .section-title { font-size:10.5px; font-weight:700; text-transform:uppercase; letter-spacing:0.08em;
      color:#718096; border-bottom:1px solid #e2e8f0; padding-bottom:4px; margin-bottom:8px; display:flex; align-items:center; gap:5px; }
    .rx-sym        { font-size:20px; font-weight:800; color:#137fec; line-height:1; }
    .section-body  { font-size:13px; color:#2d3748; line-height:1.65; }

    table { width:100%; border-collapse:collapse; font-size:13px; }
    th    { background:#f7fafc; text-align:left; padding:7px 10px; font-size:11px; font-weight:700;
      text-transform:uppercase; letter-spacing:0.05em; color:#718096; border-bottom:2px solid #e2e8f0; }

    .html-content ul { list-style:disc; padding-left:18px; }
    .html-content ol { list-style:decimal; padding-left:18px; }
    .html-content li { margin:3px 0; }

    .recall-box    { margin-bottom:16px; padding:8px 14px; border:1px dashed #bee3f8;
      border-radius:6px; background:#f0f9ff; font-size:13px; display:flex; align-items:center; gap:10px; }
    .recall-label  { font-size:10.5px; font-weight:700; text-transform:uppercase; letter-spacing:0.07em;
      color:#718096; margin-right:6px; }
    .recall-date   { font-weight:700; color:#137fec; }

    .signature     { margin-top:16px; text-align:right; }
    .sign-space    { height:56px; }
    .sig-line      { display:inline-block; min-width:160px; border-top:1px solid #4a5568;
      padding-top:5px; text-align:center; font-size:12px; }
    .sig-sub       { font-size:10px; color:#718096; margin-top:2px; }

    .footer { margin-top:24px; border-top:1px solid #e2e8f0; padding-top:8px;
      display:flex; justify-content:space-between; font-size:10.5px; color:#a0aec0; }

    @page { margin: 0.5in; }
  </style>
</head>
<body>

  <div class="clinic-header">
    <div class="clinic-name">${CLINIC.name}</div>
    ${CLINIC.tagline ? `<div class="clinic-tagline">${CLINIC.tagline}</div>` : ''}
    <div class="clinic-contact">
      <span>📞 ${CLINIC.phone}</span>
      ${CLINIC.address ? `<span>📍 ${CLINIC.address}</span>` : ''}
      ${CLINIC.email   ? `<span>✉ ${CLINIC.email}</span>` : ''}
    </div>
  </div>

  <div class="meta-row">
    <div class="doctor">Dr. ${doctorName || 'Doctor'}</div>
    <div class="date-lbl">Date: ${today}</div>
  </div>

  <div class="patient-strip">
    <span class="pname">${fullName}</span>
    <span>Age: ${age} yrs</span>
    <span>Gender: ${patient.gender || '-'}</span>
    <span>ID: ${patient.patientId || '-'}</span>
    ${patient.contact?.mobile ? `<span>📞 ${patient.contact.mobile}</span>` : ''}
  </div>

  ${patient.chief_complaint ? `
  <div class="section">
    <div class="section-title">Chief Complaints</div>
    <div class="section-body">${patient.chief_complaint}</div>
  </div>` : ''}

  ${(latestFindings || latestNote) ? `
  <div class="section">
    <div class="section-title">Observation / Findings</div>
    <div class="section-body">
      ${latestFindings ? `<p style="margin-bottom:5px">${latestFindings}</p>` : ''}
      ${latestNote ? `<div class="html-content">${latestNote.content}</div>` : ''}
    </div>
  </div>` : ''}

  ${prescriptions.length > 0 ? `
  <div class="section">
    <div class="section-title"><span class="rx-sym">℞</span> Prescription</div>
    <table>
      <thead>
        <tr>
          <th>Medicine</th>
          <th style="text-align:center;width:110px;">Dosage</th>
          <th style="text-align:center;width:100px;">Duration</th>
          <th>Instructions</th>
        </tr>
      </thead>
      <tbody>${rxRows}</tbody>
    </table>
  </div>` : ''}

  ${latestAdvice ? `
  <div class="section">
    <div class="section-title">Advice</div>
    <div class="section-body html-content">${latestAdvice.content}</div>
  </div>` : ''}

  ${nextRecall ? `
  <div class="recall-box">
    <span class="recall-label">Next Recall</span>
    <span class="recall-date">
      ${new Date(nextRecall.start_time).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
    </span>
    <span style="font-size:12px;color:#718096;">
      ${new Date(nextRecall.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      ${nextRecall.title ? '&nbsp;·&nbsp;' + nextRecall.title : ''}
    </span>
  </div>` : ''}

  <div class="signature">
    <div class="sign-space"></div>
    <div class="sig-line">Dr. ${doctorName || 'Doctor'}</div>
    <div class="sig-sub">Signature &amp; Stamp</div>
  </div>

  <div class="footer">
    <span>${CLINIC.name}</span>
    <span>Generated on ${today}</span>
  </div>

</body>
</html>`;

    const win = window.open('', '_blank', 'width=820,height=940');
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
  }

  // ── Preview ────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-bold text-lg text-slate-800">Prescription Preview</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-[#137fec] text-white rounded-lg hover:bg-blue-600 text-sm font-semibold transition-colors"
            >
              <Printer size={16} /> Print
            </button>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Scrollable preview */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* Clinic header */}
          <div className="text-center border-b-2 border-[#137fec] pb-4 mb-5">
            <p className="text-xl font-bold text-[#137fec]">{CLINIC.name}</p>
            {CLINIC.tagline && <p className="text-xs text-slate-400 italic mt-0.5">{CLINIC.tagline}</p>}
            <div className="flex items-center justify-center gap-4 mt-2 text-xs text-slate-500 flex-wrap">
              <span>📞 {CLINIC.phone}</span>
              {CLINIC.address && <span>📍 {CLINIC.address}</span>}
              {CLINIC.email   && <span>✉ {CLINIC.email}</span>}
            </div>
          </div>

          {/* Doctor + Date */}
          <div className="flex justify-between items-baseline mb-3">
            <p className="font-bold text-slate-800 text-sm">Dr. {doctorName || 'Doctor'}</p>
            <p className="text-xs text-slate-400">Date: {today}</p>
          </div>

          {/* Patient strip */}
          <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-2.5 mb-5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600 items-center">
            <span className="font-bold text-sm text-slate-800">{fullName}</span>
            <span>Age: {age} yrs</span>
            <span>Gender: {patient.gender || '-'}</span>
            <span>ID: {patient.patientId || '-'}</span>
            {patient.contact?.mobile && <span>📞 {patient.contact.mobile}</span>}
          </div>

          {/* Complaints */}
          {patient.chief_complaint && (
            <SectionBlock title="Chief Complaints">
              <p className="text-sm text-slate-700">{patient.chief_complaint}</p>
            </SectionBlock>
          )}

          {/* Observation */}
          {(latestFindings || latestNote) && (
            <SectionBlock title="Observation / Findings">
              {latestFindings && <p className="text-sm text-slate-700 mb-1">{latestFindings}</p>}
              {latestNote && (
                <div
                  className="text-sm text-slate-700 leading-relaxed
                    [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5"
                  dangerouslySetInnerHTML={{ __html: latestNote.content }}
                />
              )}
            </SectionBlock>
          )}

          {/* Rx */}
          {prescriptions.length > 0 && (
            <SectionBlock title="Prescription" rx>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-left text-[10px] font-bold uppercase text-slate-400">
                    <th className="px-2 py-1.5 border-b border-slate-200">Medicine</th>
                    <th className="px-2 py-1.5 border-b border-slate-200 text-center w-24">Dosage</th>
                    <th className="px-2 py-1.5 border-b border-slate-200 text-center w-20">Duration</th>
                    <th className="px-2 py-1.5 border-b border-slate-200">Instructions</th>
                  </tr>
                </thead>
                <tbody>
                  {prescriptions.map((p, i) => (
                    <tr key={p._id || i} className="border-b border-slate-50">
                      <td className="px-2 py-1.5 font-medium text-slate-800">{i + 1}. {p.drug_name}</td>
                      <td className="px-2 py-1.5 text-slate-600 text-center">{p.dosage || '-'}</td>
                      <td className="px-2 py-1.5 text-slate-600 text-center">{p.duration || '-'}</td>
                      <td className="px-2 py-1.5 text-slate-600">{p.instructions || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </SectionBlock>
          )}

          {/* Advice */}
          {latestAdvice && (
            <SectionBlock title="Advice">
              <div
                className="text-sm text-slate-700 leading-relaxed
                  [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5"
                dangerouslySetInnerHTML={{ __html: latestAdvice.content }}
              />
            </SectionBlock>
          )}

          {/* Next Recall */}
          {nextRecall && (
            <div className="flex items-center gap-3 mb-5 px-4 py-2.5 border border-dashed border-blue-200 bg-blue-50/60 rounded-lg text-sm">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Next Recall</span>
              <span className="font-bold text-[#137fec]">
                {new Date(nextRecall.start_time).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
              <span className="text-slate-400 text-xs">
                {new Date(nextRecall.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                {nextRecall.title ? ` · ${nextRecall.title}` : ''}
              </span>
            </div>
          )}

          {/* Signature */}
          <div className="mt-4 flex justify-end">
            <div className="text-center">
              <div className="h-14" /> {/* signing space */}
              <div className="border-t border-slate-400 pt-1.5 min-w-[140px]">
                <p className="text-xs font-semibold text-slate-700">Dr. {doctorName || 'Doctor'}</p>
                <p className="text-[10px] text-slate-400">Signature &amp; Stamp</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
