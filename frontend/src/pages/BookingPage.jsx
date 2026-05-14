import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const pub  = (tid, path) => `${BASE}/public/${tid}/booking${path}`;

const DAYS       = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
const DAY_SHORT  = ['Su','Mo','Tu','We','Th','Fr','Sa'];
const MONTHS     = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTHS_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December'];

// ── Gradient avatars by index ─────────────────────────────────────────────────
const AVATAR_COLORS = [
  'from-violet-500 to-purple-600',
  'from-blue-500 to-cyan-600',
  'from-emerald-500 to-teal-600',
  'from-orange-500 to-amber-600',
  'from-pink-500 to-rose-600',
  'from-indigo-500 to-blue-600',
];

// ── Calendar ──────────────────────────────────────────────────────────────────
function Calendar({ selected, onSelect, blockedDates = [], workingHours = {} }) {
  const [view, setView] = useState(() => {
    const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() };
  });
  const today = new Date(); today.setHours(0,0,0,0);
  const first = new Date(view.y, view.m, 1);
  const last  = new Date(view.y, view.m + 1, 0);
  const pad   = first.getDay();
  const cells = Array(pad).fill(null);
  for (let d = 1; d <= last.getDate(); d++) cells.push(new Date(view.y, view.m, d));

  const isDisabled = d => {
    if (!d) return true;
    if (d < today) return true;
    if (!workingHours[DAYS[d.getDay()]]?.isOpen) return true;
    return blockedDates.some(b => {
      // b.date is stored as UTC ISO — read UTC fields to avoid TZ shift
      const bd = new Date(b.date);
      return bd.getUTCFullYear() === d.getFullYear() &&
             bd.getUTCMonth()    === d.getMonth()    &&
             bd.getUTCDate()     === d.getDate();
    });
  };
  const isSel   = d => d && selected && d.toDateString() === selected.toDateString();
  const isToday = d => d && d.toDateString() === today.toDateString();

  return (
    <div className="select-none">
      {/* Nav */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setView(v => v.m === 0 ? { y: v.y-1, m: 11 } : { y: v.y, m: v.m-1 })}
          className="w-9 h-9 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
        </button>
        <span className="font-bold text-slate-800">{MONTHS_FULL[view.m]} {view.y}</span>
        <button
          onClick={() => setView(v => v.m === 11 ? { y: v.y+1, m: 0 } : { y: v.y, m: v.m+1 })}
          className="w-9 h-9 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
        </button>
      </div>
      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_SHORT.map(d => (
          <div key={d} className="text-center text-[11px] font-semibold text-slate-400 py-1">{d}</div>
        ))}
      </div>
      {/* Cells */}
      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((date, i) => {
          if (!date) return <div key={i} />;
          const dis = isDisabled(date);
          const sel = isSel(date);
          const tod = isToday(date);
          return (
            <button
              key={i}
              disabled={dis}
              onClick={() => onSelect(date)}
              className={`
                relative h-10 w-full rounded-xl text-sm font-medium transition-all
                ${sel
                  ? 'bg-[#137fec] text-white shadow-md shadow-blue-200'
                  : dis
                    ? 'text-slate-300 cursor-not-allowed'
                    : tod
                      ? 'text-[#137fec] font-bold hover:bg-blue-50'
                      : 'text-slate-700 hover:bg-blue-50 hover:text-[#137fec]'
                }
              `}
            >
              {date.getDate()}
              {tod && !sel && <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#137fec]" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Step indicator ────────────────────────────────────────────────────────────
function Steps({ step }) {
  const labels = ['Doctor', 'Date & Time', 'Your Info', 'Review'];
  return (
    <div className="flex items-center w-full mb-8">
      {labels.map((label, i) => (
        <React.Fragment key={i}>
          <div className="flex flex-col items-center shrink-0">
            <div className={`
              w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all
              ${i < step  ? 'bg-[#137fec] text-white' :
                i === step ? 'bg-[#137fec] text-white ring-4 ring-blue-100' :
                             'bg-slate-100 text-slate-400'}
            `}>
              {i < step
                ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>
                : i + 1
              }
            </div>
            <span className={`text-[10px] font-semibold mt-1 hidden sm:block ${i <= step ? 'text-[#137fec]' : 'text-slate-400'}`}>
              {label}
            </span>
          </div>
          {i < labels.length - 1 && (
            <div className={`flex-1 h-0.5 mx-1 mb-3 sm:mb-5 transition-colors ${i < step ? 'bg-[#137fec]' : 'bg-slate-200'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ── Back button ───────────────────────────────────────────────────────────────
function Back({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-5 transition-colors group"
    >
      <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
      </svg>
      Back
    </button>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function BookingPage() {
  const { tenantId } = useParams();

  const [config, setConfig]       = useState(null);
  const [pageLoading, setLoading] = useState(true);
  const [pageError, setError]     = useState('');

  const [step, setStep]     = useState(0);
  const [doctor, setDoctor] = useState(null);
  const [date, setDate]     = useState(null);
  const [slots, setSlots]   = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [time, setTime]     = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [bookingRef, setBookingRef] = useState('');

  const [form, setForm]           = useState({ phone: '', name: '', email: '', dob: '', gender: '', chiefComplaint: '' });
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    axios.get(pub(tenantId, '/config'))
      .then(r => setConfig(r.data))
      .catch(() => setError('Could not load booking page. Please try again.'))
      .finally(() => setLoading(false));
  }, [tenantId]);

  useEffect(() => {
    if (!doctor || !date) return;
    setSlotsLoading(true);
    setTime('');
    const ds = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
    axios.get(pub(tenantId, `/slots?doctorId=${doctor._id}&date=${ds}`))
      .then(r => setSlots(r.data.slots || []))
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false));
  }, [doctor, date, tenantId]);

  function validateForm() {
    const e = {};
    if (!form.phone.trim()) e.phone = 'WhatsApp number is required';
    else if (!/\d{10}/.test(form.phone.replace(/\D/g,''))) e.phone = 'Enter a valid 10-digit number';
    setFormErrors(e);
    return !Object.keys(e).length;
  }

  async function handleSubmit() {
    if (!validateForm()) return;
    setSubmitting(true);
    try {
      const ds = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
      const res = await axios.post(pub(tenantId, ''), { doctorId: doctor._id, date: ds, time, patient: form });
      setBookingRef(res.data.appointmentId);
      setStep(4);
    } catch (err) {
      alert(err.response?.data?.message || 'Booking failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  // ── Loading ──
  if (pageLoading) return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-[3px] border-[#137fec] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-500 font-medium">Loading…</p>
      </div>
    </div>
  );

  // ── Error / disabled ──
  if (pageError || (config && !config.bookingEnabled)) return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl p-10 max-w-sm w-full text-center">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
          </svg>
        </div>
        <h2 className="text-lg font-bold text-slate-800 mb-2">Booking Unavailable</h2>
        <p className="text-sm text-slate-500 leading-relaxed">
          {pageError || 'Online booking is currently disabled. Please contact the clinic directly.'}
        </p>
      </div>
    </div>
  );

  const clinicInitial = (config.clinicName || 'C').charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-white">

      {/* ── Top header ── */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          {config.clinicLogoUrl ? (
            <img src={config.clinicLogoUrl} alt="" className="w-9 h-9 rounded-xl object-contain shrink-0" />
          ) : (
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#137fec] to-blue-700 flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-sm">{clinicInitial}</span>
            </div>
          )}
          <div className="min-w-0">
            <p className="font-bold text-slate-900 text-sm leading-tight truncate">{config.clinicName || 'Clinic'}</p>
            {config.clinicTagline && (
              <p className="text-[11px] text-slate-400 truncate">{config.clinicTagline}</p>
            )}
          </div>
          {step > 0 && step < 4 && (
            <div className="ml-auto shrink-0">
              <span className="text-xs text-slate-400 font-medium">Step {step}/3</span>
            </div>
          )}
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 pt-6 pb-28">

        {step < 4 && <Steps step={step} />}

        {/* ══ Step 0: Doctor ══ */}
        {step === 0 && (
          <div>
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-slate-900 mb-1">Book an Appointment</h1>
              <p className="text-slate-500 text-sm">Choose a doctor to get started</p>
            </div>

            {config.doctors.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
                <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-7 h-7 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                  </svg>
                </div>
                <p className="text-slate-500 text-sm font-medium">No doctors available for online booking at this time.</p>
                <p className="text-slate-400 text-xs mt-1">Please contact the clinic directly.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {config.doctors.map((doc, idx) => (
                  <button
                    key={doc._id}
                    onClick={() => { setDoctor(doc); setDate(null); setTime(''); setStep(1); }}
                    className="w-full bg-white rounded-2xl border border-slate-200 hover:border-[#137fec]/40 hover:shadow-lg hover:shadow-blue-50 p-4 text-left transition-all group flex items-center gap-4"
                  >
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${AVATAR_COLORS[idx % AVATAR_COLORS.length]} flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform`}>
                      <span className="text-white font-bold text-xl">{doc.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-900 group-hover:text-[#137fec] transition-colors text-base">
                        Dr. {doc.name}
                      </p>
                      {doc.specialization && (
                        <p className="text-sm text-slate-500 mt-0.5">{doc.specialization}</p>
                      )}
                      {(doc.qualification || doc.experience_years > 0) && (
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          {doc.qualification && (
                            <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">{doc.qualification}</span>
                          )}
                          {doc.experience_years > 0 && (
                            <span className="text-[11px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-medium">{doc.experience_years} yrs exp</span>
                          )}
                        </div>
                      )}
                    </div>
                    <svg className="w-5 h-5 text-slate-300 group-hover:text-[#137fec] group-hover:translate-x-1 transition-all shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                    </svg>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══ Step 1: Date & Time ══ */}
        {step === 1 && (
          <div>
            <Back onClick={() => setStep(0)} />

            {/* Selected doctor pill */}
            <div className="flex items-center gap-3 mb-6">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${AVATAR_COLORS[config.doctors.findIndex(d => d._id === doctor?._id) % AVATAR_COLORS.length]} flex items-center justify-center shrink-0`}>
                <span className="text-white font-bold">{doctor?.name.charAt(0)}</span>
              </div>
              <div>
                <p className="font-bold text-slate-900">Dr. {doctor?.name}</p>
                {doctor?.specialization && <p className="text-xs text-slate-500">{doctor.specialization}</p>}
              </div>
            </div>

            <h2 className="text-xl font-bold text-slate-900 mb-1">Pick a Date</h2>
            <p className="text-sm text-slate-500 mb-5">Select an available date from the calendar</p>

            {/* Calendar card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-5 shadow-sm">
              <Calendar
                selected={date}
                onSelect={d => { setDate(d); setTime(''); }}
                blockedDates={config.blockedDates}
                workingHours={doctor?.bookingWorkingHours || {}}
              />
            </div>

            {/* Time slots */}
            {date && (
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <p className="text-sm font-bold text-slate-800 mb-1">
                  Available Times
                </p>
                <p className="text-xs text-slate-400 mb-4">
                  {date.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
                {slotsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-6 h-6 border-2 border-[#137fec] border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : slots.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-sm text-slate-400 font-medium">No available slots on this date</p>
                    <p className="text-xs text-slate-400 mt-1">Try selecting a different date</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                    {slots.map(s => (
                      <button
                        key={s}
                        onClick={() => setTime(s)}
                        className={`
                          py-2.5 rounded-xl text-sm font-semibold border transition-all
                          ${time === s
                            ? 'bg-[#137fec] text-white border-[#137fec] shadow-md shadow-blue-200'
                            : 'border-slate-200 text-slate-700 hover:border-[#137fec] hover:text-[#137fec] hover:bg-blue-50'}
                        `}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ══ Step 2: Patient details ══ */}
        {step === 2 && (
          <div>
            <Back onClick={() => setStep(1)} />
            <h2 className="text-xl font-bold text-slate-900 mb-1">Your Details</h2>
            <p className="text-sm text-slate-500 mb-6">WhatsApp number is required — rest is optional</p>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  WhatsApp Number <span className="text-red-500">*</span>
                </label>
                <div className={`flex items-center border rounded-xl overflow-hidden transition-colors ${formErrors.phone ? 'border-red-400' : 'border-slate-200 focus-within:border-[#137fec]'}`}>
                  <div className="px-3 py-2.5 bg-slate-50 border-r border-slate-200 text-sm text-slate-500 font-medium shrink-0">+91</div>
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="98765 43210"
                    className="flex-1 px-3 py-2.5 text-sm outline-none bg-white text-slate-800 placeholder:text-slate-300"
                  />
                </div>
                {formErrors.phone && <p className="text-xs text-red-500 mt-1">{formErrors.phone}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Priya Sharma"
                  className="w-full border border-slate-200 focus:border-[#137fec] rounded-xl px-4 py-2.5 text-sm outline-none transition-colors text-slate-800 placeholder:text-slate-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="you@email.com"
                    className="w-full border border-slate-200 focus:border-[#137fec] rounded-xl px-4 py-2.5 text-sm outline-none transition-colors text-slate-800 placeholder:text-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Date of Birth</label>
                  <input
                    type="date"
                    value={form.dob}
                    onChange={e => setForm(f => ({ ...f, dob: e.target.value }))}
                    className="w-full border border-slate-200 focus:border-[#137fec] rounded-xl px-4 py-2.5 text-sm outline-none transition-colors text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Gender</label>
                <div className="flex gap-2">
                  {['Male','Female','Other'].map(g => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, gender: f.gender === g ? '' : g }))}
                      className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-all ${
                        form.gender === g ? 'bg-[#137fec] text-white border-[#137fec]' : 'border-slate-200 text-slate-600 hover:border-[#137fec] hover:text-[#137fec]'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Reason for Visit</label>
                <textarea
                  value={form.chiefComplaint}
                  onChange={e => setForm(f => ({ ...f, chiefComplaint: e.target.value }))}
                  rows={3}
                  placeholder="e.g. Toothache, dental cleaning, sensitivity…"
                  className="w-full border border-slate-200 focus:border-[#137fec] rounded-xl px-4 py-2.5 text-sm outline-none transition-colors resize-none text-slate-800 placeholder:text-slate-300"
                />
              </div>
            </div>
          </div>
        )}

        {/* ══ Step 3: Review ══ */}
        {step === 3 && (
          <div>
            <Back onClick={() => setStep(2)} />
            <h2 className="text-xl font-bold text-slate-900 mb-1">Review & Confirm</h2>
            <p className="text-sm text-slate-500 mb-6">Please verify your booking details before submitting</p>

            {/* Appointment summary */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-4">
              <div className="bg-gradient-to-r from-[#137fec] to-blue-600 p-5 text-white">
                <p className="text-xs font-semibold opacity-70 uppercase tracking-wider mb-1">Appointment</p>
                <p className="text-lg font-bold">Dr. {doctor?.name}</p>
                <p className="text-sm opacity-80 mt-0.5">{doctor?.specialization}</p>
              </div>
              <div className="p-5 space-y-3">
                <ReviewRow icon="📅" label="Date" value={date?.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} />
                <ReviewRow icon="🕐" label="Time" value={time} />
                <div className="border-t border-slate-100 pt-3 mt-3 space-y-3">
                  <ReviewRow icon="📱" label="WhatsApp" value={form.phone} />
                  {form.name           && <ReviewRow icon="👤" label="Name"      value={form.name} />}
                  {form.email          && <ReviewRow icon="✉️" label="Email"     value={form.email} />}
                  {form.gender         && <ReviewRow icon="⚧"  label="Gender"   value={form.gender} />}
                  {form.chiefComplaint && <ReviewRow icon="💬" label="Reason"   value={form.chiefComplaint} />}
                </div>
              </div>
            </div>

            <p className="text-center text-xs text-slate-400 mb-2">
              The clinic will confirm your appointment via WhatsApp.
            </p>
          </div>
        )}

        {/* ══ Step 4: Success ══ */}
        {step === 4 && (
          <div className="flex flex-col items-center text-center pt-6 pb-4">
            <div className="relative mb-6">
              <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center">
                <svg className="w-12 h-12 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
                </svg>
              </div>
              <div className="absolute -top-1 -right-1 w-7 h-7 bg-yellow-400 rounded-full flex items-center justify-center text-sm">🎉</div>
            </div>

            <h2 className="text-2xl font-bold text-slate-900 mb-2">Booking Received!</h2>
            <p className="text-slate-500 text-sm max-w-xs leading-relaxed mb-6">
              Your appointment request has been submitted. The clinic will confirm via WhatsApp shortly.
            </p>

            {bookingRef && (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 mb-6 w-full max-w-xs">
                <p className="text-xs text-slate-400 font-medium mb-1">Reference ID</p>
                <p className="font-mono text-base font-bold text-slate-800">{bookingRef}</p>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 w-full max-w-xs text-left space-y-2.5">
              <p className="text-sm font-bold text-blue-800 mb-3">What happens next?</p>
              {[
                'The clinic team will review your request',
                'You\'ll receive a WhatsApp confirmation',
                'Please arrive 10 minutes early',
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-blue-200 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-blue-700 text-xs font-bold">{i+1}</span>
                  </div>
                  <p className="text-sm text-blue-700">{item}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Sticky bottom action bar (steps 1–3) ── */}
      {step >= 1 && step <= 3 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-md border-t border-slate-100 px-4 py-3 safe-bottom">
          <div className="max-w-2xl mx-auto">
            {step === 1 && (
              <button
                disabled={!date || !time}
                onClick={() => setStep(2)}
                className="w-full py-3.5 rounded-2xl bg-[#137fec] text-white font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
              >
                {!date ? 'Select a date' : !time ? 'Select a time slot' : `Continue — ${MONTHS[date.getMonth()]} ${date.getDate()} at ${time}`}
              </button>
            )}
            {step === 2 && (
              <button
                onClick={() => validateForm() && setStep(3)}
                className="w-full py-3.5 rounded-2xl bg-[#137fec] text-white font-bold text-sm hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
              >
                Review Booking
              </button>
            )}
            {step === 3 && (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full py-3.5 rounded-2xl bg-emerald-500 text-white font-bold text-sm disabled:opacity-60 hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-200"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Confirming…
                  </span>
                ) : 'Confirm Booking'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ReviewRow({ icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-base shrink-0 mt-0.5">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-400 font-medium">{label}</p>
        <p className="text-sm font-semibold text-slate-800 mt-0.5 break-words">{value}</p>
      </div>
    </div>
  );
}
