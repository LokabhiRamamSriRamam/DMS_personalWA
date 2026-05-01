import { useState, useEffect } from 'react';
import { Calendar, Clock, User, FileText, Plus, Loader2, Stethoscope, X } from 'lucide-react';
import API from '../services/api';
import NewAppointmentModal from '../modals/NewAppointmentModal.jsx';

const STATUS_STYLES = {
  'Completed':  'bg-green-50  text-green-700  border-green-200',
  'Cancelled':  'bg-red-50    text-red-600    border-red-200',
  'No Show':    'bg-slate-100 text-slate-500   border-slate-200',
  'Scheduled':  'bg-blue-50   text-blue-700   border-blue-200',
  'Confirmed':  'bg-blue-50   text-blue-700   border-blue-200',
  'Checked In': 'bg-purple-50 text-purple-700 border-purple-200',
  'In Progress':'bg-yellow-50 text-yellow-700 border-yellow-200',
};

function fmt(date) {
  return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
function fmtTime(date) {
  return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const DONE_STATUSES = ['Completed', 'Cancelled', 'No Show'];

/**
 * AppointmentTimeline
 *
 * Props:
 *  patientId   — string  (used to fetch)
 *  patient     — object  (passed to NewAppointmentModal as defaultPatient)
 *  buttonLabel — string  default "Add Appointment"
 *  onSelectDate — fn(dateStr)  called when a past appointment is clicked; dateStr is ISO date
 */
export default function AppointmentTimeline({ patientId, patient, buttonLabel = 'Add Appointment', onSelectDate }) {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [modalOpen, setModalOpen]       = useState(false);
  const [ctxMenu, setCtxMenu]           = useState(null); // { x, y, apptId }

  useEffect(() => {
    if (patientId) fetchAppointments();
  }, [patientId]);

  async function fetchAppointments() {
    try {
      setLoading(true);
      const res = await API.get(`/appointments/patient/${patientId}`);
      setAppointments(res.data);
    } catch (err) {
      console.error('Failed to fetch appointments', err);
    } finally {
      setLoading(false);
    }
  }

  // Close context menu on any outside click
  useEffect(() => {
    if (!ctxMenu) return;
    const close = () => setCtxMenu(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [ctxMenu]);

  async function handleCancel(apptId) {
    setCtxMenu(null);
    try {
      await API.patch(`/appointments/${apptId}/status`, { status: 'Cancelled' });
      fetchAppointments();
    } catch (err) {
      console.error('Failed to cancel appointment', err);
      alert('Failed to cancel. Please try again.');
    }
  }

  async function handleSave(formData) {
    const startTime = new Date(`${formData.date}T${formData.time}`);
    const endTime   = new Date(startTime.getTime() + Number(formData.duration) * 60000);

    await API.post('/appointments', {
      patient_id:  formData.selectedPatient._id,
      doctor_id:   formData.doctorId,
      start_time:  startTime,
      end_time:    endTime,
      title:       formData.type,
      type:        formData.type,
      notes:       formData.notes,
      status:      'Scheduled',
    });
    fetchAppointments();
  }

  const now  = new Date();

  // past = done status OR start_time already passed
  const past = appointments
    .filter(a => DONE_STATUSES.includes(a.status) || new Date(a.start_time) < now)
    .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

  // upcoming = future + not done, sorted ascending; first one = next (highlighted)
  const upcoming = appointments
    .filter(a => !DONE_STATUSES.includes(a.status) && new Date(a.start_time) >= now)
    .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

  const nextAppt    = upcoming[0] || null;
  const laterAppts  = upcoming.slice(1);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="animate-spin text-[#137fec]" size={24} />
      </div>
    );
  }

  const isEmpty = appointments.length === 0;

  return (
    <div>
      {/* Add button */}
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#137fec] text-white rounded-lg hover:bg-blue-600 transition-colors font-medium text-sm shadow-sm"
        >
          <Plus size={16} /> {buttonLabel}
        </button>
      </div>

      {isEmpty ? (
        <div className="flex flex-col items-center justify-center py-12 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <Calendar size={28} className="mb-2 opacity-40" />
          <p className="text-sm">No appointments found.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">

          {/* Past appointments — grayed out, clickable if onSelectDate provided */}
          {past.map(appt => (
            <AppointmentCard
              key={appt._id}
              appt={appt}
              dim
              onClick={onSelectDate ? () => onSelectDate(appt.start_time) : undefined}
            />
          ))}

          {/* Next upcoming — highlighted */}
          {nextAppt && (
            <>
              {past.length > 0 && (
                <div className="flex items-center gap-2 my-1">
                  <div className="flex-1 h-px bg-slate-200" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Upcoming</span>
                  <div className="flex-1 h-px bg-slate-200" />
                </div>
              )}
              <AppointmentCard appt={nextAppt} highlight onContextMenu={(e) => {
                e.preventDefault();
                setCtxMenu({ x: e.clientX, y: e.clientY, apptId: nextAppt._id });
              }} />
            </>
          )}

          {/* Further upcoming — normal */}
          {laterAppts.map(appt => (
            <AppointmentCard key={appt._id} appt={appt} onContextMenu={(e) => {
              e.preventDefault();
              setCtxMenu({ x: e.clientX, y: e.clientY, apptId: appt._id });
            }} />
          ))}
        </div>
      )}

      {/* Right-click context menu */}
      {ctxMenu && (
        <div
          className="fixed z-[500] bg-white rounded-lg shadow-xl border border-slate-200 py-1 min-w-[160px]"
          style={{ left: ctxMenu.x, top: ctxMenu.y }}
        >
          <button
            onClick={() => handleCancel(ctxMenu.apptId)}
            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
          >
            <X size={14} /> Cancel Appointment
          </button>
        </div>
      )}

      <NewAppointmentModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        defaultPatient={patient}
      />
    </div>
  );
}

function AppointmentCard({ appt, dim, highlight, onClick, onContextMenu }) {
  const statusStyle = STATUS_STYLES[appt.status] || STATUS_STYLES['Scheduled'];

  return (
    <div
      onClick={onClick}
      onContextMenu={onContextMenu}
      className={`rounded-xl border px-4 py-3 transition-all ${
        highlight
          ? 'border-[#137fec] bg-blue-50/60 shadow-sm shadow-blue-100'
          : dim
          ? `border-slate-100 bg-white opacity-50 ${onClick ? 'cursor-pointer hover:opacity-100 hover:border-[#137fec] hover:shadow-sm' : ''}`
          : 'border-slate-200 bg-white'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left: icon + details */}
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
            highlight ? 'bg-[#137fec] text-white' : 'bg-slate-100 text-slate-500'
          }`}>
            <Stethoscope size={15} />
          </div>

          <div>
            <p className={`font-semibold text-sm ${highlight ? 'text-[#137fec]' : 'text-slate-800'}`}>
              {appt.title || appt.type}
            </p>
            <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Calendar size={11} /> {fmt(appt.start_time)}
              </span>
              <span className="flex items-center gap-1">
                <Clock size={11} /> {fmtTime(appt.start_time)}
              </span>
              {appt.doctor_id?.name && (
                <span className="flex items-center gap-1">
                  <User size={11} /> {appt.doctor_id.name}
                </span>
              )}
            </div>
            {appt.notes && (
              <p className="flex items-start gap-1 mt-1.5 text-xs text-slate-500 italic">
                <FileText size={11} className="mt-0.5 shrink-0" />
                {appt.notes}
              </p>
            )}
          </div>
        </div>

        {/* Right: status badge */}
        <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusStyle}`}>
          {appt.status}
        </span>
      </div>
    </div>
  );
}
