import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom'; 
import { 
  Printer, FileText, Monitor, Phone, 
  MapPin, User, Plus, ChevronDown, NotebookPen, Pill, TestTube, Loader2, Save
} from 'lucide-react';

// --- IMPORTS ---
import API from '../services/api'; 
import PatientProfileModal from '../modals/PatientProfileModal';
import TreatmentTabs from '../components/TreatmentTabs'; 
import TreatmentPlanBoard from '../components/TreatmentPlanBoard';
import ReportsNotesSection from '../components/ReportNotesSection';

// --- Sub-Components ---

// Updated to accept onViewProfile prop
const PatientInfoCard = ({ patient, onViewProfile }) => { 
  // Handle Loading/Empty State
  if (!patient) {
      return <div className="p-5 bg-white rounded-xl shadow-sm border border-gray-100 mb-6 h-48 animate-pulse"></div>;
  }

  const age = patient.dob ? new Date().getFullYear() - new Date(patient.dob).getFullYear() : '-';
  const fullName = `${patient.first_name} ${patient.last_name || ''}`.trim();

  return (
    <div className="p-5 bg-white rounded-xl relative shadow-sm border border-gray-100 mb-6">
      <div className="absolute top-0 left-5 bg-blue-50 text-blue-600 px-3 py-1.5 rounded-b-md text-sm font-medium">
        Patient Profile
      </div>
      
      <div className="pt-8 flex flex-col gap-6">
        <div className="flex justify-between flex-wrap gap-5">
          <h2 className="font-semibold text-2xl text-gray-800 capitalize">{fullName}</h2>
          <div className="flex flex-wrap gap-5 items-center text-gray-600">
            <div className="flex gap-2 items-center">
              <MapPin size={18} /> <span>{patient.contact?.city || 'N/A'}</span>
            </div>
            <div className="flex gap-2 items-center">
              <Phone size={18} /> <span>{patient.contact?.mobile || '--'}</span>
            </div>
            <div className="flex gap-2 items-center">
              <User size={18} /> <span>{patient.gender}</span>
            </div>
            
            {/* ACTION BUTTON LINKED TO MODAL */}
            <button 
              onClick={onViewProfile}
              className="px-3 py-1.5 border border-[#137fec] text-[#137fec] rounded-md text-sm font-medium hover:bg-[#137fec] hover:text-white transition-colors"
            >
              View Profile
            </button>
          </div>
        </div>

        <div className="border-t border-gray-200 w-full"></div>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-5">
          {[
            { label: "Gender", value: patient.gender },
            { label: "Age", value: `${age} Yrs` },
            { label: "Patient ID", value: patient.patientId || patient._id?.slice(-6).toUpperCase() },
            { label: "Blood Group", value: patient.blood_group || '-' },
            { label: "Reg Date", value: new Date(patient.createdAt).toLocaleDateString() },
          ].map((item, idx) => (
            <div key={idx} className="flex flex-col gap-1">
              <p className="text-sm text-gray-400">{item.label}</p>
              <p className="font-medium text-gray-800">{item.value}</p>
            </div>
          ))}
          <div className="flex flex-col gap-1">
              <p className="text-sm text-gray-400">Alerts</p>
              <div className="flex items-center gap-2">
                 {patient.medical_history?.slice(0, 2).map((tag, i) => (
                   <span key={i} className="text-[10px] bg-red-50 text-red-600 px-1 rounded border border-red-100">{tag}</span>
                 ))}
                 {(!patient.medical_history || patient.medical_history.length === 0) && <span>-</span>}
              </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ClinicalHistory = ({ patient, onSaveHistory }) => {
  // Local state for editing fields
  const [formData, setFormData] = useState({
    chief_complaint: '',
    medical_history: [], // Array of strings
    dental_history: ''
  });
  const [isEditing, setIsEditing] = useState(false);

  // Initialize data from patient prop
  useEffect(() => {
    if (patient) {
      setFormData({
        chief_complaint: patient.chief_complaint || '',
        medical_history: patient.medical_history || [],
        dental_history: patient.dental_history || ''
      });
    }
  }, [patient]);

  const handleSave = () => {
    onSaveHistory(formData);
    setIsEditing(false);
  };

  const handleMedicalHistoryChange = (e) => {
      // Split comma-separated string into array for backend
      const val = e.target.value;
      setFormData({...formData, medical_history: val ? val.split(',').map(s => s.trim()) : []});
  };

  return (
    <div className="p-5 bg-white rounded-xl shadow-sm border border-gray-100 mb-6 relative group">
      {/* Edit/Save Controls */}
      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
         {isEditing ? (
             <button onClick={handleSave} className="flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-600 rounded-md text-xs font-bold border border-green-200 hover:bg-green-100">
                 <Save size={14} /> Save Changes
             </button>
         ) : (
             <button onClick={() => setIsEditing(true)} className="flex items-center gap-1 px-3 py-1.5 bg-slate-50 text-slate-500 rounded-md text-xs font-bold border border-slate-200 hover:bg-slate-100">
                 <NotebookPen size={14} /> Edit History
             </button>
         )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="flex flex-col gap-5">
          
          {/* 1. Chief Complaint */}
          <div className="flex flex-col gap-2">
            <label className="font-semibold text-gray-700">Chief Complaints</label>
            {isEditing ? (
                <textarea 
                    className="w-full border border-gray-300 rounded-md p-2 text-sm focus:outline-none focus:border-[#137fec] resize-none"
                    rows={2}
                    value={formData.chief_complaint}
                    onChange={(e) => setFormData({...formData, chief_complaint: e.target.value})}
                    placeholder="e.g. Pain in upper right tooth"
                />
            ) : (
                <div className="p-2 bg-slate-50 rounded-md text-sm text-gray-700 min-h-[40px] flex items-center">
                    {formData.chief_complaint || <span className="text-gray-400 italic">No record</span>}
                </div>
            )}
          </div>

          {/* 2. Medical History */}
          <div className="flex flex-col gap-2">
            <label className="font-semibold text-gray-700">Medical History</label>
            {isEditing ? (
                <input 
                    type="text"
                    className="w-full border border-gray-300 rounded-md p-2 text-sm focus:outline-none focus:border-[#137fec]"
                    value={formData.medical_history.join(', ')}
                    onChange={handleMedicalHistoryChange}
                    placeholder="e.g. Diabetes, Hypertension (comma separated)"
                />
            ) : (
                <div className="flex flex-wrap gap-2 min-h-[40px] items-center">
                    {formData.medical_history.length > 0 ? (
                        formData.medical_history.map((tag, i) => (
                            <span key={i} className="px-2 py-1 bg-red-50 text-red-600 rounded text-xs border border-red-100 font-medium">
                                {tag}
                            </span>
                        ))
                    ) : <span className="text-gray-400 italic text-sm">None</span>}
                </div>
            )}
          </div>

          {/* 3. Dental History */}
          <div className="flex flex-col gap-2">
            <label className="font-semibold text-gray-700">Dental History</label>
            {isEditing ? (
                <textarea 
                    className="w-full border border-gray-300 rounded-md p-2 text-sm focus:outline-none focus:border-[#137fec] resize-none"
                    rows={2}
                    value={formData.dental_history}
                    onChange={(e) => setFormData({...formData, dental_history: e.target.value})}
                    placeholder="e.g. Previous extraction 2 years ago"
                />
            ) : (
                <div className="p-2 bg-slate-50 rounded-md text-sm text-gray-700 min-h-[40px] flex items-center">
                    {formData.dental_history || <span className="text-gray-400 italic">No record</span>}
                </div>
            )}
          </div>

        </div>

        {/* 4. On Examination (Static for now, usually linked to Visits) */}
        <div className="flex flex-col gap-2">
          <label className="font-semibold text-gray-700">On Examination</label>
          <div className="h-full min-h-[150px] bg-gray-50 rounded-lg border border-transparent hover:border-[#137fec] transition-colors p-4 flex flex-col gap-2">
             <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Latest Findings</span>
             {/* We can map recent visit findings here later */}
             <div className="text-sm text-gray-600 italic">
                From Dental Chart: <br/>
                - 18: Decay<br/>
                - 21: Missing
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- NEW SECTIONS ---

const ConsultationNotes = () => (
  <div className="p-5 bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
    <div className="flex justify-between items-center mb-4">
       <div className="flex items-center gap-3">
         <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-[#137fec]">
            <NotebookPen size={20} />
         </div>
         <h3 className="font-heading font-semibold text-lg text-[#322A2A]">Consultation Notes</h3>
       </div>
       <button className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors font-medium text-sm">
         <Plus size={18} /> New Note
       </button>
    </div>
  </div>
);

const Medications = () => (
   <div className="p-5 bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
     <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
           <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-[#137fec]">
             <Pill size={20} />
           </div>
           <h3 className="font-heading font-semibold text-lg text-[#322A2A]">Medications</h3>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors font-medium text-sm">
          <Plus size={18} /> Prescribe Medicine
        </button>
     </div>
   </div>
);

const LabOrders = () => (
   <div className="p-5 bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
     <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
           <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-[#137fec]">
             <TestTube size={20} />
           </div>
           <h3 className="font-heading font-semibold text-lg text-[#322A2A]">Lab Orders</h3>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors font-medium text-sm">
          <Plus size={18} /> Add Lab Order
        </button>
     </div>
   </div>
);

const AdvicesRecall = () => {
  const [activeTab, setActiveTab] = useState('Advices');
  return (
    <div className="p-5 bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
       <div className="flex justify-between items-center mb-6">
          <div className="flex gap-6">
             <button onClick={() => setActiveTab('Advices')} className={`pb-2 text-lg font-medium transition-all border-b-2 ${activeTab === 'Advices' ? 'text-[#137fec] border-[#137fec]' : 'text-gray-500 border-transparent hover:text-gray-800'}`}>Advices</button>
             <button onClick={() => setActiveTab('Recall')} className={`pb-2 text-lg font-medium transition-all border-b-2 ${activeTab === 'Recall' ? 'text-[#137fec] border-[#137fec]' : 'text-gray-500 border-transparent hover:text-gray-800'}`}>Recall</button>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors font-medium text-sm">
            <Plus size={18} /> Add {activeTab === 'Advices' ? 'Advice' : 'Recall'}
          </button>
       </div>
       <div className="flex items-center justify-center py-8 text-gray-400 text-sm">
          No {activeTab.toLowerCase()} yet.
       </div>
    </div>
  )
};

// --- MAIN PAGE COMPONENT ---

export default function TreatmentPage({ patientIdProp, isOverlay }) {
  const { id: paramId } = useParams(); // Get ID from URL if available
  // PRIORITY: Prop (from Overlay) > Param (from URL)
  const id = patientIdProp || paramId; 
  
  const [patient, setPatient] = useState(null);
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isProfileOpen, setIsProfileOpen] = useState(false); // Modal State

  // Central Data Fetch Function
  const fetchPageData = async () => {
    try {
      // Note: We don't set loading(true) here to prevent full page flicker on refreshes
      const [patientRes, visitsRes] = await Promise.all([
          API.get(`/patients/${id}`),
          API.get(`/visits/patient/${id}`)
      ]);
      setPatient(patientRes.data);
      setVisits(visitsRes.data);
    } catch (err) {
      console.error("Failed to fetch treatment data", err);
    } finally {
      setLoading(false);
    }
  };

  // Initial Load
  useEffect(() => {
    if (id) {
        setLoading(true);
        fetchPageData();
    }
  }, [id]);

  const handleSaveHistory = async (updatedData) => {
      try {
          await API.put(`/patients/${id}`, updatedData);
          // Optimistic update or refresh
          setPatient(prev => ({ ...prev, ...updatedData }));
          alert("Clinical History Updated");
      } catch (err) {
          console.error("Failed to update history", err);
          alert("Update failed");
      }
  };

  if (loading) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-[#EBF2F7]">
              <Loader2 className="animate-spin text-[#137fec]" size={40} />
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-[#EBF2F7] px-4 font-sans pb-20">
      <div className="max-w-7xl mx-auto pt-6">
        
        {/* Note: PatientHeader removed as requested */}
        
        {/* Pass 'onViewProfile' to open the modal */}
        <PatientInfoCard 
            patient={patient} 
            onViewProfile={() => setIsProfileOpen(true)}
        />
        
        <ClinicalHistory 
            patient={patient} 
            onSaveHistory={handleSaveHistory}
        />
        
        <ReportsNotesSection 
            patientId={id} 
            visits={visits} 
            onRefresh={fetchPageData} 
        />

        {/* 1. Dental Chart Tabs - Pass callback to refresh data when treatment added */}
        <TreatmentTabs 
          onTreatmentAdded={fetchPageData}
          visits={visits}
          patientId={id}
          initialDentition={patient?.dentition_type || 'Adult'} />

        {/* 2. Treatment Plan Board - Pass callback to refresh data when status changes */}
        <TreatmentPlanBoard 
            visits={visits} 
            onRefresh={fetchPageData} 
        />

        {/* 3. Other Sections */}
        <ConsultationNotes />
        <Medications />
        <LabOrders />
        <AdvicesRecall />

        {/* Sticky Bottom Action Bar */}
        <div className="sticky bottom-4 z-10 bg-white p-4 rounded-xl shadow-[0_-4px_20px_rgba(0,0,0,0.05)] border border-gray-100 flex justify-end gap-3">
             <button className="px-6 py-2 border border-[#137fec] text-[#137fec] font-medium rounded-lg hover:bg-blue-50 flex items-center gap-2 transition-colors">
                <FileText size={18} /> Prescription
             </button>
             <button disabled className="px-8 py-2 bg-gray-300 text-white font-medium rounded-lg cursor-not-allowed">
                Continue
             </button>
        </div>
      </div>

      {/* Patient Profile Modal */}
      <PatientProfileModal 
        isOpen={isProfileOpen} 
        onClose={() => setIsProfileOpen(false)} 
        patient={patient} 
      />
    </div>
  );
}