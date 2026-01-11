import React, { useState, useEffect } from 'react';
import { 
  Search, Plus, Download, User, Eye, Edit, Trash2, 
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Loader2
} from 'lucide-react';
import PatientProfileModal from '../modals/PatientProfileModal.jsx';
import AddPatientModal from '../modals/AddPatientModal.jsx';
import API from '../services/api.js'; 

const PatientsPage = () => {
  // --- STATE MANAGEMENT ---
  const [patients, setPatients] = useState([]); 
  const [loading, setLoading] = useState(true); 
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isAddPatientOpen, setIsAddPatientOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // --- FETCH DATA FROM BACKEND ---
  const fetchPatients = async (query = '') => {
    setLoading(true);
    try {
      const { data } = await API.get(`/patients${query ? `?search=${query}` : ''}`);
      
      const formattedData = data.map(p => ({
        id: p._id, 
        regDate: new Date(p.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        regTime: new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        name: `${p.first_name} ${p.last_name || ''}`.trim(),
        phone: p.contact?.mobile || '-', // Safe access
        patientId: p.patientId, 
        gender: p.gender,
        // Calculate Age from DOB
        age: p.dob ? new Date().getFullYear() - new Date(p.dob).getFullYear() : '-', 
        // Note: 'total_visits' isn't in your Patient model yet, defaulting to 0
        visit: p.total_visits || 0, 
        // FIXED: Matched to Model 'total_due'
        due: (p.total_due || 0).toFixed(2),
        avatarColor: 'bg-blue-100 text-[#137fec]', 
        fullData: p 
      }));

      setPatients(formattedData);
    } catch (error) {
      console.error("Failed to fetch patients:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  // Search Debounce
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchPatients(searchQuery);
    }, 500); 
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  // --- HANDLERS ---
  const handleViewProfile = (patient) => {
    setSelectedPatient(patient.fullData); 
    setIsProfileOpen(true);
  };

  const handlePatientAdded = () => {
    fetchPatients();
    setIsAddPatientOpen(false);
  };

  // New: Handle Delete
  const handleDelete = async (id) => {
    if(window.confirm("Are you sure you want to delete this patient? This cannot be undone.")) {
        try {
            await API.delete(`/patients/${id}`);
            // Remove from UI immediately
            setPatients(prev => prev.filter(p => p.id !== id));
        } catch (err) {
            alert("Failed to delete patient");
            console.error(err);
        }
    }
  };

  return (
      <div className="max-w-[1440px] mx-auto font-display">
        
        {/* Page Title */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">All Patients</h1>
        </div>

        {/* Controls Bar */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden mb-6">
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
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden min-h-[400px]">
          
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
              <Loader2 className="animate-spin mb-2" size={32} />
              <p>Loading Patients...</p>
            </div>
          ) : (
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
                  {patients.length > 0 ? (
                    patients.map((patient, index) => (
                      <tr key={patient.id} className="hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors group">
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
                            <span onClick={() => handleViewProfile(patient)} className="text-sm font-medium text-slate-900 dark:text-white cursor-pointer hover:underline underline-offset-2 decoration-[#137fec]">{patient.name}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-sm text-slate-600 dark:text-slate-300">{patient.phone}</td>
                        <td className="py-4 px-6 text-sm text-slate-600 dark:text-slate-300">{patient.patientId}</td>
                        <td className="py-4 px-6 text-sm text-slate-600 dark:text-slate-300">
                          {patient.gender} <span className="text-slate-400">/</span> {patient.age}
                        </td>
                        <td className="py-4 px-6 text-sm text-slate-600 dark:text-slate-300">{patient.visit}</td>
                        <td className="py-4 px-6 text-sm text-slate-600 dark:text-slate-300">-</td> 
                        <td className="py-4 px-6 text-sm font-medium text-right text-slate-900 dark:text-white">{patient.due}</td>
                        <td className="py-4 px-6">
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => handleViewProfile(patient)} className="p-1.5 rounded-md text-slate-400 hover:text-[#137fec] hover:bg-blue-50 dark:hover:bg-blue-900/30 border border-transparent hover:border-blue-200 dark:hover:border-blue-800 transition-all" title="View">
                              <Eye size={18} />
                            </button>
                            {/* Hook up Delete */}
                            <button 
                                onClick={() => handleDelete(patient.id)}
                                className="p-1.5 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 border border-transparent hover:border-red-200 dark:hover:border-red-800 transition-all" 
                                title="Delete"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="10" className="py-10 text-center text-slate-500">
                        No patients found. Try a different search or add a new patient.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Footer */}
          <div className="p-5 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-end items-center gap-4 bg-slate-50 dark:bg-slate-900">
            <span className="text-sm font-semibold text-slate-600 dark:text-slate-300 mr-2">Total : {patients.length}</span>
            <div className="flex items-center gap-1">
              {/* Pagination logic can be added later */}
              <button className="w-8 h-8 flex items-center justify-center rounded-md border border-[#137fec] text-[#137fec] bg-blue-50 dark:bg-blue-900/20 text-sm font-medium transition-colors">
                1
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
          onSave={handlePatientAdded} 
        />

      </div>
  );
};

export default PatientsPage;