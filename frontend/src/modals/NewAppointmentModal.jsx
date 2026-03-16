import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Calendar, Clock, Stethoscope, FileText, 
  ChevronDown, Search, Plus, Phone 
} from 'lucide-react';

// Import your API helper
import API from '../services/api';

// Keep your existing sub-modal import
import AddPatientModal from './AddPatientModal'; 

const TREATMENT_TYPES = [
  'Consultation', 'Root Canal', 'Cleaning', 'Whitening', 'Extraction', 'Braces Checkup'
];

const NewAppointmentModal = ({ isOpen, onClose, onSave, appointmentToEdit }) => {
  // --- Data States ---
  const [patients, setPatients] = useState([]); // Stores search results
  const [doctors, setDoctors] = useState([]);   // Stores fetched doctors
  const [loading, setLoading] = useState(false);

  // --- UI States ---
  const [isAddPatientOpen, setIsAddPatientOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // --- Form State ---
  const [formData, setFormData] = useState({
    selectedPatient: null, 
    doctorId: '',
    date: new Date().toISOString().split('T')[0],
    time: '09:00',
    duration: '30',
    type: 'Consultation',
    notes: ''
  });

  // --- Populate Form on Edit ---
  useEffect(() => {
    if (isOpen && appointmentToEdit) {
        const dateObj = new Date(appointmentToEdit.start_time);
        const dateStr = dateObj.toISOString().split('T')[0];
        const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

        setFormData({
            selectedPatient: appointmentToEdit.patient, // Assuming this is the patient object
            doctorId: appointmentToEdit.doctor_id,
            date: dateStr,
            time: timeStr,
            duration: '30', // You might need to calculate this from start/end time if stored
            type: appointmentToEdit.type,
            notes: appointmentToEdit.notes || ''
        });
        
        // Pre-fill search term for UI consistency
        if (appointmentToEdit.patient) {
            setSearchTerm(`${appointmentToEdit.patient.first_name} ${appointmentToEdit.patient.last_name}`);
        }
    } else if (isOpen && !appointmentToEdit) {
        // Reset form for new appointment
        setFormData({
            selectedPatient: null, 
            doctorId: '',
            date: new Date().toISOString().split('T')[0],
            time: '09:00',
            duration: '30',
            type: 'Consultation',
            notes: ''
        });
        setSearchTerm('');
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

  // 3. Handle New Patient (Fixed: No Duplicate API Call)
  const handleNewPatientCreated = (createdPatient) => {
    // The patient is already saved in DB by AddPatientModal.
    // We just select them in the UI.
    setFormData(prev => ({ 
      ...prev, 
      selectedPatient: createdPatient 
    }));
    
    // Construct full name for search input
    const fullName = `${createdPatient.first_name} ${createdPatient.last_name || ''}`.trim();
    setSearchTerm(fullName);
    
    // Close modal & dropdown
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

    setLoading(true);

    try {
      const startDateTime = new Date(`${formData.date}T${formData.time}`);
      const endDateTime = new Date(startDateTime.getTime() + parseInt(formData.duration) * 60000);

      const appointmentPayload = {
        patient_id: formData.selectedPatient?._id, // MongoDB _id
        doctor_id: formData.doctorId,             // MongoDB _id
        start_time: startDateTime,
        end_time: endDateTime,
        title: `${formData.type} - ${formData.selectedPatient?.first_name}`,
        type: formData.type,
        status: appointmentToEdit ? appointmentToEdit.status : 'Scheduled',
        room_number: 'Room 1',
        notes: formData.notes
      };

      console.log("SENDING PAYLOAD:", appointmentPayload); 

if (!appointmentPayload.patient_id || !appointmentPayload.doctor_id) {
  alert("Error: Patient ID or Doctor ID is missing. Check console.");
  setLoading(false);
  return;
}

      let res;
      if (appointmentToEdit) {
          // UPDATE EXISTING
          // You'll need an update endpoint, e.g., PUT /appointments/:id
          res = await API.put(`/appointments/${appointmentToEdit._id}`, appointmentPayload);
      } else {
          // CREATE NEW
          res = await API.post('/appointments', appointmentPayload);
      }
      
      // Notify parent to refresh calendar
      if(onSave) onSave(res.data);
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
                  <button 
                    type="button"
                    onClick={() => setIsAddPatientOpen(true)}
                    className="absolute right-2 top-1.5 p-1.5 bg-slate-100 hover:bg-[#137fec] hover:text-white rounded-lg text-slate-500 transition-colors"
                    title="Add New Patient"
                  >
                    <Plus size={16} />
                  </button>
                </div>

                {/* Dropdown Results */}
                {showDropdown && searchTerm.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto">
                    {patients.length > 0 ? (
                      patients.map(p => (
                        <div 
                          key={p._id} // MongoDB uses _id
                          onClick={() => {
                            setFormData({...formData, selectedPatient: p});
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