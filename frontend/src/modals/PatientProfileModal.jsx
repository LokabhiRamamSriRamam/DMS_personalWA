import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X, User, Edit2, Phone, MapPin, Activity,
  ArrowRight, Stethoscope, ChevronDown
} from 'lucide-react';
import API from '../services/api';
import TreatmentPlanBoard from '../components/TreatmentPlanBoard.jsx';
import ReportsNotesSection from '../components/ReportNotesSection.jsx';
import AppointmentTimeline from '../components/AppointmentTimeline.jsx';


const PatientProfileModal = ({ isOpen, onClose, patient: initialPatient }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('General');
  
  // Data States
  const [patientData, setPatientData] = useState(null);
  const [visits, setVisits] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Notes State
  const [notes, setNotes] = useState('');
  const [isEditingNotes, setIsEditingNotes] = useState(false);

  // Edit Patient State
  const [isEditingPatient, setIsEditingPatient] = useState(false);
  const [editFormData, setEditFormData] = useState({
    address: '',
    email: '',
    blood_group: '',
    emergency_contact_name: '',
    emergency_contact_phone: ''
  });

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
      fetchInvoices();
    }
  }, [isOpen, initialPatient]);

  // Appointments tab is handled by AppointmentTimeline component directly

  const fetchPatientDetails = async () => {
    setLoading(true);
    try {
      const res = await API.get(`/patients/${initialPatient._id}`);
      setPatientData(res.data);
      setNotes(res.data.general_notes || '');
      setEditFormData({
        address: res.data.contact?.address || '',
        email: res.data.contact?.email || '',
        blood_group: res.data.blood_group || '',
        emergency_contact_name: res.data.emergency_contact?.name || '',
        emergency_contact_phone: res.data.emergency_contact?.phone || ''
      });
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

  const fetchInvoices = async () => {
      try {
          const res = await API.get(`/invoices?patient_id=${initialPatient._id}`);
          setInvoices(res.data);
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

  const handleSavePatientDetails = async () => {
    try {
      const payload = {
        contact: {
          address: editFormData.address,
          email: editFormData.email,
          mobile: p.contact?.mobile,
          city: p.contact?.city
        },
        blood_group: editFormData.blood_group,
        emergency_contact: {
          name: editFormData.emergency_contact_name,
          phone: editFormData.emergency_contact_phone,
          relation: p.emergency_contact?.relation || ''
        }
      };
      await API.put(`/patients/${initialPatient._id}`, payload);
      setIsEditingPatient(false);
      fetchPatientDetails(); // Refresh data
    } catch (err) {
      alert("Failed to save patient details");
      console.error(err);
    }
  };


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
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative">
                     <div className="flex justify-between items-center mb-4">
                        <h4 className="font-bold text-slate-800 flex items-center gap-2"><User size={18}/> Personal Details</h4>
                        <button
                          onClick={() => setIsEditingPatient(true)}
                          className="flex items-center gap-1 text-xs font-bold text-[#137fec] bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors"
                        >
                          <Edit2 size={12}/> Edit
                        </button>
                     </div>
                     <div className="space-y-3 text-sm">
                        <div className="flex justify-between border-b border-slate-50 pb-2">
                            <span className="text-slate-500">Blood Group</span>
                            <span className="font-medium text-slate-900">{p.blood_group || '-'}</span>
                        </div>
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
                  <ReportsNotesSection patientId={initialPatient._id} />
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
                <AppointmentTimeline
                  patientId={initialPatient._id}
                  patient={patientData || initialPatient}
                />
              )}

              {/* === FINANCIALS TAB === */}
              {activeTab === 'Financials' && (
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <h4 className="font-bold text-slate-800 mb-4">Financial Overview</h4>
                  
                  {/* Summary Cards */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg">
                      <p className="text-sm text-blue-600 font-semibold">Total Billed</p>
                      <h2 className="text-2xl font-bold text-blue-900">
                        ₹{invoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0).toLocaleString()}
                      </h2>
                    </div>
                    <div className="p-4 bg-orange-50 border border-orange-100 rounded-lg">
                      <p className="text-sm text-orange-600 font-semibold">Total Pending</p>
                      <h2 className="text-2xl font-bold text-orange-900">
                        ₹{invoices.reduce((sum, inv) => sum + (inv.pending_amount || 0), 0).toLocaleString()}
                      </h2>
                    </div>
                  </div>

                  {/* Transactions / Invoices List */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[600px]">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-sm">
                          <th className="p-3 font-semibold text-slate-600">Date</th>
                          <th className="p-3 font-semibold text-slate-600">Invoice ID</th>
                          <th className="p-3 font-semibold text-slate-600">Total Bill</th>
                          <th className="p-3 font-semibold text-slate-600">Paid Amount</th>
                          <th className="p-3 font-semibold text-slate-600">Pending Amount</th>
                          <th className="p-3 font-semibold text-slate-600">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoices.length > 0 ? (
                          invoices.map((inv) => (
                            <tr key={inv._id} className="border-b border-slate-100 text-sm hover:bg-slate-50">
                              <td className="p-3 text-slate-800">{formatDate(inv.date)}</td>
                              <td className="p-3 font-mono text-slate-600">{inv.invoice_id}</td>
                              <td className="p-3 font-medium text-slate-800">₹{inv.total_amount?.toLocaleString() || 0}</td>
                              <td className="p-3 text-green-600 font-medium">₹{inv.paid_amount?.toLocaleString() || 0}</td>
                              <td className="p-3 text-orange-600 font-medium">₹{inv.pending_amount?.toLocaleString() || 0}</td>
                              <td className="p-3">
                                <span className={`px-2 py-1 text-xs font-bold rounded-full ${inv.status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                  {inv.status}
                                </span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="6" className="p-4 text-center text-slate-500 italic">No transactions found.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>
          </div>

        </div>

        {/* --- EDIT PATIENT DETAILS MODAL --- */}
        {isEditingPatient && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
              <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
                <h3 className="font-bold text-lg text-slate-800">Edit Patient Details</h3>
                <button
                  onClick={() => setIsEditingPatient(false)}
                  className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-red-500 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Blood Group</label>
                  <div className="relative">
                    <select
                      value={editFormData.blood_group}
                      onChange={(e) => setEditFormData({...editFormData, blood_group: e.target.value})}
                      className="w-full px-4 py-2.5 bg-[#F7F2F2] border-none rounded-lg text-slate-700 appearance-none focus:ring-2 focus:ring-[#137fec] focus:outline-none cursor-pointer"
                    >
                      <option value="">Select blood group</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Address</label>
                  <input
                    type="text"
                    value={editFormData.address}
                    onChange={(e) => setEditFormData({...editFormData, address: e.target.value})}
                    placeholder="Enter address"
                    className="w-full px-4 py-2.5 bg-[#F7F2F2] border-none rounded-lg text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-[#137fec] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Email</label>
                  <input
                    type="email"
                    value={editFormData.email}
                    onChange={(e) => setEditFormData({...editFormData, email: e.target.value})}
                    placeholder="Enter email"
                    className="w-full px-4 py-2.5 bg-[#F7F2F2] border-none rounded-lg text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-[#137fec] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Emergency Contact Name</label>
                  <input
                    type="text"
                    value={editFormData.emergency_contact_name}
                    onChange={(e) => setEditFormData({...editFormData, emergency_contact_name: e.target.value})}
                    placeholder="Enter name"
                    className="w-full px-4 py-2.5 bg-[#F7F2F2] border-none rounded-lg text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-[#137fec] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Emergency Contact Phone</label>
                  <input
                    type="tel"
                    value={editFormData.emergency_contact_phone}
                    onChange={(e) => setEditFormData({...editFormData, emergency_contact_phone: e.target.value})}
                    placeholder="Enter phone number"
                    className="w-full px-4 py-2.5 bg-[#F7F2F2] border-none rounded-lg text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-[#137fec] focus:outline-none"
                  />
                </div>
              </div>

              <div className="px-6 py-4 border-t border-slate-100 flex gap-3 justify-end">
                <button
                  onClick={() => setIsEditingPatient(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSavePatientDetails}
                  className="px-4 py-2 rounded-lg bg-[#137fec] hover:bg-blue-600 text-white font-medium transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientProfileModal;