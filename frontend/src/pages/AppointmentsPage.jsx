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
const calculatePosition = (dateObj, durationMins = 30) => {
  const hour = dateObj.getHours();
  const minutes = dateObj.getMinutes();
  const minutesFromStart = ((hour - START_HOUR) * 60) + minutes;
  if (minutesFromStart < 0) return null;
  const top = minutesFromStart * 1.6; 
  const height = durationMins * 1.6;
  return { top: `${top}px`, height: `${height}px` };
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
  
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });
  const dropdownRef = useRef(null);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [editPatientModal, setEditPatientModal] = useState(null); // { patientId, first_name, last_name, email, mobile }
  const [editPatientSaving, setEditPatientSaving] = useState(false);

  const ALL_STATUSES = ['Scheduled', 'Checked In', 'Completed', 'Cancelled'];

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
      case 'In Progress': return 'green';
      case 'Checked In': return 'blue';
      case 'Scheduled': return 'slate';
      case 'Confirmed': return 'blue';
      case 'Completed': return 'green';
      case 'Waiting': return 'orange';
      case 'Cancelled': return 'red';
      case 'No Show': return 'red';
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

  // --- HANDLERS ---

  // FIX 2: Safety check for Start Visit
  const handleStartVisit = async (appointment) => {
    if (!appointment) return; // Prevent crash if undefined

    try {
      if (appointment.status !== 'In Progress') {
        await axios.patch(`${API_BASE_URL}/appointments/${appointment.id}/status`, { status: 'In Progress' });
        // Optimistic UI update for list
        setAppointments(prev => prev.map(a => a.id === appointment.id ? {...a, status: 'In Progress', statusColor: 'green'} : a));
      }
      // 2. Open Global Overlay
      startTreatment(appointment.patientId, appointment.id, appointment.patient);
    } catch (err) {
      console.error("Failed to start visit", err);
      alert("Could not start visit. Check console.");
    }
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
      mobile:     p.contact?.mobile || '',
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
          mobile: editPatientModal.mobile,
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
      orange: 'bg-orange-100 text-orange-700 border-orange-200',
      slate: 'bg-slate-100 text-slate-600 border-slate-200',
      red: 'bg-red-100 text-red-700 border-red-200',
    };
    return map[color] || map.slate;
  };
  const getDotColor = (color) => {
    const map = { green: 'bg-green-500', blue: 'bg-blue-500', orange: 'bg-orange-500', slate: 'bg-slate-400', red: 'bg-red-500' };
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
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-lg font-bold text-slate-900">Schedule</h3>
              <div className="flex bg-slate-100 rounded-lg p-1 items-center">
                <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-transparent border-none text-xs font-medium text-slate-700 focus:ring-0 px-2 py-1 outline-none"/>
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
                    <>
                    {/* Mobile dropdown — fixed top-right */}
                    <div ref={dropdownRef} className="md:hidden fixed right-3 top-24 w-64 max-h-96 bg-white border border-slate-200 rounded-xl shadow-2xl z-[60] overflow-y-auto text-left">
                      {!['Completed', 'Cancelled', 'No Show'].includes(apt.status) && (
                        <div className="sticky top-0 bg-white p-1.5 border-b border-slate-100 z-10">
                          <button
                            onClick={() => handleStartVisit(apt)}
                            className={`w-full text-left px-3 py-2.5 text-sm font-bold text-white rounded-lg flex items-center gap-2 transition-colors shadow-sm ${apt.status === 'In Progress' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-[#137fec] hover:bg-blue-600'}`}
                          >
                            <PlayCircle size={16} fill="currentColor" className="opacity-80" />
                            {apt.status === 'In Progress' ? 'Continue Visit' : 'Start Visit'}
                          </button>
                        </div>
                      )}
                      <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 text-[10px] font-bold uppercase text-slate-400 tracking-wider">Change Status</div>
                      {ALL_STATUSES.filter(s => s !== apt.status && s !== 'In Progress').map(status => (
                        <button key={status} onClick={() => handleStatusChange(apt.id, status)} className="w-full text-left px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 flex items-center gap-2 whitespace-nowrap">
                          <div className={`size-1.5 rounded-full flex-shrink-0 ${getDotColor(getStatusColor(status))}`} />
                          <span>{status}</span>
                        </button>
                      ))}
                      <div className="sticky bottom-0 bg-white border-t border-slate-100 p-1">
                        <button onClick={() => handleViewProfile(apt)} className="w-full text-left px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-md flex items-center gap-2"><Users size={14} className="text-[#137fec]" /> Patient Profile</button>
                        <button onClick={() => handleEditPatient(apt)} className="w-full text-left px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-md flex items-center gap-2"><User size={14} className="text-[#137fec]" /> Edit Patient Details</button>
                        <button onClick={() => handleEdit(apt)} className="w-full text-left px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-md flex items-center gap-2"><Edit size={14} className="text-[#137fec]" /> Edit Appointment</button>
                      </div>
                    </div>
                    {/* Desktop dropdown — fixed, anchored to button via getBoundingClientRect */}
                    <div
                      className="hidden md:block fixed w-56 max-h-96 bg-white border border-slate-200 rounded-lg shadow-xl z-[60] overflow-y-auto text-left"
                      style={{ top: dropdownPos.top, right: dropdownPos.right }}
                    >
                      {!['Completed', 'Cancelled', 'No Show'].includes(apt.status) && (
                        <div className="sticky top-0 bg-white p-1 border-b border-slate-100 z-10">
                          <button
                            onClick={() => handleStartVisit(apt)}
                            className={`w-full text-left px-3 py-2.5 text-sm font-bold text-white rounded-md flex items-center gap-2 transition-colors shadow-sm ${apt.status === 'In Progress' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-[#137fec] hover:bg-blue-600'}`}
                          >
                            <PlayCircle size={16} fill="currentColor" className="opacity-80" />
                            {apt.status === 'In Progress' ? 'Continue Visit' : 'Start Visit'}
                          </button>
                        </div>
                      )}
                      <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 text-[10px] font-bold uppercase text-slate-400 tracking-wider">Change Status</div>
                      {ALL_STATUSES.filter(s => s !== apt.status && s !== 'In Progress').map(status => (
                        <button key={status} onClick={() => handleStatusChange(apt.id, status)} className="w-full text-left px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 flex items-center gap-2 whitespace-nowrap">
                          <div className={`size-1.5 rounded-full flex-shrink-0 ${getDotColor(getStatusColor(status))}`} /><span>{status}</span>
                        </button>
                      ))}
                      <div className="sticky bottom-0 bg-white border-t border-slate-100 p-1">
                        <button onClick={() => handleViewProfile(apt)} className="w-full text-left px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-md flex items-center gap-2"><Users size={14} className="text-[#137fec]" /> Patient Profile</button>
                        <button onClick={() => handleEditPatient(apt)} className="w-full text-left px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-md flex items-center gap-2"><User size={14} className="text-[#137fec]" /> Edit Patient Details</button>
                        <button onClick={() => handleEdit(apt)} className="w-full text-left px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-md flex items-center gap-2"><Edit size={14} className="text-[#137fec]" /> Edit Appointment</button>
                      </div>
                    </div>
                    </>
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
                <div className="hidden md:block bg-white border border-slate-200 rounded-xl shadow-sm min-h-[500px]">
                  <div className="overflow-x-auto">
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
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusStyles(apt.statusColor)}`}>
                                  <span className={`size-1.5 rounded-full ${getDotColor(apt.statusColor)}`}></span>{apt.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <div className="inline-block">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (activeDropdown !== apt.id) {
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        setDropdownPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
                                      }
                                      setActiveDropdown(activeDropdown === apt.id ? null : apt.id);
                                    }}
                                    className={`p-1.5 rounded-lg transition-colors ${activeDropdown === apt.id ? 'bg-blue-50 text-[#137fec]' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'}`}
                                  >
                                    <MoreVertical size={20} />
                                  </button>
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
                  <input type="tel" value={editPatientModal.mobile} onChange={e => setEditPatientModal(m => ({ ...m, mobile: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#137fec] outline-none" />
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
