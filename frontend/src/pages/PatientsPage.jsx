import React, { useState } from 'react';
import { 
  Search, Plus, Download, User, Eye, Edit, Trash2, 
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight 
} from 'lucide-react';
import PatientProfileModal from '../modals/PatientProfileModal';
import AddPatientModal from '../modals/AddPatientModal';

const PatientsPage = () => {
const [isProfileOpen, setIsProfileOpen] = useState(false);
const [isAddPatientOpen, setIsAddPatientOpen] = useState(false);
const [selectedPatient, setSelectedPatient] = useState(null);
  // Mock Data based on your HTML
  const patients = [
    {
      id: 1,
      regDate: '22 Dec 2025',
      regTime: '10:19 PM',
      name: 'Avtansh',
      phone: '9999999990',
      patientId: '140FD',
      gender: 'Male',
      age: '-',
      visit: '-',
      due: '0.00',
      avatarColor: 'bg-blue-100 text-[#137fec]',
    },
    {
      id: 2,
      regDate: '22 Dec 2025',
      regTime: '10:06 PM',
      name: 'Alok',
      phone: '7777777778',
      patientId: '701AD',
      gender: 'Male',
      age: '-',
      visit: '-',
      due: '0.00',
      avatarColor: 'bg-blue-100 text-[#137fec]',
    },
  ];

  const handleViewProfile = (patient) => {
    setSelectedPatient(patient);
    setIsProfileOpen(true);
  };

  return (
      <div className="max-w-[1440px] mx-auto font-display">
        
        {/* Page Title */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">All Patients</h1>
        </div>

        {/* Controls Bar (Search & Buttons) */}
        <div className="bg-white dark:bg-card-dark rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden mb-6">
          <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            {/* Search Input */}
            <div className="relative w-full md:w-96">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="text-slate-400" size={20} />
              </span>
              <input 
                className="block w-full pl-10 pr-3 py-2.5 border-none rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#137fec]/50 transition-all text-sm ring-1 ring-slate-200 dark:ring-slate-700" 
                placeholder="Search Patient (name & phone)" 
                type="text"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <button className="bg-[#137fec] hover:bg-blue-600 text-white px-4 py-2.5 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors shadow-sm shadow-blue-500/20">
                <Download size={18} />
                Import Patient
              </button>
              <button onClick={() => setIsAddPatientOpen(true)} className="bg-[#137fec] hover:bg-blue-600 text-white px-4 py-2.5 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors shadow-sm shadow-blue-500/20">
                <Plus size={18} />
                New Patient
              </button>
            </div>
          </div>
        </div>

        {/* Patients Table */}
        <div className="bg-white dark:bg-card-dark rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-16">No.</th>
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Reg</th>
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Patient Name</th>
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Phone</th>
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Patient Id</th>
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Gender/Age</th>
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Visits</th>
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Last Visit</th>
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Due</th>
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center w-40">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {patients.map((patient, index) => (
                  <tr key={index} className="hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors group">
                    <td className="py-4 px-6 text-sm text-slate-500 dark:text-slate-400">{index + 1}</td>
                    <td className="py-4 px-6">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-slate-900 dark:text-white">{patient.regDate}</span>
                        <span className="text-xs text-slate-500">{patient.regTime}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-full ${patient.avatarColor} flex items-center justify-center border border-blue-200 dark:border-blue-800`}>
                          <User size={20} />
                        </div>
                        <span onClick={() => handleViewProfile(patient)} className="text-sm font-medium text-slate-900 dark:text-white">{patient.name}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-sm text-slate-600 dark:text-slate-300">{patient.phone}</td>
                    <td className="py-4 px-6 text-sm text-slate-600 dark:text-slate-300">{patient.patientId}</td>
                    <td className="py-4 px-6 text-sm text-slate-600 dark:text-slate-300">{patient.gender}</td>
                    <td className="py-4 px-6 text-sm text-slate-600 dark:text-slate-300">{patient.visit}</td>
                    <td className="py-4 px-6 text-sm font-medium text-right text-slate-900 dark:text-white">{patient.due}</td>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => handleViewProfile(patient)} className="p-1.5 rounded-md text-slate-400 hover:text-[#137fec] hover:bg-blue-50 dark:hover:bg-blue-900/30 border border-transparent hover:border-blue-200 dark:hover:border-blue-800 transition-all" title="View">
                          <Eye size={18} />
                        </button>
                        <button className="p-1.5 rounded-md text-slate-400 hover:text-[#137fec] hover:bg-blue-50 dark:hover:bg-blue-900/30 border border-transparent hover:border-blue-200 dark:hover:border-blue-800 transition-all" title="Edit">
                          <Edit size={18} />
                        </button>
                        <button className="p-1.5 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 border border-transparent hover:border-red-200 dark:hover:border-red-800 transition-all" title="Delete">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="p-5 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-end items-center gap-4 bg-slate-50 dark:bg-card-dark">
            <span className="text-sm font-semibold text-slate-600 dark:text-slate-300 mr-2">Total : {patients.length}</span>
            <div className="flex items-center gap-1">
              <button className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors" disabled>
                <ChevronsLeft size={16} />
              </button>
              <button className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors" disabled>
                <ChevronLeft size={16} />
              </button>
              <button className="w-8 h-8 flex items-center justify-center rounded-md border border-[#137fec] text-[#137fec] bg-blue-50 dark:bg-blue-900/20 text-sm font-medium transition-colors">
                1
              </button>
              <button className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors" disabled>
                <ChevronRight size={16} />
              </button>
              <button className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors" disabled>
                <ChevronsRight size={16} />
              </button>
            </div>
          </div>
        </div>

        <div className="h-10"></div>

        <PatientProfileModal 
          isOpen={isProfileOpen} 
          onClose={() => setIsProfileOpen(false)} 
          patient={selectedPatient}
        />

        <AddPatientModal 
          isOpen={isAddPatientOpen}
          onClose={() => setIsAddPatientOpen(false)}
        />

      </div>
  );
};

export default PatientsPage;