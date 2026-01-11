import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  X, User, Edit2, Phone, MapPin, Activity, 
  Calendar, FileText, Clock, AlertCircle, ArrowRight,
  Stethoscope, Image as ImageIcon, File
} from 'lucide-react';
import API from '../services/api'; 
import TreatmentPlanBoard from '../components/TreatmentPlanBoard'; 


const PatientProfileModal = ({ isOpen, onClose, patient: initialPatient }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('General');
  
  // Data States
  const [patientData, setPatientData] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [visits, setVisits] = useState([]); 
  const [loading, setLoading] = useState(false);
  
  // Notes State
  const [notes, setNotes] = useState('');
  const [isEditingNotes, setIsEditingNotes] = useState(false);

  // Tabs Configuration
  const tabs = [
    { name: 'General', icon: null },
    { name: 'Treatments', icon: null }, // Shows the Board
    { name: 'Medical Records', icon: null }, // X-Rays/Files
    { name: 'Appointments', icon: null },
    { name: 'Notes', icon: null }, // General Notes
    { name: 'Financials', icon: null },
  ];

  // --- 1. Fetch Data on Open ---
  useEffect(() => {
    if (isOpen && initialPatient?._id) {
      fetchPatientDetails();
      fetchVisits(); // Needed for Treatment Board & Records
    }
  }, [isOpen, initialPatient]);

  // --- 2. Fetch Tab Specific Data ---
  useEffect(() => {
    if (!isOpen || !initialPatient?._id) return;

    if (activeTab === 'Appointments') {
      API.get(`/appointments?patient_id=${initialPatient._id}`)
         .then(res => setAppointments(res.data))
         .catch(err => console.error(err));
    }
  }, [activeTab, isOpen, initialPatient]);

  const fetchPatientDetails = async () => {
    setLoading(true);
    try {
      const res = await API.get(`/patients/${initialPatient._id}`);
      setPatientData(res.data);
      setNotes(res.data.general_notes || '');
    } catch (err) {
      console.error("Failed to fetch patient details", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchVisits = async () => {
      try {
          const res = await API.get(`/visits/patient/${initialPatient._id}`);
          setVisits(res.data);
      } catch (err) { console.error(err); }
  };

  // --- Actions ---
  const handleSaveNotes = async () => {
      try {
          await API.put(`/patients/${initialPatient._id}`, { general_notes: notes });
          setIsEditingNotes(false);
          // Optional: Show toast success
      } catch (err) {
          alert("Failed to save notes");
      }
  };

  const handleContinueTreatment = () => {
      onClose(); // Close modal first
      navigate(`/treatment/${initialPatient._id}`); // Go to full page
  };

  // --- Aggregators ---
  // Extract all files from all visits for the "Medical Records" tab
  const allRecords = visits.flatMap(v => v.files || []).concat([
      // Mock data for visual demonstration if no real files exist yet
      { file_type: 'X-Ray', url: 'https://dentobesscdn.b-cdn.net/dental-teeth/Pedo/Teeth55.svg', uploaded_at: new Date() },
      { file_type: 'Report', url: '', uploaded_at: new Date('2025-12-01') }
  ]);

  // --- Helpers ---
  const getAge = (dob) => dob ? new Date().getFullYear() - new Date(dob).getFullYear() : 'N/A';
  const formatDate = (dateString) => new Date(dateString).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  if (!isOpen || !initialPatient) return null;

  const p = patientData || initialPatient; 
  const fullName = `${p.first_name} ${p.last_name || ''}`;

  return (
    // Overlay
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/20 backdrop-blur-sm transition-opacity" onClick={onClose}>
      
      {/* Modal Container */}
      <div 
        className="w-full max-w-5xl h-full bg-[#f6f7f8] dark:bg-[#101922] shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300"
        onClick={(e) => e.stopPropagation()} 
      >
        
        {/* --- Header --- */}
        <div className="px-6 py-4 flex items-center justify-between sticky top-0 bg-[#f6f7f8] dark:bg-[#101922] z-20 border-b border-slate-200 dark:border-slate-800">
          <div className="flex gap-2 items-center text-sm font-semibold">
            <span className="text-[#137fec]">Patient Profile</span>
          </div>
          
          <div className="flex items-center gap-3">
             {/* CONTINUE TREATMENT BUTTON */}
             <button 
                onClick={handleContinueTreatment}
                className="flex items-center gap-2 px-4 py-2 bg-[#137fec] hover:bg-blue-600 text-white text-sm font-semibold rounded-lg shadow-lg shadow-blue-500/30 transition-all"
             >
                <Stethoscope size={18} />
                Continue Treatment
             </button>

             <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full text-slate-500 transition-colors">
                <X size={24} />
             </button>
          </div>
        </div>

        <div className="px-6 pb-10 flex flex-col gap-6 mt-6">
          
          {/* --- Demographics Card --- */}
          <div className="bg-white dark:bg-[#1a2634] p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-[#137fec]"></div>
            
            <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                <div className="w-16 h-16 bg-blue-50 text-[#137fec] rounded-full flex items-center justify-center border-4 border-white shadow-sm">
                  <User size={32} />
                </div>
                
                <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3 mb-1">
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{fullName}</h3>
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-bold rounded uppercase tracking-wide">{p.gender}</span>
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-bold rounded uppercase tracking-wide">{getAge(p.dob)} Yrs</span>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                        <span className="flex items-center gap-1"><Phone size={14}/> {p.contact?.mobile}</span>
                        <span className="flex items-center gap-1"><MapPin size={14}/> {p.contact?.city || 'N/A'}</span>
                        <span className="font-mono bg-slate-50 px-2 rounded text-xs py-0.5">ID: {p.patientId}</span>
                    </div>
                </div>
            </div>
          </div>

          {/* --- Tabs --- */}
          <div className="flex flex-col">
            <div className="flex flex-wrap items-center gap-1 overflow-x-auto no-scrollbar border-b border-slate-200 dark:border-slate-800 px-2">
              {tabs.map((tab) => (
                <button
                  key={tab.name}
                  onClick={() => setActiveTab(tab.name)}
                  className={`
                    px-5 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap mb-[-1px]
                    ${activeTab === tab.name 
                      ? 'border-[#137fec] text-[#137fec]' 
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                    }
                  `}
                >
                  {tab.name}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="py-6 min-h-[400px]">
              
              {/* === GENERAL TAB === */}
              {activeTab === 'General' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Medical History */}
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Activity size={18}/> Medical Profile</h4>
                    <div className="space-y-4">
                        <div>
                            <p className="text-xs text-slate-400 uppercase font-bold mb-2">Conditions</p>
                            <div className="flex flex-wrap gap-2">
                                {p.medical_history?.length > 0 ? (
                                    p.medical_history.map((t, i) => (
                                        <span key={i} className="px-3 py-1 bg-red-50 text-red-600 text-xs font-semibold rounded-full border border-red-100">{t}</span>
                                    ))
                                ) : <span className="text-sm text-slate-400 italic">None</span>}
                            </div>
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 uppercase font-bold mb-2">Allergies</p>
                            <div className="flex flex-wrap gap-2">
                                {p.allergies?.map((t, i) => (
                                     <span key={i} className="px-3 py-1 bg-orange-50 text-orange-600 text-xs font-semibold rounded-full border border-orange-100">{t}</span>
                                ))}
                                {(!p.allergies || p.allergies.length === 0) && <span className="text-sm text-slate-400 italic">None</span>}
                            </div>
                        </div>
                    </div>
                  </div>

                  {/* Contact Details */}
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                     <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><User size={18}/> Personal Details</h4>
                     <div className="space-y-3 text-sm">
                        <div className="flex justify-between border-b border-slate-50 pb-2">
                            <span className="text-slate-500">Address</span>
                            <span className="font-medium text-slate-900">{p.contact?.address || '-'}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-50 pb-2">
                            <span className="text-slate-500">Email</span>
                            <span className="font-medium text-slate-900">{p.contact?.email || '-'}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-50 pb-2">
                            <span className="text-slate-500">Emergency Contact</span>
                            <span className="font-medium text-slate-900">{p.emergency_contact?.name || '-'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Emergency Phone</span>
                            <span className="font-medium text-slate-900">{p.emergency_contact?.phone || '-'}</span>
                        </div>
                     </div>
                  </div>
                </div>
              )}

              {/* === TREATMENTS TAB (The Board) === */}
              {activeTab === 'Treatments' && (
                 <div>
                    <div className="mb-4 flex justify-between items-center">
                        <h4 className="font-bold text-slate-800">Treatment Plan Overview</h4>
                        <button onClick={handleContinueTreatment} className="text-sm text-[#137fec] hover:underline flex items-center gap-1">
                            Go to Full View <ArrowRight size={14}/>
                        </button>
                    </div>
                    {/* Pass the visits we fetched to the Board component */}
                    <TreatmentPlanBoard visits={visits} />
                 </div>
              )}

              {/* === MEDICAL RECORDS TAB === */}
              {activeTab === 'Medical Records' && (
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm min-h-[300px]">
                      <div className="flex justify-between mb-6">
                          <h4 className="font-bold text-slate-800">Files & X-Rays</h4>
                          <button className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold text-slate-600 transition-colors">
                              + Upload File
                          </button>
                      </div>
                      
                      {allRecords.length > 0 ? (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              {allRecords.map((file, i) => (
                                  <div key={i} className="group relative border border-slate-200 rounded-xl overflow-hidden hover:shadow-md transition-all cursor-pointer">
                                      {/* Preview Area */}
                                      <div className="h-32 bg-slate-50 flex items-center justify-center">
                                          {file.file_type === 'X-Ray' || file.url.includes('.svg') || file.url.includes('.jpg') ? (
                                              <img src={file.url} alt="Record" className="w-full h-full object-cover" />
                                          ) : (
                                              <FileText size={32} className="text-slate-300" />
                                          )}
                                      </div>
                                      {/* Info Area */}
                                      <div className="p-3 bg-white">
                                          <p className="text-xs font-bold text-slate-700 truncate">{file.file_type} Record</p>
                                          <p className="text-[10px] text-slate-400">{formatDate(file.uploaded_at)}</p>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      ) : (
                          <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                              <ImageIcon size={32} className="mb-2 opacity-50"/>
                              <p className="text-sm">No medical records uploaded yet.</p>
                          </div>
                      )}
                  </div>
              )}

              {/* === NOTES TAB === */}
              {activeTab === 'Notes' && (
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-full">
                      <div className="flex justify-between items-center mb-4">
                          <h4 className="font-bold text-slate-800">General Clinical Notes</h4>
                          {!isEditingNotes ? (
                              <button onClick={() => setIsEditingNotes(true)} className="flex items-center gap-1 text-xs font-bold text-[#137fec] bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors">
                                  <Edit2 size={12}/> Edit Notes
                              </button>
                          ) : (
                              <div className="flex gap-2">
                                  <button onClick={() => setIsEditingNotes(false)} className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg hover:bg-slate-200">Cancel</button>
                                  <button onClick={handleSaveNotes} className="text-xs font-bold text-white bg-[#137fec] px-3 py-1.5 rounded-lg hover:bg-blue-600">Save</button>
                              </div>
                          )}
                      </div>
                      
                      {isEditingNotes ? (
                          <textarea 
                              value={notes} 
                              onChange={(e) => setNotes(e.target.value)}
                              className="w-full h-64 p-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#137fec] focus:outline-none text-sm leading-relaxed resize-none"
                              placeholder="Type patient observations, habits, or private notes here..."
                          ></textarea>
                      ) : (
                          <div className="prose prose-sm max-w-none text-slate-600 bg-slate-50 p-6 rounded-xl min-h-[200px] border border-slate-100">
                              {notes ? notes : <span className="italic text-slate-400">No notes added yet.</span>}
                          </div>
                      )}
                  </div>
              )}

              {/* === APPOINTMENTS TAB === */}
              {activeTab === 'Appointments' && (
                  <div className="flex flex-col gap-3">
                     {appointments.length > 0 ? (
                        appointments.map(appt => (
                            <div key={appt._id} className="flex justify-between items-center p-4 bg-white border border-slate-200 rounded-xl hover:shadow-sm transition-all">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-blue-50 text-[#137fec] rounded-lg flex items-center justify-center">
                                        <Calendar size={18}/>
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm text-slate-800">{appt.title}</p>
                                        <div className="flex gap-3 text-xs text-slate-500 mt-1">
                                            <span className="flex items-center gap-1"><Clock size={12}/> {new Date(appt.start_time).toLocaleDateString()}</span>
                                            <span className="flex items-center gap-1"><User size={12}/> {appt.doctor_id?.name || 'Doctor'}</span>
                                        </div>
                                    </div>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                                    appt.status === 'Completed' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                                }`}>
                                    {appt.status}
                                </span>
                            </div>
                        ))
                     ) : (
                        <div className="text-center py-10 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-300">No appointments found.</div>
                     )}
                  </div>
              )}

            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default PatientProfileModal;