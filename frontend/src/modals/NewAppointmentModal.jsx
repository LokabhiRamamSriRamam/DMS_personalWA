import React, { useState, useEffect, useRef } from 'react';
import {
  X, Calendar, Clock, Stethoscope, FileText,
  ChevronDown, Search, Plus, Phone, Mail
} from 'lucide-react';

// Import your API helper
import API from '../services/api';

// Keep your existing sub-modal import
import AddPatientModal from './AddPatientModal'; 

const TREATMENT_TYPES = [
  'Consultation', 'Follow-up'
];

const NewAppointmentModal = ({ isOpen, onClose, onSave, appointmentToEdit, defaultPatient }) => {
  // --- Data States ---
  const [patients, setPatients] = useState([]); // Stores search results
  const [doctors, setDoctors] = useState([]);   // Stores fetched doctors
  const [loading, setLoading] = useState(false);

  // --- UI States ---
  const [isAddPatientOpen, setIsAddPatientOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // ── IST Timezone Helpers ──────────────────────────────────────────────────
  // All times in the form are IST. The DB stores UTC ISO strings.
  // Rule: never use new Date("YYYY-MM-DDTHH:mm") without a Z/offset suffix
  //       because the result is browser-locale-dependent.
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // +05:30 in milliseconds

  /** Returns the current date string in IST as "YYYY-MM-DD" */
  const getIndiaDate = () => {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
    // en-CA gives ISO date format YYYY-MM-DD natively
  };

  /** Returns the current time string in IST as "HH:mm" */
  const getIndiaTime = () => {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit', minute: '2-digit', hour12: false
    }).format(new Date());
  };

  /**
   * Convert a UTC ISO string from the DB → IST date ("YYYY-MM-DD") and time ("HH:mm")
   * Uses explicit epoch math — NOT browser local time.
   */
  const utcIsoToIst = (isoStr) => {
    const utcMs = new Date(isoStr).getTime(); // parse as UTC always
    const istMs = utcMs + IST_OFFSET_MS;
    const istDate = new Date(istMs);
    // Build YYYY-MM-DD from the IST instant
    const pad = (n) => String(n).padStart(2, '0');
    const dateStr = `${istDate.getUTCFullYear()}-${pad(istDate.getUTCMonth() + 1)}-${pad(istDate.getUTCDate())}`;
    const timeStr = `${pad(istDate.getUTCHours())}:${pad(istDate.getUTCMinutes())}`;
    return { dateStr, timeStr };
  };

  /**
   * Convert IST date ("YYYY-MM-DD") + time ("HH:mm") → UTC ISO string for the DB.
   * Treats the input as wall-clock IST and subtracts +05:30.
   */
  const istFormToUtcIso = (date, time) => {
    const [y, mo, d] = date.split('-').map(Number);
    const [h, mi] = time.split(':').map(Number);
    const utcMs = Date.UTC(y, mo - 1, d, h, mi, 0) - IST_OFFSET_MS;
    return new Date(utcMs).toISOString();
  };

  /** Returns true if the chosen IST date+time is not more than 1 hour in the past. */
  const validateNotBackdated = (date, time) => {
    const apptUtcMs = istFormToUtcIso(date, time);
    const oneHourAgoMs = Date.now() - 60 * 60 * 1000;
    return new Date(apptUtcMs).getTime() >= oneHourAgoMs;
  };
  // ─────────────────────────────────────────────────────────────────────────

  // --- Form State ---
  const [formData, setFormData] = useState({
    selectedPatient: null,
    patientEmail: '',
    doctorId: '',
    date: getIndiaDate(),
    time: getIndiaTime(),
    duration: '30',
    type: 'Consultation',
    notes: '',
    whatsapp_language: '',
  });

  // --- Populate Form on Edit ---
  useEffect(() => {
    if (isOpen && appointmentToEdit) {
        // start_time is a UTC ISO string from the DB — convert to IST for display
        const { dateStr, timeStr } = utcIsoToIst(appointmentToEdit.start_time);

        // Handle doctor_id - could be a string ID or an object with _id
        const doctorId = typeof appointmentToEdit.doctor_id === 'object'
          ? appointmentToEdit.doctor_id._id
          : appointmentToEdit.doctor_id;

        setFormData({
            selectedPatient: appointmentToEdit.patient,
            patientEmail: appointmentToEdit.patient?.contact?.email || '',
            doctorId: doctorId || '',
            date: dateStr,
            time: timeStr,
            duration: '30',
            type: appointmentToEdit.type,
            notes: appointmentToEdit.notes || '',
            whatsapp_language: appointmentToEdit.whatsapp_language || '',
        });

        if (appointmentToEdit.patient) {
            setSearchTerm(`${appointmentToEdit.patient.first_name} ${appointmentToEdit.patient.last_name || ''}`.trim());
        }
    } else if (isOpen && !appointmentToEdit) {
        setFormData({
            selectedPatient: defaultPatient || null,
            patientEmail: defaultPatient?.contact?.email || '',
            doctorId: '',
            date: getIndiaDate(),
            time: getIndiaTime(),
            duration: '30',
            type: 'Consultation',
            notes: '',
            whatsapp_language: '',
        });
        setSearchTerm(defaultPatient
            ? `${defaultPatient.first_name} ${defaultPatient.last_name || ''}`.trim()
            : ''
        );
    }
  }, [isOpen, appointmentToEdit]);

  // --- 1. Fetch Doctors on Mount ---
  useEffect(() => {
    if (isOpen) {
      API.get('/users/doctors')
        .then(res => setDoctors(res.data))
        .catch(err => console.error("Failed to load doctors", err));
    }
  }, [isOpen]);

  // --- 2. Dynamic Patient Search (Debounced) ---
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchTerm.length > 1) { 
        API.get(`/patients?search=${searchTerm}`)
          .then(res => setPatients(res.data))
          .catch(err => console.error("Search failed", err));
      } else if (searchTerm.length === 0) {
        setPatients([]); 
      }
    }, 300); 

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  // --- Close Dropdown on Click Outside ---
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!isOpen) return null;

  // --- Handlers ---

  // 3. Handle New Patient
  const handleNewPatientCreated = (createdPatient) => {
    setFormData(prev => ({ ...prev, selectedPatient: createdPatient }));
    const fullName = `${createdPatient.first_name} ${createdPatient.last_name || ''}`.trim();
    setSearchTerm(fullName);
    setIsAddPatientOpen(false); 
    setShowDropdown(false);
  };

  // 4. Submit Appointment
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.selectedPatient) {
      alert("Please select a patient first.");
      return;
    }
    if (!formData.doctorId) {
      alert("Please select a doctor.");
      return;
    }

    if (!validateNotBackdated(formData.date, formData.time)) {
      alert("Cannot book an appointment more than 1 hour in the past. Please choose a future time.");
      return;
    }

    setLoading(true);

    try {
      // Form date/time are always in IST — convert to UTC for the backend
      const utcStartIso = istFormToUtcIso(formData.date, formData.time);
      const utcEndIso = new Date(new Date(utcStartIso).getTime() + parseInt(formData.duration) * 60000).toISOString();

      const appointmentPayload = {
        patient_id: formData.selectedPatient?._id,
        doctor_id: formData.doctorId,
        start_time: utcStartIso,
        end_time: utcEndIso,
        title: `${formData.type} - ${formData.selectedPatient?.first_name}`,
        type: formData.type,
        status: appointmentToEdit ? appointmentToEdit.status : 'Scheduled',
        room_number: 'Room 1',
        notes: formData.notes,
        ...(formData.whatsapp_language ? { whatsapp_language: formData.whatsapp_language } : {}),
      };

      if (!appointmentPayload.patient_id || !appointmentPayload.doctor_id) {
        alert("Error: Patient ID or Doctor ID is missing.");
        setLoading(false);
        return;
      }

      // Save email back to patient if it was added/changed
      const existingEmail = formData.selectedPatient?.contact?.email || '';
      if (formData.patientEmail.trim() && formData.patientEmail.trim() !== existingEmail) {
        await API.put(`/patients/${formData.selectedPatient._id}`, {
          contact: { ...formData.selectedPatient.contact, email: formData.patientEmail.trim() },
        });
      }

      let res;
      if (appointmentToEdit) {
          res = await API.put(`/appointments/${appointmentToEdit._id}`, appointmentPayload);
      } else {
          res = await API.post('/appointments', appointmentPayload);
      }

      if (onSave) onSave(res.data);
      onClose();
    } catch (err) {
      console.error("Booking failed", err);
      alert("Failed to book appointment: " + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* --- Main Modal Overlay --- */}
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/30 backdrop-blur-sm p-4 animate-in fade-in duration-200">
        
        <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
          
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
            <h3 className="font-bold text-lg text-slate-800 dark:text-white">{appointmentToEdit ? 'Edit Appointment' : 'Book Appointment'}</h3>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="p-6 overflow-y-auto">
            <form id="appt-form" onSubmit={handleSubmit} className="flex flex-col gap-5">
              
              {/* --- SEARCHABLE PATIENT SELECTOR --- */}
              <div className="flex flex-col gap-1.5 relative" ref={dropdownRef}>
                <label className="text-xs font-semibold text-slate-500 uppercase">Select Patient</label>
                
                <div className="relative">
                  <Search className="absolute left-3 top-3 text-slate-400" size={18} />
                  <input 
                    type="text"
                    required
                    placeholder="Search by Name or Phone..."
                    className="w-full pl-10 pr-10 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-[#137fec] outline-none bg-white dark:bg-slate-800"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setShowDropdown(true);
                      if (appointmentToEdit && searchTerm !== `${appointmentToEdit.patient.first_name} ${appointmentToEdit.patient.last_name}`) {
                          setFormData({...formData, selectedPatient: null});
                      }
                    }}
                    onFocus={() => setShowDropdown(true)}
                  />
                  <div className="absolute right-2 top-1.5 group/addbtn">
                    <button 
                      type="button"
                      onClick={() => setIsAddPatientOpen(true)}
                      className="p-1.5 bg-[#137fec] hover:bg-blue-600 text-white rounded-lg shadow-sm shadow-blue-400/40 hover:shadow-md hover:shadow-blue-500/40 hover:scale-110 transition-all duration-150"
                    >
                      <Plus size={16} />
                    </button>
                    {/* Tooltip */}
                    <div className="pointer-events-none absolute right-0 top-full mt-1.5 origin-top-right scale-90 opacity-0 group-hover/addbtn:scale-100 group-hover/addbtn:opacity-100 transition-all duration-150 z-50">
                      <div className="bg-slate-800 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg shadow-lg whitespace-nowrap flex items-center gap-1.5">
                        Add New Patient
                      </div>
                    </div>
                  </div>
                </div>

                {/* Dropdown Results */}
                {showDropdown && searchTerm.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto">
                    {patients.length > 0 ? (
                      patients.map(p => (
                        <div 
                          key={p._id} // MongoDB uses _id
                          onClick={() => {
                            setFormData({ ...formData, selectedPatient: p, patientEmail: p.contact?.email || '' });
                            setSearchTerm(`${p.first_name} ${p.last_name || ''}`);
                            setShowDropdown(false);
                          }}
                          className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer border-b border-slate-100 dark:border-slate-700 last:border-0"
                        >
                          <p className="text-sm font-semibold text-slate-800 dark:text-white">
                            {p.first_name} {p.last_name}
                          </p>
                          <p className="text-xs text-slate-500 flex items-center gap-1">
                            <Phone size={10} /> {p.contact?.mobile}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center">
                        <p className="text-sm text-slate-500 mb-3">No patient found.</p>
                        <button 
                          type="button"
                          onClick={() => { setIsAddPatientOpen(true); setShowDropdown(false); }}
                          className="text-sm text-[#137fec] font-bold hover:underline flex items-center justify-center gap-1 mx-auto"
                        >
                          <Plus size={16} /> Add New Patient
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* --- PATIENT EMAIL (shown after patient selected) --- */}
              {formData.selectedPatient && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1.5">
                    Patient Email
                    <span className="normal-case font-normal text-slate-400">(for appointment documents)</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 text-slate-400" size={18} />
                    <input
                      type="email"
                      placeholder="patient@example.com"
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-[#137fec] outline-none bg-white dark:bg-slate-800"
                      value={formData.patientEmail}
                      onChange={e => setFormData({ ...formData, patientEmail: e.target.value })}
                    />
                  </div>
                  {!formData.patientEmail && (
                    <p className="text-xs text-amber-600">No email on file — add one to enable email delivery for this patient.</p>
                  )}
                </div>
              )}

              {/* --- DOCTOR & TREATMENT --- */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Doctor</label>
                  <div className="relative">
                    <select 
                      required
                      className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-[#137fec] outline-none bg-white dark:bg-slate-800 appearance-none"
                      value={formData.doctorId}
                      onChange={(e) => setFormData({...formData, doctorId: e.target.value})}
                    >
                      <option value="">Select Doctor</option>
                      {doctors.map(d => (
                        <option key={d._id} value={d._id}>{d.name} ({d.specialization || 'Gen'})</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-3 text-slate-400 pointer-events-none" size={16} />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Treatment</label>
                  <div className="relative">
                    <Stethoscope className="absolute left-3 top-2.5 text-slate-400" size={18} />
                    <select 
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-[#137fec] outline-none bg-white dark:bg-slate-800 appearance-none"
                      value={formData.type}
                      onChange={(e) => setFormData({...formData, type: e.target.value})}
                    >
                      {TREATMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* --- DATE & TIME --- */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-1 flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Date</label>
                  <input
                    type="date"
                    required
                    min={getIndiaDate()}
                    className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-[#137fec] outline-none bg-white dark:bg-slate-800"
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                  />
                </div>
                <div className="sm:col-span-1 flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Time</label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-2.5 text-slate-400" size={18} />
                    <input 
                      type="time" 
                      required
                      className="w-full pl-10 pr-3 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-[#137fec] outline-none bg-white dark:bg-slate-800"
                      value={formData.time}
                      onChange={(e) => setFormData({...formData, time: e.target.value})}
                    />
                  </div>
                </div>
                <div className="sm:col-span-1 flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Duration</label>
                  <select 
                    className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-[#137fec] outline-none bg-white dark:bg-slate-800"
                    value={formData.duration}
                    onChange={(e) => setFormData({...formData, duration: e.target.value})}
                  >
                    <option value="15">15 Mins</option>
                    <option value="30">30 Mins</option>
                    <option value="45">45 Mins</option>
                    <option value="60">1 Hour</option>
                  </select>
                </div>
              </div>

              {/* --- WHATSAPP LANGUAGE --- */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1.5">
                  <span>WhatsApp Language</span>
                  <span className="normal-case font-normal text-slate-400">(optional — uses clinic default if blank)</span>
                </label>
                <div className="relative">
                  <select
                    className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-[#137fec] outline-none bg-white dark:bg-slate-800 appearance-none"
                    value={formData.whatsapp_language}
                    onChange={e => setFormData({ ...formData, whatsapp_language: e.target.value })}
                  >
                    <option value="">Use clinic default</option>
                    <option value="en">🇬🇧 English</option>
                    <option value="hi">🇮🇳 Hindi</option>
                    <option value="mr">🟠 Marathi</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-3 text-slate-400 pointer-events-none" size={16} />
                </div>
              </div>

              {/* --- NOTES --- */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase">Notes (Optional)</label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 text-slate-400" size={18} />
                  <textarea 
                    rows="3"
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-[#137fec] outline-none bg-white dark:bg-slate-800 resize-none"
                    placeholder="Add specific instructions..."
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  ></textarea>
                </div>
              </div>

            </form>
          </div>

          <div className="p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3">
            <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-600 font-semibold text-sm hover:bg-slate-100 transition-colors">Cancel</button>
            <button 
              type="submit" 
              form="appt-form" 
              disabled={loading}
              className={`px-6 py-2.5 rounded-xl bg-[#137fec] hover:bg-blue-600 text-white font-bold text-sm shadow-lg shadow-blue-500/30 transition-all flex items-center gap-2 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {loading ? 'Saving...' : (appointmentToEdit ? 'Update Appointment' : 'Confirm Booking')}
            </button>
          </div>

        </div>
      </div>

      {/* --- SUB MODAL: ADD PATIENT --- */}
      <AddPatientModal 
        isOpen={isAddPatientOpen} 
        onClose={() => setIsAddPatientOpen(false)}
        onSave={handleNewPatientCreated} 
      />
    </>
  );
};

export default NewAppointmentModal;