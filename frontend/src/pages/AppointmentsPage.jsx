import React, { useState, useEffect, useRef } from 'react';
import axios from '../services/api';
import { API_BASE_URL } from '../config/env.js';
import {
  MoreVertical, Calendar, TrendingUp, Users, CreditCard, FileText, Plus,
  Clock, PlayCircle, AlertCircle, XCircle, DollarSign, Loader2, Edit, Trash2, Mail, Phone, User
} from 'lucide-react';
import { useNavigate } from 'react-router-dom'; 

// --- IMPORTS ---
import NewAppointmentModal from '../modals/NewAppointmentModal.jsx'; 
import PatientProfileModal from '../modals/PatientProfileModal.jsx'; 
import CashTransactionModal from '../modals/CashTransactionModal.jsx';
import { useTreatment } from '../Context/TreatmentContext.jsx'; // IMPORT CONTEXT

// --- HELPER: Calendar Math ---
const START_HOUR = 9;
const END_HOUR = 21;
const HOUR_HEIGHT = 64; // px per hour
const TOTAL_HEIGHT = (END_HOUR - START_HOUR) * HOUR_HEIGHT;

const calculatePosition = (dateObj, durationMins = 30) => {
  const hour = dateObj.getHours();
  const minutes = dateObj.getMinutes();
  const minutesFromStart = ((hour - START_HOUR) * 60) + minutes;
  if (minutesFromStart < 0) return null;
  const top = minutesFromStart * 1.6;
  const height = durationMins * 1.6;
  return { top: `${top}px`, height: `${height}px` };
};

const calcCalendarPos = (dateObj, durationMins = 30) => {
  const istStr = dateObj.toLocaleString('en-US', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false });
  const [h, m] = istStr.split(':').map(Number);
  const minutesFromStart = (h - START_HOUR) * 60 + m;
  if (minutesFromStart < 0) return null;
  const top = (minutesFromStart / 60) * HOUR_HEIGHT;
  const height = Math.max((durationMins / 60) * HOUR_HEIGHT, 24);
  return { top, height };
};

// ... (Keep StatCard and AppointmentBlock components as they are) ...
const StatCard = ({ icon, colorClass, title, value, trend, trendUp, subtext }) => (
  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-1 relative overflow-hidden group transition-all hover:shadow-md">
    <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
      <div className={`text-6xl ${colorClass}`}>{icon}</div>
    </div>
    <p className="text-slate-500 text-sm font-medium">{title}</p>
    <div className="flex items-end gap-2 mt-1">
      <p className="text-3xl font-bold text-slate-900">{value}</p>
      {trend && (
        <span className={`flex items-center text-xs font-semibold px-1.5 py-0.5 rounded mb-1 ${trendUp ? 'text-green-600 bg-green-100' : 'text-slate-500 bg-slate-100'}`}>
          {trendUp && <TrendingUp size={14} className="mr-0.5" />}
          {trend}
        </span>
      )}
    </div>
    <p className="text-xs text-slate-400 mt-2">{subtext}</p>
  </div>
);

const AppointmentBlock = ({ style, statusColor, time, patient, type, cancelled = false }) => {
  const colorMap = {
    green: { border: 'border-green-500', bg: 'bg-green-50', text: 'text-green-800' },
    blue: { border: 'border-blue-500', bg: 'bg-blue-50', text: 'text-blue-800' },
    orange: { border: 'border-orange-500', bg: 'bg-orange-50', text: 'text-orange-800' },
    slate: { border: 'border-slate-500', bg: 'bg-slate-50', text: 'text-slate-800' },
    red: { border: 'border-red-500', bg: 'bg-red-50', text: 'text-red-800' },
  };

  const colors = colorMap[statusColor] || colorMap.slate;

  return (
    <div
      className={`absolute left-1 right-1 p-2 m-0.5 rounded-lg border-l-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer group ${colors.border} ${colors.bg} ${cancelled ? 'opacity-70 hover:opacity-100' : ''} z-10 overflow-hidden`}
      style={style}
    >
      <div className="flex justify-between items-start">
        <span className={`text-[10px] font-bold block ${cancelled ? 'decoration-red-500 line-through decoration-2' : ''} ${colors.text}`}>{time}</span>
      </div>
      <p className="text-xs font-bold text-slate-800 mt-0.5 truncate leading-tight">{patient}</p>
      <p className="text-[10px] text-slate-500 truncate">{type}</p>
    </div>
  );
};

const AppointmentsPage = () => {
  const { startTreatment, activeTreatment } = useTreatment(); // Use Context Hook
  const navigate = useNavigate();
  const [isNewApptOpen, setIsNewApptOpen] = useState(false);
  
  // --- STATE ---
  const [appointments, setAppointments] = useState([]);
  const [dashStats, setDashStats] = useState({ todays_revenue: 0, outstanding_amount: 0, outstanding_count: 0 });
  const [isCashModalOpen, setIsCashModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Get today's date in IST (UTC+5:30), not UTC
  const getIndiaDate = () => {
    const now = new Date();
    // Convert to UTC first, then add 5.5 hours for IST
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60 * 1000);
    const istTime = new Date(utcTime + (5.5 * 60 * 60 * 1000));
    return istTime.toISOString().split('T')[0];
  };
  const [selectedDate, setSelectedDate] = useState(getIndiaDate());

  const shiftDate = (days) => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const next = new Date(Date.UTC(y, m - 1, d + days));
    setSelectedDate(next.toISOString().split('T')[0]);
  };

  const [viewMode, setViewMode] = useState('table'); // 'table' | 'calendar'
  const [currentTimeTop, setCurrentTimeTop] = useState(null);
  const calendarRef = useRef(null);
  const [selectedDoctorId, setSelectedDoctorId] = useState(null); // For mobile timeline view

  const [activeDropdown, setActiveDropdown] = useState(null);
  const dropdownRef = useRef(null);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [editPatientModal, setEditPatientModal] = useState(null); // { patientId, first_name, last_name, email, mobile }
  const [editPatientSaving, setEditPatientSaving] = useState(false);

  const ALL_STATUSES = ['Requested', 'Scheduled', 'Checked In', 'Completed', 'Cancelled'];

  // Click Outside Hook
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'Requested':   return 'amber';
      case 'In Progress': return 'green';
      case 'Checked In':  return 'blue';
      case 'Scheduled':   return 'slate';
      case 'Completed':   return 'green';
      case 'Waiting':     return 'orange';
      case 'Cancelled':   return 'red';
      case 'No Show':     return 'red';
      default: return 'slate';
    }
  };

  // --- 1. FETCH DATA (Fixed Mapping) ---
  const fetchData = async () => {
    try {
      setLoading(true);
      
      const [doctorsRes, appointmentsRes, statsRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/users/doctors`),
        axios.get(`${API_BASE_URL}/appointments?date=${selectedDate}`),
        axios.get(`${API_BASE_URL}/appointments/dashboard-stats?date=${selectedDate}`)
      ]);

      const doctorsMap = doctorsRes.data.slice(0, 10);
      setDoctors(doctorsMap);
      // Set first doctor as selected for mobile timeline view
      if (doctorsMap.length > 0 && !selectedDoctorId) {
        setSelectedDoctorId(doctorsMap[0]._id);
      }
      setDashStats(statsRes.data);

      const mappedAppts = appointmentsRes.data.map(apt => {
        const patientName = apt.patient_id ? `${apt.patient_id.first_name} ${apt.patient_id.last_name}` : 'Unknown';

        // Look up doctor from the doctors array
        const doctorId = typeof apt.doctor_id === 'object' ? apt.doctor_id._id : apt.doctor_id;
        const doctor = doctorsMap.find(d => d._id === doctorId);
        const doctorName = doctor ? doctor.name : 'Unassigned';

        // start_time / end_time are UTC ISO strings. Parse as real instants and
        // format/display via the explicit Asia/Kolkata timezone â€” DO NOT manually
        // add +5:30 to the millisecond value, otherwise toLocaleTimeString (which
        // applies the browser's local timezone) double-shifts the result.
        const utcStart = new Date(apt.start_time);
        const utcEnd = new Date(apt.end_time);
        const duration = (utcEnd - utcStart) / 60000;

        return {
          id: apt._id,
          rawTime: utcStart,           // Real Date instant â€” safe to compare with new Date()
          utcStartIso: apt.start_time, // Raw UTC ISO string â€” used for edit modal (must NOT be shifted again)
          duration: duration || 30,
          time: utcStart.toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false }),
          patient: patientName,

          rawPatient: apt.patient_id,

          patientId: apt.patient_id?._id,
          treatment: apt.type,
          doctor: doctorName,
          doctorId: doctorId,
          status: apt.status,
          statusColor: getStatusColor(apt.status),
          source: apt.source || 'dashboard',
          notes: apt.notes
        };
      });

      mappedAppts.sort((a, b) => a.rawTime - b.rawTime);
      setAppointments(mappedAppts);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Failed to load data.");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  // Re-fetch when treatment session closes so concluded appointments show as Completed
  const prevActiveTreatment = useRef(activeTreatment);
  useEffect(() => {
    if (prevActiveTreatment.current !== null && activeTreatment === null) {
      fetchData();
    }
    prevActiveTreatment.current = activeTreatment;
  }, [activeTreatment]);

  useEffect(() => {
    const updateLine = () => {
      const now = new Date();
      const pos = calcCalendarPos(now, 0);
      setCurrentTimeTop(pos ? pos.top : null);
    };
    updateLine();
    const t = setInterval(updateLine, 60000);
    return () => clearInterval(t);
  }, []);

  // --- HANDLERS ---

  // FIX 2: Safety check for Start Visit
  const handleStartVisit = async (appointment) => {
    if (!appointment) return;

    const patientId = appointment.patientId || appointment.rawPatient?._id || appointment.rawPatient;
    if (!patientId) {
      alert("Patient ID not found for this appointment.");
      return;
    }

    setActiveDropdown(null);

    if (appointment.status !== 'In Progress') {
      try {
        await axios.patch(`${API_BASE_URL}/appointments/${appointment.id}/status`, { status: 'In Progress' });
        setAppointments(prev => prev.map(a => a.id === appointment.id ? {...a, status: 'In Progress', statusColor: 'green'} : a));
      } catch (err) {
        console.warn("Could not update appointment status:", err?.response?.data?.error || err.message);
      }
    }

    startTreatment(patientId, appointment.id, appointment.patient);
  };

  // FIX 3: Correctly set patient data for Modal
  const handleViewProfile = (appointment) => {
    if (appointment && appointment.rawPatient) {
      setSelectedPatient(appointment.rawPatient); 
      setIsProfileOpen(true);
    } else {
      console.warn("No patient data found on appointment object", appointment);
      alert("Patient details not available.");
    }
  };

  const handleSaveTransaction = (transactionData) => {
    console.log("Transaction Saved:", transactionData);
    alert("Transaction recorded successfully.");
  };
  
  const handleSaveAppointment = () => {
    fetchData();
    setIsNewApptOpen(false);
    setEditingAppointment(null);
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await axios.patch(`${API_BASE_URL}/appointments/${id}/status`, { status: newStatus });
      setAppointments(prev => prev.map(apt => 
        apt.id === id ? { ...apt, status: newStatus, statusColor: getStatusColor(newStatus) } : apt
      ));
      setActiveDropdown(null);
    } catch (err) {
      alert("Failed to update status");
    }
  };

  const handleEditPatient = (apt) => {
    const p = apt.rawPatient;
    if (!p) return;
    setEditPatientModal({
      patientId: p._id,
      first_name: p.first_name || '',
      last_name:  p.last_name  || '',
      mobile:     (p.contact?.mobile || '').replace(/^\+91/, ''),
      email:      p.contact?.email  || '',
      contact:    p.contact || {},
    });
    setActiveDropdown(null);
  };

  const handleSavePatientEdit = async () => {
    if (!editPatientModal) return;
    setEditPatientSaving(true);
    try {
      await axios.put(`/patients/${editPatientModal.patientId}`, {
        first_name: editPatientModal.first_name,
        last_name:  editPatientModal.last_name,
        contact: {
          ...editPatientModal.contact,
          mobile: editPatientModal.mobile ? `+91${editPatientModal.mobile}` : '',
          email:  editPatientModal.email,
        },
      });
      setEditPatientModal(null);
      fetchData();
    } catch (err) {
      alert('Failed to save: ' + (err.response?.data?.error || err.message));
    } finally {
      setEditPatientSaving(false);
    }
  };

  const handleEdit = (appointment) => {
    const apptForEdit = {
        _id: appointment.id,
        patient: appointment.rawPatient || { first_name: 'Unknown', last_name: '' }, 
        doctor_id: appointment.doctorId,
        // Use utcStartIso (raw UTC string from DB) so the modal can convert IST correctly.
        // Do NOT use rawTime â€” it's already IST-shifted and would cause a double +5:30 offset.
        start_time: appointment.utcStartIso,
        type: appointment.treatment,
        notes: appointment.notes,
        status: appointment.status
    };
    setEditingAppointment(apptForEdit);
    setIsNewApptOpen(true);
    setActiveDropdown(null);
  };

  const handleModalClose = () => {
      setIsNewApptOpen(false);
      setEditingAppointment(null);
  };

  const now = new Date();
  const nextAppointment = appointments.find(apt => {
    const isFuture = new Date(apt.rawTime) >= now;
    const isToday = new Date(apt.rawTime).toDateString() === now.toDateString();
    const isActive = !['Completed', 'Cancelled', 'No Show'].includes(apt.status);
    return isToday && isFuture && isActive;
  });

  const getDoctorStatus = (doctorId) => {
    const isBusy = appointments.some(apt => {
        const start = new Date(apt.rawTime);
        const end = new Date(start.getTime() + apt.duration * 60000);
        return apt.doctorId === doctorId && now >= start && now <= end && apt.status === 'In Progress';
    });
    return isBusy ? { label: 'Busy', color: 'orange' } : { label: 'Available', color: 'green' };
  };

  const getStatusStyles = (color) => {
    const map = {
      green: 'bg-green-100 text-green-700 border-green-200',
      blue: 'bg-blue-100 text-blue-700 border-blue-200',
      amber: 'bg-amber-100 text-amber-700 border-amber-200',
      orange: 'bg-orange-100 text-orange-700 border-orange-200',
      slate: 'bg-slate-100 text-slate-600 border-slate-200',
      red: 'bg-red-100 text-red-700 border-red-200',
    };
    return map[color] || map.slate;
  };
  const getDotColor = (color) => {
    const map = { green: 'bg-green-500', blue: 'bg-blue-500', amber: 'bg-amber-500', orange: 'bg-orange-500', slate: 'bg-slate-400', red: 'bg-red-500' };
    return map[color] || 'bg-slate-400';
  };

  return (
      <div className="max-w-[1200px] mx-auto flex flex-col gap-8 pb-10">
        
        {/* --- Header --- */}
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-xl md:text-3xl font-bold text-slate-900 tracking-tight">Today</h1>
          <div className="flex gap-2 md:gap-3">
            <button onClick={() => setIsCashModalOpen(true)} className="hidden md:flex px-4 py-2.5 rounded-lg bg-white border border-blue-300 text-slate-600 text-sm font-semibold hover:bg-slate-50 hover:text-[#137fec] transition-all items-center gap-2">
              <DollarSign size={18} /> Add Expense
            </button>
            <button onClick={() => setIsNewApptOpen(true)} className="px-3 md:px-4 py-2 md:py-2.5 rounded-lg bg-[#137fec] text-white text-sm font-semibold shadow-lg shadow-blue-500/30 hover:bg-blue-600 transition-all flex items-center gap-2">
              <Plus size={18} /> <span className="hidden sm:inline">New Appointment</span><span className="sm:hidden">New</span>
            </button>
          </div>
        </div>

        <div className="hidden md:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <StatCard icon={<Calendar />} colorClass="text-[#137fec]" title="Total Appointments" value={appointments.length} subtext="For selected date" />
          <StatCard icon={<Users />} colorClass="text-orange-500" title="Pending Check-ins" value={appointments.filter(a => !['Checked In', 'In Progress', 'Completed', 'Cancelled', 'No Show'].includes(a.status)).length} subtext={`${appointments.filter(a => a.status === 'Checked In' || a.status === 'In Progress').length} Checked in`} />
          <StatCard icon={<CreditCard />} colorClass="text-[#137fec]" title="Today's Revenue" value={`₹${(dashStats.todays_revenue || 0).toLocaleString('en-IN')}`} subtext="Services + Labs for the day" />
          <StatCard icon={<FileText />} colorClass="text-red-500" title="Outstanding" value={`₹${(dashStats.outstanding_amount || 0).toLocaleString('en-IN')}`} trend={`${dashStats.outstanding_count} Invoice${dashStats.outstanding_count !== 1 ? 's' : ''}`} trendUp={false} subtext="Overall pending" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          {/* ... (Keep Left Column - List/Calendar) ... */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-lg font-bold text-slate-900">Schedule</h3>
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex bg-slate-100 rounded-lg p-1 items-center gap-0.5">
                  <button onClick={() => shiftDate(-1)} className="p-1 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                  </button>
                  <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-transparent border-none text-xs font-medium text-slate-700 focus:ring-0 px-1 py-1 outline-none w-full max-w-[130px] sm:max-w-none"/>
                  <button onClick={() => shiftDate(1)} className="p-1 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                  </button>
                </div>
                <div className="flex bg-slate-100 rounded-lg p-1 gap-0.5">
                  <button
                    onClick={() => setViewMode('table')}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${viewMode === 'table' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >List</button>
                  <button
                    onClick={() => setViewMode('calendar')}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${viewMode === 'calendar' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >Timeline</button>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center items-center h-64 bg-white rounded-xl border border-slate-200"><Loader2 className="animate-spin text-[#137fec]" size={32} /></div>
            ) : error ? (
              <div className="flex justify-center items-center h-64 bg-white rounded-xl border border-red-200 text-red-500 font-medium"><AlertCircle className="mr-2" /> {error}</div>
            ) : (
              <>
                {activeDropdown && (() => {
                  const apt = appointments.find(a => a.id === activeDropdown);
                  if (!apt) return null;
                  return (
                    /* Mobile bottom sheet — avoids iOS Safari fixed-in-overflow-hidden touch bug */
                    <div className="md:hidden">
                      <div
                        className="fixed inset-0 z-[209] bg-black/40"
                        onClick={() => setActiveDropdown(null)}
                      />
                      <div className="fixed bottom-0 left-0 right-0 z-[210] bg-white rounded-t-2xl shadow-2xl overflow-hidden">
                        {/* Handle + patient name header */}
                        <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-slate-100">
                          <div>
                            <p className="text-sm font-bold text-slate-800">{apt.patient}</p>
                            <p className="text-xs text-slate-400">{apt.time} · {apt.treatment}</p>
                          </div>
                          <button
                            onClick={() => setActiveDropdown(null)}
                            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"
                          >
                            <XCircle size={18} />
                          </button>
                        </div>

                        <div className="overflow-y-auto max-h-[60vh] pb-safe">
                          {apt.status === 'Requested' && (
                            <div className="bg-amber-50 p-3 border-b border-amber-100 space-y-2">
                              <div className="flex gap-2">
                                <button onClick={() => handleStatusChange(apt.id, 'Scheduled')} className="flex-1 px-3 py-2.5 bg-green-500 hover:bg-green-600 text-white text-sm font-bold rounded-xl">Confirm</button>
                                <button onClick={() => handleStatusChange(apt.id, 'Cancelled')} className="flex-1 px-3 py-2.5 bg-red-500 hover:bg-red-600 text-white text-sm font-bold rounded-xl">Decline</button>
                              </div>
                              <button onClick={() => handleEdit(apt)} className="w-full px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl">Reschedule</button>
                            </div>
                          )}
                          {!['Requested', 'Completed', 'Cancelled', 'No Show'].includes(apt.status) && (
                            <div className="p-3 border-b border-slate-100">
                              <button
                                onClick={() => handleStartVisit(apt)}
                                className={`w-full px-4 py-3 text-sm font-bold text-white rounded-xl flex items-center justify-center gap-2 transition-colors ${apt.status === 'In Progress' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-[#137fec] hover:bg-blue-600'}`}
                              >
                                <PlayCircle size={16} fill="currentColor" className="opacity-80" />
                                {apt.status === 'In Progress' ? 'Continue Visit' : 'Start Visit'}
                              </button>
                            </div>
                          )}
                          <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 text-[10px] font-bold uppercase text-slate-400 tracking-wider">Change Status</div>
                          {ALL_STATUSES.filter(s => s !== apt.status && s !== 'In Progress').map(status => (
                            <button key={status} onClick={() => handleStatusChange(apt.id, status)} className="w-full text-left px-4 py-3 text-sm text-slate-600 hover:bg-slate-50 flex items-center gap-2 border-b border-slate-50 last:border-0">
                              <div className={`size-2 rounded-full flex-shrink-0 ${getDotColor(getStatusColor(status))}`} />
                              <span>{status}</span>
                            </button>
                          ))}
                          <div className="border-t border-slate-100">
                            <button onClick={() => handleViewProfile(apt)} className="w-full text-left px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2 border-b border-slate-50"><Users size={15} className="text-[#137fec]" /> Patient Profile</button>
                            <button onClick={() => handleEditPatient(apt)} className="w-full text-left px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2 border-b border-slate-50"><User size={15} className="text-[#137fec]" /> Edit Patient Details</button>
                            <button onClick={() => handleEdit(apt)} className="w-full text-left px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2"><Edit size={15} className="text-[#137fec]" /> Edit Appointment</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
                <div className="md:hidden bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                  {appointments.length > 0 ? appointments.map((apt) => (
                    <div key={apt.id} className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 last:border-b-0">
                      <div className="text-xs font-bold text-slate-400 w-11 shrink-0 text-center leading-tight">{apt.time}</div>
                      <div className="size-9 rounded-full bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-500 shrink-0">{apt.patient.charAt(0)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 text-sm truncate">{apt.patient}</p>
                        <p className="text-xs text-slate-400 truncate">{apt.treatment}{apt.doctor ? ` · ${apt.doctor}` : ''}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getStatusStyles(apt.statusColor)}`}>
                          <span className={`size-1.5 rounded-full ${getDotColor(apt.statusColor)}`} />{apt.status}
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === apt.id ? null : apt.id); }}
                          className={`p-1.5 rounded-lg transition-colors ${activeDropdown === apt.id ? 'bg-blue-50 text-[#137fec]' : 'text-slate-400 hover:bg-slate-100'}`}
                        >
                          <MoreVertical size={18} />
                        </button>
                      </div>
                    </div>
                  )) : (
                    <div className="py-12 text-center text-slate-500 text-sm">No appointments for this date.</div>
                  )}
                </div>
                {viewMode === 'table' && (
                  <div className="hidden md:block bg-white border border-slate-200 rounded-xl shadow-sm min-h-[500px]">
                    <div>
                      <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                          <tr>
                            <th className="px-6 py-3 font-semibold">Time</th>
                            <th className="px-6 py-3 font-semibold">Patient</th>
                            <th className="px-6 py-3 font-semibold">Treatment</th>
                            <th className="px-6 py-3 font-semibold">Doctor</th>
                            <th className="px-6 py-3 font-semibold">Status</th>
                            <th className="px-6 py-3 font-semibold text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {appointments.length > 0 ? (
                            appointments.map((apt, index) => (
                              <tr key={index} className="hover:bg-slate-50 transition-colors group">
                                <td className="px-6 py-4 font-medium text-slate-900 whitespace-nowrap">{apt.time}</td>
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                    <div className="size-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-500">{apt.patient.charAt(0)}</div>
                                    <div className="flex flex-col"><span className="font-medium text-slate-900">{apt.patient}</span><span className="text-xs text-slate-500">#{apt.id.slice(-4)}</span></div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-slate-600">{apt.treatment}</td>
                                <td className="px-6 py-4 text-slate-600">{apt.doctor}</td>
                                <td className="px-6 py-4">
                                  <div className="flex flex-col gap-1">
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusStyles(apt.statusColor)}`}>
                                      <span className={`size-1.5 rounded-full ${getDotColor(apt.statusColor)}`}></span>{apt.status}
                                    </span>
                                    {apt.source === 'online' && (
                                      <span className="text-[9px] font-bold text-indigo-500 uppercase tracking-wider">Online Booking</span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <div
                                    className="relative inline-block"
                                    ref={activeDropdown === apt.id ? dropdownRef : null}
                                  >
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveDropdown(activeDropdown === apt.id ? null : apt.id);
                                      }}
                                      className={`p-1.5 rounded-lg transition-colors ${activeDropdown === apt.id ? 'bg-blue-50 text-[#137fec]' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'}`}
                                    >
                                      <MoreVertical size={20} />
                                    </button>
                                    {activeDropdown === apt.id && (
                                      <div
                                        className="absolute right-0 top-full mt-1 w-56 max-h-96 bg-white border border-slate-200 rounded-lg shadow-xl z-[60] overflow-y-auto text-left"
                                        onMouseDown={e => e.stopPropagation()}
                                      >
                                        {apt.status === 'Requested' && (
                                          <div className="sticky top-0 bg-amber-50 p-1 border-b border-amber-100 z-10 space-y-1">
                                            <div className="flex gap-1">
                                              <button onClick={() => handleStatusChange(apt.id, 'Scheduled')} className="flex-1 px-2 py-2 bg-green-500 hover:bg-green-600 text-white text-xs font-bold rounded-md">Confirm</button>
                                              <button onClick={() => handleStatusChange(apt.id, 'Cancelled')} className="flex-1 px-2 py-2 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-md">Decline</button>
                                            </div>
                                            <button onClick={() => handleEdit(apt)} className="w-full px-2 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-md">Reschedule</button>
                                          </div>
                                        )}
                                        {!['Requested', 'Completed', 'Cancelled', 'No Show'].includes(apt.status) && (
                                          <div className="sticky top-0 bg-white p-1 border-b border-slate-100 z-10">
                                            <button
                                              onClick={(e) => { e.stopPropagation(); handleStartVisit(apt); }}
                                              className={`w-full text-left px-3 py-2.5 text-sm font-bold text-white rounded-md flex items-center gap-2 transition-colors shadow-sm ${apt.status === 'In Progress' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-[#137fec] hover:bg-blue-600'}`}
                                            >
                                              <PlayCircle size={16} fill="currentColor" className="opacity-80" />
                                              {apt.status === 'In Progress' ? 'Continue Visit' : 'Start Visit'}
                                            </button>
                                          </div>
                                        )}
                                        <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 text-[10px] font-bold uppercase text-slate-400 tracking-wider">Change Status</div>
                                        {ALL_STATUSES.filter(s => s !== apt.status && s !== 'In Progress').map(status => (
                                          <button key={status} onClick={(e) => { e.stopPropagation(); handleStatusChange(apt.id, status); }} className="w-full text-left px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 flex items-center gap-2 whitespace-nowrap">
                                            <div className={`size-1.5 rounded-full flex-shrink-0 ${getDotColor(getStatusColor(status))}`} /><span>{status}</span>
                                          </button>
                                        ))}
                                        <div className="sticky bottom-0 bg-white border-t border-slate-100 p-1">
                                          <button onClick={(e) => { e.stopPropagation(); handleViewProfile(apt); }} className="w-full text-left px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-md flex items-center gap-2"><Users size={14} className="text-[#137fec]" /> Patient Profile</button>
                                          <button onClick={(e) => { e.stopPropagation(); handleEditPatient(apt); }} className="w-full text-left px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-md flex items-center gap-2"><User size={14} className="text-[#137fec]" /> Edit Patient Details</button>
                                          <button onClick={(e) => { e.stopPropagation(); handleEdit(apt); }} className="w-full text-left px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-md flex items-center gap-2"><Edit size={14} className="text-[#137fec]" /> Edit Appointment</button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr><td colSpan="6" className="px-6 py-12 text-center text-slate-500">No appointments found for this date.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {viewMode === 'calendar' && (() => {
                  const dayName = new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

                  const getShiftBands = (doc) => {
                    const slots = doc.availability?.[dayName] || [];
                    return slots.map(({ start, end }) => {
                      const [sh, sm] = start.split(':').map(Number);
                      const [eh, em] = end.split(':').map(Number);
                      const startMins = (sh - START_HOUR) * 60 + sm;
                      const endMins   = (eh - START_HOUR) * 60 + em;
                      return {
                        top:    Math.max(0, (startMins / 60) * HOUR_HEIGHT),
                        height: Math.max(0, ((endMins - startMins) / 60) * HOUR_HEIGHT),
                      };
                    });
                  };

                  const aptColorMap = {
                    green:  { border: 'border-green-500',  bg: 'bg-green-50',  text: 'text-green-800',  sub: 'text-green-600' },
                    blue:   { border: 'border-blue-500',   bg: 'bg-blue-50',   text: 'text-blue-800',   sub: 'text-blue-500'  },
                    orange: { border: 'border-orange-500', bg: 'bg-orange-50', text: 'text-orange-800', sub: 'text-orange-500' },
                    red:    { border: 'border-red-400',    bg: 'bg-red-50',    text: 'text-red-700',    sub: 'text-red-400'   },
                    slate:  { border: 'border-slate-400',  bg: 'bg-slate-50',  text: 'text-slate-700',  sub: 'text-slate-400' },
                  };

                  const AptDropdown = ({ apt }) => (
                    <div
                      ref={dropdownRef}
                      className="absolute left-0 top-full mt-1 w-56 max-h-96 bg-white border border-slate-200 rounded-lg shadow-xl z-[60] overflow-y-auto text-left"
                      onMouseDown={e => e.stopPropagation()}
                    >
                      {!['Completed', 'Cancelled', 'No Show'].includes(apt.status) && (
                        <div className="sticky top-0 bg-white p-1 border-b border-slate-100 z-10">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleStartVisit(apt); }}
                            className={`w-full text-left px-3 py-2.5 text-sm font-bold text-white rounded-md flex items-center gap-2 transition-colors shadow-sm ${apt.status === 'In Progress' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-[#137fec] hover:bg-blue-600'}`}
                          >
                            <PlayCircle size={16} fill="currentColor" className="opacity-80" />
                            {apt.status === 'In Progress' ? 'Continue Visit' : 'Start Visit'}
                          </button>
                        </div>
                      )}
                      <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 text-[10px] font-bold uppercase text-slate-400 tracking-wider">Change Status</div>
                      {ALL_STATUSES.filter(s => s !== apt.status && s !== 'In Progress').map(status => (
                        <button key={status} onClick={(e) => { e.stopPropagation(); handleStatusChange(apt.id, status); }} className="w-full text-left px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 flex items-center gap-2 whitespace-nowrap">
                          <div className={`size-1.5 rounded-full flex-shrink-0 ${getDotColor(getStatusColor(status))}`} /><span>{status}</span>
                        </button>
                      ))}
                      <div className="sticky bottom-0 bg-white border-t border-slate-100 p-1">
                        <button onClick={(e) => { e.stopPropagation(); handleViewProfile(apt); }} className="w-full text-left px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-md flex items-center gap-2"><Users size={14} className="text-[#137fec]" /> Patient Profile</button>
                        <button onClick={(e) => { e.stopPropagation(); handleEditPatient(apt); }} className="w-full text-left px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-md flex items-center gap-2"><User size={14} className="text-[#137fec]" /> Edit Patient Details</button>
                        <button onClick={(e) => { e.stopPropagation(); handleEdit(apt); }} className="w-full text-left px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-md flex items-center gap-2"><Edit size={14} className="text-[#137fec]" /> Edit Appointment</button>
                      </div>
                    </div>
                  );

                  const isMobileTimeline = typeof window !== 'undefined' && window.innerWidth < 768;
                  const docColWidth = isMobileTimeline ? 100 : 140;
                  const minWidth = 56 + (isMobileTimeline ? 1 : doctors.length) * docColWidth;

                  // Get doctors to display (all on desktop, selected one on mobile)
                  const displayDoctors = isMobileTimeline
                    ? doctors.filter(d => d._id === selectedDoctorId)
                    : doctors;

                  return (
                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                      {/* Mobile doctor selector */}
                      {isMobileTimeline && (
                        <div className="md:hidden px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
                          <label className="text-xs font-semibold text-slate-600 whitespace-nowrap">Doctor:</label>
                          <select
                            value={selectedDoctorId || ''}
                            onChange={(e) => setSelectedDoctorId(e.target.value)}
                            className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 focus:ring-2 focus:ring-[#137fec] focus:border-transparent outline-none"
                          >
                            {doctors.map(doc => (
                              <option key={doc._id} value={doc._id}>
                                {doc.name} - {doc.specialization || 'Dentist'}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Sticky header: time gutter + one cell per doctor */}
                      <div className="flex border-b border-slate-200 bg-slate-50 sticky top-0 z-30">
                        <div className="w-10 sm:w-14 shrink-0 border-r border-slate-200" />
                        {displayDoctors.map((doc, i) => (
                          <div key={doc._id} className={`flex-1 min-w-[100px] sm:min-w-[140px] px-1.5 sm:px-3 py-2 sm:py-2.5 text-center ${i > 0 ? 'border-l border-slate-200' : ''}`}>
                            <p className="text-[10px] sm:text-xs font-bold text-slate-800 truncate">{doc.name}</p>
                            <p className="text-[8px] sm:text-[10px] text-slate-400 truncate">{doc.specialization || 'Dentist'}</p>
                          </div>
                        ))}
                      </div>

                      {/* Scrollable body */}
                      <div className="overflow-x-auto overflow-y-auto max-h-[400px] sm:max-h-[640px]" ref={calendarRef}>
                        <div className="flex" style={{ minWidth: `${minWidth}px` }}>

                          {/* Hour gutter */}
                          <div className="w-10 sm:w-14 shrink-0 border-r border-slate-100 bg-slate-50/70 select-none relative" style={{ height: `${TOTAL_HEIGHT}px` }}>
                            {Array.from({ length: END_HOUR - START_HOUR }, (_, i) => {
                              const h = START_HOUR + i;
                              const label = h === 12 ? '12 PM' : h < 12 ? `${h} AM` : `${h - 12} PM`;
                              return (
                                <div key={h} style={{ position: 'absolute', top: `${i * HOUR_HEIGHT}px`, width: '100%' }} className="pr-0.5 sm:pr-2 flex items-start justify-end pt-1">
                                  <span className="text-[8px] sm:text-[10px] font-medium text-slate-400 leading-none">{label}</span>
                                </div>
                              );
                            })}
                          </div>

                          {/* One column per doctor */}
                          {displayDoctors.map((doc, colIdx) => {
                            const shiftBands = getShiftBands(doc);
                            const colApts = appointments.filter(a => a.doctorId === doc._id);

                            return (
                              <div
                                key={doc._id}
                                className={`flex-1 min-w-[100px] sm:min-w-[140px] relative ${colIdx > 0 ? 'border-l border-slate-200' : ''}`}
                                style={{ height: `${TOTAL_HEIGHT}px`, background: '#f8fafc' }}
                              >
                                {/* Blue shift bands (on-shift hours) */}
                                {shiftBands.map((band, bi) => (
                                  <div
                                    key={bi}
                                    style={{ position: 'absolute', top: `${band.top}px`, height: `${band.height}px`, left: 0, right: 0, zIndex: 1 }}
                                    className="bg-blue-100/80 border-y border-blue-200/70"
                                  />
                                ))}

                                {/* Hour grid lines */}
                                {Array.from({ length: END_HOUR - START_HOUR }, (_, i) => (
                                  <div key={i} style={{ position: 'absolute', top: `${i * HOUR_HEIGHT}px`, left: 0, right: 0, zIndex: 2 }} className="border-t border-slate-100" />
                                ))}
                                {/* Half-hour dashed lines */}
                                {Array.from({ length: END_HOUR - START_HOUR }, (_, i) => (
                                  <div key={`h-${i}`} style={{ position: 'absolute', top: `${i * HOUR_HEIGHT + HOUR_HEIGHT / 2}px`, left: 0, right: 0, zIndex: 2 }} className="border-t border-dashed border-slate-100/80" />
                                ))}

                                {/* Current time red line — spans all columns, dot only on first column */}
                                {currentTimeTop !== null && selectedDate === getIndiaDate() && (
                                  <div style={{ position: 'absolute', top: `${currentTimeTop}px`, left: 0, right: 0, zIndex: 25 }} className="flex items-center pointer-events-none">
                                    {colIdx === 0 && <div className="w-2 h-2 rounded-full bg-red-500 -ml-1 shrink-0 shadow-sm shadow-red-300" />}
                                    <div className="flex-1 h-px bg-red-500 opacity-80" />
                                  </div>
                                )}

                                {/* Appointment blocks */}
                                {colApts.map((apt) => {
                                  const pos = calcCalendarPos(apt.rawTime, apt.duration);
                                  if (!pos) return null;
                                  const c = aptColorMap[apt.statusColor] || aptColorMap.slate;
                                  return (
                                    <div
                                      key={apt.id}
                                      style={{ position: 'absolute', top: `${pos.top}px`, height: `${pos.height}px`, left: '2px', right: '2px', zIndex: 10 }}
                                      className={`rounded-md border-l-4 px-1.5 sm:px-2 py-0.5 sm:py-1 cursor-pointer overflow-hidden shadow-sm hover:shadow-md transition-shadow ${c.border} ${c.bg}`}
                                      onClick={() => setActiveDropdown(activeDropdown === apt.id ? null : apt.id)}
                                    >
                                      <p className={`text-[9px] sm:text-[10px] font-bold leading-none ${c.text}`}>{apt.time}</p>
                                      <p className="text-[10px] sm:text-[11px] font-semibold text-slate-800 truncate mt-0.5 leading-tight">{apt.patient}</p>
                                      {pos.height >= 44 && <p className={`text-[8px] sm:text-[10px] truncate ${c.sub}`}>{apt.treatment}</p>}
                                      {activeDropdown === apt.id && <AptDropdown apt={apt} />}
                                    </div>
                                  );
                                })}

                                {/* "No shift today" label when doctor has no availability and no appointments */}
                                {shiftBands.length === 0 && colApts.length === 0 && (
                                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 3 }}>
                                    <span className="text-[10px] text-slate-300 font-medium rotate-[-90deg] whitespace-nowrap">No shift today</span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </>
            )}
          </div>

          <div className="flex flex-col gap-6">
            <div className="bg-[#137fec]/5 p-6 rounded-xl border border-[#137fec]/20">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">Up Next</h3>
              {nextAppointment ? (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-4">
                    <div className="size-16 rounded-full bg-slate-200 flex items-center justify-center text-xl font-bold text-slate-500 ring-4 ring-white shadow-md">
                      {nextAppointment.patient.charAt(0)}
                    </div>
                    <div>
                      <p className="text-lg font-bold text-slate-900">{nextAppointment.patient}</p>
                      <p className="text-sm text-slate-500">{nextAppointment.treatment}</p>
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-lg flex items-center justify-between border border-slate-200">
                    <div className="flex items-center gap-2 text-slate-700"><Clock size={18} className="text-[#137fec]" /><span className="font-semibold text-sm">{nextAppointment.time}</span></div>
                    <span className="px-2 py-1 rounded bg-slate-100 text-xs font-semibold text-slate-600">Room 1</span>
                  </div>
                  <div className="flex gap-2 mt-1">
                    <button onClick={() => handleStartVisit(nextAppointment)} className="flex-1 py-2 rounded-lg bg-[#137fec] text-white text-sm font-medium shadow-md shadow-blue-500/20 hover:bg-blue-600 transition-colors">Start Visit</button>
                    <button onClick={() => handleViewProfile(nextAppointment)} className="flex-1 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors">Details</button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500"><p>No upcoming appointments</p></div>
              )}
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4"><h3 className="text-base font-bold text-slate-900">Dentists</h3><button className="text-xs font-semibold text-[#137fec]">See All</button></div>
              <div className="flex flex-col gap-4">
                {doctors.length > 0 ? doctors.map((doc) => {
                  const statusObj = getDoctorStatus(doc._id);
                  const fullName = doc.name || 'Unknown';
                  const initials = doc.name?.charAt(0) || 'Dr';
                  const dotColorMap = { green: 'bg-green-500', orange: 'bg-orange-500', blue: 'bg-blue-500', slate: 'bg-slate-400' };
                  const badgeStyleMap = {
                    green: 'bg-green-50 text-green-700 border border-green-200',
                    orange: 'bg-orange-50 text-orange-700 border border-orange-200',
                    blue: 'bg-blue-50 text-blue-700 border border-blue-200',
                    slate: 'bg-slate-50 text-slate-600 border border-slate-200'
                  };
                  return (
                    <div key={doc._id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="size-10 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-500">
                            {initials}
                          </div>
                          <span className={`absolute bottom-0 right-0 size-2.5 rounded-full ${dotColorMap[statusObj.color]} border-2 border-white`}></span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{fullName}</p>
                          <p className="text-xs text-slate-500">{doc.specialization || 'Dentist'}</p>
                        </div>
                      </div>
                      <span className={`text-xs font-medium px-2 py-1 rounded ${badgeStyleMap[statusObj.color]}`}>{statusObj.label}</span>
                    </div>
                  );
                }) : <p className="text-xs text-slate-400">Loading doctors...</p>}
              </div>
            </div>
          </div>
        </div>
        
        <NewAppointmentModal isOpen={isNewApptOpen} onClose={handleModalClose} onSave={handleSaveAppointment} appointmentToEdit={editingAppointment} />
        <CashTransactionModal isOpen={isCashModalOpen} onClose={() => setIsCashModalOpen(false)} onSave={handleSaveTransaction} />
        <PatientProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} patient={selectedPatient} />

        {/* Edit Patient Details Modal */}
        {editPatientModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <p className="font-bold text-slate-800">Edit Patient Details</p>
                <button onClick={() => setEditPatientModal(null)} className="p-1.5 rounded-full hover:bg-slate-200 text-slate-500"><XCircle size={18} /></button>
              </div>
              <div className="p-5 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">First Name</label>
                    <input type="text" value={editPatientModal.first_name} onChange={e => setEditPatientModal(m => ({ ...m, first_name: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#137fec] outline-none" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Last Name</label>
                    <input type="text" value={editPatientModal.last_name} onChange={e => setEditPatientModal(m => ({ ...m, last_name: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#137fec] outline-none" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1 mb-1"><Phone size={11} /> Mobile</label>
                  <div className="flex items-stretch border border-slate-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-[#137fec]">
                    <span className="px-2 flex items-center text-xs font-semibold text-slate-600 bg-slate-100 select-none border-r border-slate-300">🇮🇳 +91</span>
                    <input type="tel" inputMode="numeric" value={editPatientModal.mobile}
                      onChange={e => setEditPatientModal(m => ({ ...m, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                      maxLength={10} placeholder="10-digit number"
                      className="flex-1 px-3 py-2 text-sm focus:outline-none" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1 mb-1"><Mail size={11} /> Email</label>
                  <input type="email" value={editPatientModal.email} onChange={e => setEditPatientModal(m => ({ ...m, email: e.target.value }))}
                    placeholder="patient@example.com"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#137fec] outline-none" />
                  {!editPatientModal.email && <p className="text-xs text-amber-600 mt-1">No email â€” automated emails won't be sent to this patient.</p>}
                </div>
              </div>
              <div className="px-5 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
                <button onClick={() => setEditPatientModal(null)} className="px-4 py-2 rounded-lg border border-slate-300 text-slate-600 text-sm font-medium hover:bg-slate-100">Cancel</button>
                <button onClick={handleSavePatientEdit} disabled={editPatientSaving}
                  className="px-5 py-2 rounded-lg bg-[#137fec] hover:bg-blue-600 text-white text-sm font-semibold disabled:opacity-60">
                  {editPatientSaving ? 'Savingâ€¦' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
  );
};

export default AppointmentsPage;
