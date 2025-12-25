import React, { useState } from 'react';
import { X, User, Edit2, Phone, MapPin, Droplet, Calendar, FileText, Activity, CreditCard, Shield } from 'lucide-react';

const PatientProfileModal = ({ isOpen, onClose, patient }) => {
  const [activeTab, setActiveTab] = useState('General');

  if (!isOpen || !patient) return null;

  // Tabs Configuration
  const tabs = [
    { name: 'General', icon: null },
    { name: 'Appointments', icon: null },
    { name: 'Treatments', icon: null },
    { name: 'Records', icon: null },
    { name: 'Lab Orders', icon: null },
    { name: 'Notes', icon: null },
    { name: 'Bills', icon: null },
    { name: 'Insurance', icon: null },
  ];

  return (
    // Overlay
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/20 backdrop-blur-sm transition-opacity" onClick={onClose}>
      
      {/* Modal / Slide-over Container */}
      <div 
        className="w-full max-w-5xl h-full bg-[#f6f7f8] dark:bg-[#101922] shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300"
        onClick={(e) => e.stopPropagation()} // Prevent close when clicking inside
      >
        
        {/* --- Header / Breadcrumbs --- */}
        <div className="px-6 py-5 flex items-center justify-between sticky top-0 bg-[#f6f7f8] dark:bg-[#101922] z-10">
          <div className="flex gap-2 items-center text-sm font-semibold">
            <span className="text-[#137fec] cursor-pointer" onClick={onClose}>Patients</span>
            <span className="text-slate-400">/</span>
            <span className="text-slate-400">Profile</span>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full text-slate-500 transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="px-6 pb-10 flex flex-col gap-6">
          
          {/* --- Top Card: Demographics --- */}
          <div className="bg-white dark:bg-[#1a2634] p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            
            {/* Name & Actions */}
            <div className="flex flex-col-reverse md:flex-row gap-4 md:items-center justify-between mb-6">
              <div className="flex gap-4 items-center">
                <div className="w-12 h-12 bg-blue-100 text-[#137fec] rounded-lg flex items-center justify-center">
                  <User size={28} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">{patient.name}</h3>
                  <p className="text-xs text-slate-500">Patient ID: {patient.patientId}</p>
                </div>
              </div>
              <button className="flex items-center gap-2 text-slate-400 hover:text-[#137fec] transition-colors self-end md:self-auto">
                <Edit2 size={18} />
              </button>
            </div>

            <div className="w-full border-t border-slate-100 dark:border-slate-700 mb-5"></div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-slate-500 uppercase">Age</span>
                <span className="text-sm font-semibold text-slate-900 dark:text-white">24</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-slate-500 uppercase">Location</span>
                <span className="text-sm font-semibold text-slate-900 dark:text-white">Gawar</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-slate-500 uppercase">Phone</span>
                <span className="text-sm font-semibold text-slate-900 dark:text-white">{patient.phone}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-slate-500 uppercase">Gender</span>
                <span className="text-sm font-semibold text-slate-900 dark:text-white">{patient.gender}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-slate-500 uppercase">Blood Group</span>
                <span className="text-sm font-semibold text-slate-900 dark:text-white">O+</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-slate-500 uppercase">Reg Date</span>
                <span className="text-sm font-semibold text-slate-900 dark:text-white">{patient.regDate}</span>
              </div>
            </div>
          </div>

          {/* --- Navigation Tabs & Content --- */}
          <div className="flex flex-col">
            
            {/* Tabs Row */}
            <div className="flex flex-wrap items-center gap-1 overflow-x-auto no-scrollbar">
              {tabs.map((tab) => (
                <button
                  key={tab.name}
                  onClick={() => setActiveTab(tab.name)}
                  className={`
                    px-6 py-3 text-sm font-semibold rounded-t-lg transition-all whitespace-nowrap
                    ${activeTab === tab.name 
                      ? 'bg-white dark:bg-[#1a2634] text-slate-900 dark:text-white shadow-[0_-2px_10px_rgba(0,0,0,0.02)]' 
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-500 hover:bg-slate-300 dark:hover:bg-slate-700'
                    }
                  `}
                >
                  {tab.name}
                </button>
              ))}
            </div>

            {/* Tab Content Panel */}
            <div className="p-6 bg-white dark:bg-[#1a2634] rounded-b-xl rounded-tr-xl shadow-sm border border-slate-200 dark:border-slate-800 min-h-[400px]">
              
              {activeTab === 'General' && (
                <div className="flex flex-col gap-8">
                  
                  {/* Medical History */}
                  <div className="flex flex-col gap-3">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white border-l-4 border-[#137fec] pl-3">Medical History</h3>
                    <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
                      <p className="text-sm text-slate-500 mb-3">Patient History</p>
                      <div className="flex flex-wrap gap-2">
                        {/* Empty state or tags */}
                        <span className="px-3 py-1 bg-red-50 text-red-600 text-xs font-medium rounded-full border border-red-100">Diabetes</span>
                        <span className="px-3 py-1 bg-orange-50 text-orange-600 text-xs font-medium rounded-full border border-orange-100">Penicillin Allergy</span>
                      </div>
                    </div>
                  </div>

                  {/* Contact & Emergency Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* Contact Info */}
                    <div className="flex flex-col gap-3">
                      <h3 className="text-lg font-bold text-slate-800 dark:text-white border-l-4 border-[#137fec] pl-3">Contact Information</h3>
                      <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg grid grid-cols-1 gap-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-xs text-slate-400 font-medium uppercase">Address</span>
                          <p className="text-sm text-slate-800 dark:text-white font-medium">123 Main St, Gawar, India</p>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-xs text-slate-400 font-medium uppercase">Email</span>
                          <p className="text-sm text-slate-800 dark:text-white font-medium">avtansh@example.com</p>
                        </div>
                      </div>
                    </div>

                    {/* Emergency Contact */}
                    <div className="flex flex-col gap-3">
                      <div className="flex justify-between items-center pr-2">
                         <h3 className="text-lg font-bold text-slate-800 dark:text-white border-l-4 border-[#137fec] pl-3">Emergency Contact</h3>
                         <button className="text-xs flex items-center gap-1 bg-[#137fec] text-white px-2 py-1 rounded hover:bg-blue-600 transition-colors">
                            Edit <Edit2 size={12}/>
                         </button>
                      </div>
                      <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg flex flex-col gap-4">
                         <div className="flex justify-between">
                            <div className="flex flex-col gap-1">
                              <span className="text-xs text-slate-400 font-medium uppercase">Name</span>
                              <p className="text-sm text-slate-800 dark:text-white font-medium">Alok (Father)</p>
                            </div>
                            <div className="flex flex-col gap-1 text-right">
                              <span className="text-xs text-slate-400 font-medium uppercase">Phone</span>
                              <p className="text-sm text-slate-800 dark:text-white font-medium">9876543210</p>
                            </div>
                         </div>
                      </div>
                    </div>

                  </div>
                </div>
              )}

              {activeTab !== 'General' && (
                <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                  <Activity size={48} className="mb-4 opacity-50" />
                  <p>Content for <strong>{activeTab}</strong> tab is coming soon.</p>
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