import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom'; // 1. Added Routing Hooks
import { 
  ChevronLeft, Printer, FileText, Monitor, Phone, 
  MapPin, User, Plus, ChevronDown, NotebookPen, Pill, TestTube, Loader2 
} from 'lucide-react';

// --- IMPORTS ---
import API from '../services/api'; // 2. Added API Service
import TreatmentTabs from '../components/TreatmentTabs'; 
import TreatmentPlanBoard from '../components/TreatmentPlanBoard'; 

// --- Sub-Components (Header & Info) ---

const PatientHeader = () => {
  const navigate = useNavigate(); // Navigation Hook

  return (
    <div className="flex flex-col lg:flex-row gap-3 lg:w-full lg:items-center lg:justify-between mb-7">
      <div 
        onClick={() => navigate('/patients')} // Added Back Logic
        className="flex gap-2 items-center text-gray-600 hover:text-[#137fec] cursor-pointer transition-colors"
      >
        <ChevronLeft size={20} />
        <span className="font-semibold text-lg">Back</span>
      </div>
      
      <div className="flex flex-wrap gap-3 justify-end">
        <button className="rounded-md border border-gray-800 px-3 py-2 text-gray-800 font-medium hover:bg-gray-50 transition-colors">
          View Treatment Plans
        </button>
        <button className="rounded-md border border-gray-800 px-3 py-2 hover:bg-gray-50 text-gray-800 transition-colors">
          <Printer size={18} />
        </button>
        <button className="rounded-md border border-gray-800 px-3 py-2 hover:bg-gray-50 text-gray-800 transition-colors">
          <FileText size={18} />
        </button>
        <button className="rounded-md border border-gray-800 px-3 py-2 hover:bg-gray-50 text-gray-800 transition-colors">
          <Monitor size={18} />
        </button>
      </div>
    </div>
  );
};

const PatientInfoCard = ({ patient }) => { // Added 'patient' prop
  // Handle Loading/Empty State inside card to preserve layout
  if (!patient) {
      return <div className="p-5 bg-white rounded-xl shadow-sm border border-gray-100 mb-6 h-48 animate-pulse"></div>;
  }

  // Calculate Age dynamically
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
            <button className="px-3 py-1.5 border border-[#137fec] text-[#137fec] rounded-md text-sm font-medium hover:bg-[#137fec] hover:text-white transition-colors">
              View Profile
            </button>
          </div>
        </div>

        <div className="border-t border-gray-200 w-full"></div>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-5">
          {[
            { label: "Gender", value: patient.gender },
            { label: "Age", value: `${age} Yrs` },
            { label: "Patient ID", value: patient.patientId },
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

const ClinicalHistory = () => {
  const inputs = ["Chief Complaints", "Medical History", "Dental History"];
  return (
    <div className="p-5 bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="flex flex-col gap-5">
          {inputs.map((label) => (
            <div key={label} className="flex flex-col gap-2">
              <label className="font-semibold text-gray-700">{label}</label>
              <div className="relative">
                <input 
                    type="text" 
                    placeholder="Search & Select" 
                    className="w-full border border-gray-300 rounded-md p-2 pl-3 focus:outline-none focus:border-[#137fec] transition-colors"
                />
                <ChevronDown className="absolute right-3 top-3 text-gray-400" size={16} />
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-2">
          <label className="font-semibold text-gray-700">On Examination</label>
          <div className="h-full min-h-[150px] bg-gray-50 rounded-lg border border-transparent hover:border-[#137fec] transition-colors p-4 flex items-start">
            <span className="text-gray-400 text-sm">Add on-examination details from the dental chart</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- NEW SECTIONS WITH CIRCLE ICONS (Blue Theme) ---

const ConsultationNotes = () => (
  <div className="p-5 bg-white rounded-xl shadow-sm border border-gray-100 mb-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
    <div className="flex justify-between items-center mb-4">
       <div className="flex items-center gap-3">
         {/* Icon in Circle */}
         <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-[#137fec]">
            <NotebookPen size={20} />
         </div>
         <h3 className="font-heading font-semibold text-lg text-[#322A2A]">
           Consultation Notes
         </h3>
       </div>
       <button className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors font-medium text-sm">
         <Plus size={18} /> New Note
       </button>
    </div>
    <div className="flex flex-col gap-3">
        {/* Empty state or list of notes */}
    </div>
  </div>
);

const Medications = () => (
   <div className="p-5 bg-white rounded-xl shadow-sm border border-gray-100 mb-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
     <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
           {/* Icon in Circle */}
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
   <div className="p-5 bg-white rounded-xl shadow-sm border border-gray-100 mb-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
     <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
           {/* Icon in Circle */}
           <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-[#137fec]">
             <TestTube size={20} />
           </div>
           <h3 className="font-heading font-semibold text-lg text-[#322A2A]">Lab Orders</h3>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors font-medium text-sm">
          <Plus size={18} /> Add Lab Order
        </button>
     </div>
     <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
       {/* Empty Grid */}
     </div>
   </div>
);

const AdvicesRecall = () => {
  const [activeTab, setActiveTab] = useState('Advices');
  return (
    <div className="p-5 bg-white rounded-xl shadow-sm border border-gray-100 mb-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
       <div className="flex justify-between items-center mb-6">
          <div className="flex gap-6">
             <button
               onClick={() => setActiveTab('Advices')}
               className={`pb-2 text-lg font-medium transition-all border-b-2 ${activeTab === 'Advices' ? 'text-[#137fec] border-[#137fec]' : 'text-gray-500 border-transparent hover:text-gray-800'}`}
             >
               Advices
             </button>
             <button
               onClick={() => setActiveTab('Recall')}
               className={`pb-2 text-lg font-medium transition-all border-b-2 ${activeTab === 'Recall' ? 'text-[#137fec] border-[#137fec]' : 'text-gray-500 border-transparent hover:text-gray-800'}`}
             >
               Recall
             </button>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors font-medium text-sm">
            <Plus size={18} /> Add {activeTab === 'Advices' ? 'Advice' : 'Recall'}
          </button>
       </div>
       <div className="flex items-center justify-center py-8 text-gray-400 text-sm">
          No {activeTab.toLowerCase()} yet. Click "Add {activeTab === 'Advices' ? 'Advice' : 'Recall'}" to create one.
       </div>
    </div>
  )
};

// --- MAIN PAGE COMPONENT ---

export default function TreatmentPage() {
  const { id } = useParams(); // Get ID from URL
  const [patient, setPatient] = useState(null);
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch Patient & Visits on Load
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
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

    if (id) fetchData();
  }, [id]);

  if (loading) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-[#EBF2F7]">
              <Loader2 className="animate-spin text-[#137fec]" size={40} />
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-[#EBF2F7] px-4 font-sans">
      <div className="max-w-7xl mx-auto pt-6">
        <PatientHeader />
        
        {/* Pass fetched data to components */}
        <PatientInfoCard patient={patient} />
        
        <ClinicalHistory />
        
        {/* RVG Reports */}
        <div className="p-5 bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
            <h3 className="font-semibold text-lg text-gray-800 mb-4">RVG Reports & Notes</h3>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex justify-center items-center text-gray-500 mb-4 hover:border-[#137fec] transition-colors cursor-pointer">
                Add Report & Note
            </div>
            <button className="w-full py-3 bg-blue-50 text-blue-500 font-medium rounded-lg flex items-center justify-center gap-2 hover:bg-blue-100 transition-colors">
                <Plus size={18} /> Add More Report
            </button>
        </div>

        {/* 1. Dental Chart Tabs */}
        <TreatmentTabs />

        {/* 2. Treatment Plan Board - Pass real visits data */}
        <TreatmentPlanBoard visits={visits} />

        {/* 3. New Sections Added Here */}
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
    </div>
  );
}