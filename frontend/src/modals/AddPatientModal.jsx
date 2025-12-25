import React from 'react';
import { X, ChevronDown } from 'lucide-react';

const AddPatientModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    // Overlay
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/20 backdrop-blur-sm transition-opacity" onClick={onClose}>
      
      {/* Modal / Slide-over Container */}
      <div 
        className="w-full max-w-3xl h-full bg-white dark:bg-[#1a2634] shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300 flex flex-col"
        onClick={(e) => e.stopPropagation()} // Prevent close when clicking inside
      >
        
        {/* --- Header --- */}
        <header className="flex-initial px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-[#1a2634] z-10">
          <h2 className="font-semibold text-xl md:text-2xl text-[#322A2A] dark:text-white">Add New Patient</h2>
          <button 
            onClick={onClose} 
            className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
          >
            <X size={24} />
          </button>
        </header>

        {/* --- Form Content --- */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          <form className="w-full flex flex-col gap-6">
            
            {/* Row 1: Mobile & Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 xl:gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Mobile Number <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  placeholder="Enter mobile number" 
                  className="w-full px-4 py-2.5 bg-[#F7F2F2] dark:bg-slate-800 border-none rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-[#137fec] focus:outline-none transition-all"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Patient Name <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  placeholder="Enter patient name" 
                  className="w-full px-4 py-2.5 bg-[#F7F2F2] dark:bg-slate-800 border-none rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-[#137fec] focus:outline-none transition-all"
                />
              </div>
            </div>

            {/* Row 2: Gender & Age */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 xl:gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Gender</label>
                <div className="relative">
                  <select className="w-full px-4 py-2.5 bg-[#F7F2F2] dark:bg-slate-800 border-none rounded-lg text-slate-500 dark:text-slate-400 appearance-none focus:ring-2 focus:ring-[#137fec] focus:outline-none transition-all cursor-pointer">
                    <option value="" disabled selected>Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Age</label>
                <input 
                  type="number" 
                  placeholder="Enter patient age" 
                  className="w-full px-4 py-2.5 bg-[#F7F2F2] dark:bg-slate-800 border-none rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-[#137fec] focus:outline-none transition-all"
                />
              </div>
            </div>

            {/* Row 3: Location & Reference */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 xl:gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Patient Location</label>
                <input 
                  type="text" 
                  placeholder="Enter location" 
                  className="w-full px-4 py-2.5 bg-[#F7F2F2] dark:bg-slate-800 border-none rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-[#137fec] focus:outline-none transition-all"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Reference Number</label>
                <input 
                  type="text" 
                  placeholder="Enter reference number (Optional)" 
                  className="w-full px-4 py-2.5 bg-[#F7F2F2] dark:bg-slate-800 border-none rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-[#137fec] focus:outline-none transition-all"
                />
              </div>
            </div>

            {/* Patient History (Select Placeholder) */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Patient History</label>
              <div className="relative">
                 <input 
                    type="text" 
                    placeholder="Search & Select" 
                    className="w-full px-4 py-2.5 bg-[#F7F2F2] dark:bg-slate-800 border-none rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-[#137fec] focus:outline-none transition-all"
                 />
                 <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
              </div>
            </div>

            {/* Notes */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Notes/Remarks</label>
              <textarea 
                placeholder="Enter notes (Optional)" 
                className="w-full px-4 py-3 bg-[#F7F2F2] dark:bg-slate-800 border-none rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-[#137fec] focus:outline-none transition-all min-h-[120px] resize-none"
              ></textarea>
            </div>

          </form>
        </div>

        {/* --- Footer --- */}
        <footer className="flex-initial px-6 py-5 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-[#1a2634] flex justify-end gap-3 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
          <button 
            onClick={onClose}
            className="px-6 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors w-32 md:w-40"
          >
            Cancel
          </button>
          <button 
            className="px-6 py-2.5 rounded-lg bg-[#137fec] hover:bg-blue-600 text-white font-semibold shadow-lg shadow-blue-500/30 transition-all w-32 md:w-40"
          >
            Create
          </button>
        </footer>

      </div>
    </div>
  );
};

export default AddPatientModal;