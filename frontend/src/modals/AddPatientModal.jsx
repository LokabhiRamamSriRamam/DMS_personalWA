import React, { useState } from 'react';
import { X, ChevronDown } from 'lucide-react';
import API from '../services/api';

const AddPatientModal = ({ isOpen, onClose, onSave }) => {
  const [loading, setLoading] = useState(false);
  
  // Initial State matching UI fields
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    gender: '',
    age: '',
    location: '',
    reference: '',
    history: '', // Comma separated string
    notes: ''
  });

  if (!isOpen) return null;

  // Handle Input Changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Split Name into First & Last (Backend requirement)
      const nameParts = formData.name.trim().split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ') || '';

      // 2. Convert Age to Approximate DOB (Backend requirement)
      const dobDate = new Date();
      dobDate.setFullYear(dobDate.getFullYear() - parseInt(formData.age || 0));

      // 3. Prepare Payload matching Mongoose Schema
      // Strip non-digits from mobile (user types just 10 digits, +91 is fixed prefix)
      const cleanMobile = (formData.mobile || '').replace(/\D/g, '').slice(-10);
      const fullMobile  = cleanMobile ? `+91${cleanMobile}` : '';

      const payload = {
        first_name: firstName,
        last_name: lastName,
        dob: dobDate,
        gender: formData.gender,
        contact: {
          mobile: fullMobile,
          city: formData.location
        },
        reference_source: formData.reference,
        general_notes: formData.notes,
        // Split history string by comma into array
        medical_history: formData.history ? formData.history.split(',').map(s => s.trim()) : []
      };

      // 4. API Call
      const res = await API.post('/patients', payload);

      // 5. Success Callback
      if (onSave) onSave(res.data);
      
      // Reset & Close
      setFormData({
        name: '', mobile: '', gender: '', age: '', 
        location: '', reference: '', history: '', notes: ''
      });
      onClose();

    } catch (err) {
      console.error("Failed to add patient", err);
      alert("Error adding patient: " + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

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
          <form id="add-patient-form" onSubmit={handleSubmit} className="w-full flex flex-col gap-6">
            
            {/* Row 1: Mobile & Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 xl:gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Mobile Number <span className="text-red-500">*</span>
                </label>
                <div className="flex items-stretch bg-[#F7F2F2] dark:bg-slate-800 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-[#137fec] transition-all">
                  <span className="px-3 flex items-center text-sm font-semibold text-slate-600 dark:text-slate-300 bg-slate-200/60 dark:bg-slate-700 select-none border-r border-slate-300/50 dark:border-slate-600">
                    🇮🇳 +91
                  </span>
                  <input
                    name="mobile"
                    value={formData.mobile}
                    onChange={(e) => {
                      // accept only digits, max 10
                      const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setFormData(prev => ({ ...prev, mobile: digits }));
                    }}
                    required
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="10-digit number"
                    className="flex-1 px-4 py-2.5 bg-transparent border-none text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Patient Name <span className="text-red-500">*</span>
                </label>
                <input 
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
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
                  <select 
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 bg-[#F7F2F2] dark:bg-slate-800 border-none rounded-lg text-slate-500 dark:text-slate-400 appearance-none focus:ring-2 focus:ring-[#137fec] focus:outline-none transition-all cursor-pointer"
                  >
                    <option value="" disabled>Select gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Age</label>
                <input 
                  name="age"
                  value={formData.age}
                  onChange={handleChange}
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
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  type="text" 
                  placeholder="Enter location" 
                  className="w-full px-4 py-2.5 bg-[#F7F2F2] dark:bg-slate-800 border-none rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-[#137fec] focus:outline-none transition-all"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Reference Source</label>
                <input 
                  name="reference"
                  value={formData.reference}
                  onChange={handleChange}
                  type="text" 
                  placeholder="Who referred them?" 
                  className="w-full px-4 py-2.5 bg-[#F7F2F2] dark:bg-slate-800 border-none rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-[#137fec] focus:outline-none transition-all"
                />
              </div>
            </div>

            {/* Patient History */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Medical History</label>
              <div className="relative">
                 <input 
                   name="history"
                   value={formData.history}
                   onChange={handleChange}
                   type="text" 
                   placeholder="e.g. Diabetes, BP High (Separate by comma)" 
                   className="w-full px-4 py-2.5 bg-[#F7F2F2] dark:bg-slate-800 border-none rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-[#137fec] focus:outline-none transition-all"
                 />
              </div>
            </div>

            {/* Notes */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Notes/Remarks</label>
              <textarea 
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Enter private clinical notes..." 
                className="w-full px-4 py-3 bg-[#F7F2F2] dark:bg-slate-800 border-none rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-[#137fec] focus:outline-none transition-all min-h-[120px] resize-none"
              ></textarea>
            </div>

          </form>
        </div>

        {/* --- Footer --- */}
        <footer className="flex-initial px-6 py-5 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-[#1a2634] flex justify-end gap-3 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
          <button 
            onClick={onClose}
            type="button"
            className="px-6 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors w-32 md:w-40"
          >
            Cancel
          </button>
          <button 
            type="submit"
            form="add-patient-form"
            disabled={loading}
            className={`px-6 py-2.5 rounded-lg bg-[#137fec] hover:bg-blue-600 text-white font-semibold shadow-lg shadow-blue-500/30 transition-all w-32 md:w-40 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {loading ? 'Saving...' : 'Create'}
          </button>
        </footer>

      </div>
    </div>
  );
};

export default AddPatientModal;