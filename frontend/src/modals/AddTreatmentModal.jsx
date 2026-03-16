import React, { useState, useEffect } from 'react';
import { X, Search, ChevronDown, Check } from 'lucide-react';

const SUGGESTIONS = {
  diagnosis: ['Gingivitis', 'Reversible pulpitis', 'Dental Caries', 'Periodontitis', 'Fractured Tooth'],
  treatment: ['Apexification', 'Apexogenesis', 'Bridge Preparation', 'CD Insertion', 'Composite Filling', 'Root Canal Treatment']
};

const AddTreatmentModal = ({ isOpen, onClose, selectedTeeth, onSave }) => {
  const [formData, setFormData] = useState({
    examination: '',
    diagnosis: '',
    treatment: '',
    cost: '',
    notes: ''
  });

  // Reset form when opening
  useEffect(() => {
    if (isOpen) {
      setFormData({ examination: '', diagnosis: '', treatment: '', cost: '', notes: '' });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  const handleSuggestionClick = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      {/* Slide-over Panel */}
      <div className="relative w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#F7F2F2]">
          <h2 className="font-semibold text-[20px] text-[#322A2A]">
            Treatment Plan for Selected Teeth
          </h2>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6">
          <form id="treatment-form" onSubmit={handleSubmit} className="flex flex-col gap-8">
            
            {/* Selected Teeth Indicator */}
            <div className="flex gap-4 items-center">
              <div className="w-[50px] h-[50px] bg-blue-50 rounded-full flex items-center justify-center p-2">
                 {/* Placeholder Icon for Teeth */}
                 <img src="https://dentobesscdn.b-cdn.net/dental-teeth/Adult/Teeth11.svg" className="w-full h-full opacity-50" alt="tooth" />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">Selected Teeth</span>
                <div className="flex flex-wrap gap-2">
                  {selectedTeeth.length > 0 ? (
                    selectedTeeth.map(t => (
                      <span key={t} className="font-[Montserrat] font-bold text-[16px] text-[#1D2D39] bg-gray-100 px-3 py-1 rounded-lg border border-gray-200">
                        {t}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-red-500 font-medium">No teeth selected</span>
                  )}
                </div>
              </div>
            </div>

            {/* 1. On Examination */}
            <div className="flex flex-col gap-2">
              <label className="font-[Raleway] font-semibold text-[16px] text-[#322A2A]">
                On Examination
              </label>
              <p className="font-[Montserrat] italic text-[13px] text-[#85969F]">
                Add clinical findings
              </p>
              <div className="relative">
                <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Search & Select"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#137fec] outline-none transition-all"
                  value={formData.examination}
                  onChange={(e) => setFormData({...formData, examination: e.target.value})}
                />
              </div>
            </div>

            {/* 2. Diagnosis */}
            <div className="flex flex-col gap-2">
              <label className="font-[Raleway] font-semibold text-[16px] text-[#322A2A]">
                Diagnosis
              </label>
              <p className="font-[Montserrat] italic text-[13px] text-[#85969F]">
                Select from suggestions or type diagnosis
              </p>
              <div className="relative">
                <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Search & Select"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#137fec] outline-none transition-all"
                  value={formData.diagnosis}
                  onChange={(e) => setFormData({...formData, diagnosis: e.target.value})}
                />
              </div>
              
              {/* Diagnosis Suggestions */}
              <div className="flex flex-col gap-2 mt-2">
                <p className="font-[Raleway] font-semibold text-[13px] text-[#322A2A]">Suggestions</p>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTIONS.diagnosis.map(item => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => handleSuggestionClick('diagnosis', item)}
                      className={`py-2 px-4 rounded-full border text-[14px] font-medium transition-all
                        ${formData.diagnosis === item 
                          ? 'bg-[#009AFF] text-white border-[#009AFF]' 
                          : 'bg-white text-[#1D2D39] border-[#009AFF] hover:bg-blue-50'}
                      `}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 3. Treatment Suggested */}
            <div className="flex flex-col gap-2">
              <label className="font-[Raleway] font-semibold text-[16px] text-[#322A2A]">
                Treatment Suggested <span className="text-red-500">*</span>
              </label>
              <p className="font-[Montserrat] italic text-[13px] text-[#85969F]">
                Select from suggestions or type treatment
              </p>
              <div className="relative">
                <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                <input 
                  type="text" 
                  required
                  placeholder="Search & Select"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#137fec] outline-none transition-all"
                  value={formData.treatment}
                  onChange={(e) => setFormData({...formData, treatment: e.target.value})}
                />
              </div>

              {/* Treatment Suggestions */}
              <div className="flex flex-wrap gap-2 mt-2">
                {SUGGESTIONS.treatment.map(item => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => handleSuggestionClick('treatment', item)}
                    className={`py-2 px-4 rounded-full border text-[13px] font-medium uppercase tracking-wide transition-all
                      ${formData.treatment === item 
                        ? 'bg-[#009AFF] text-white border-[#009AFF]' 
                        : 'bg-white text-[#1D2D39] border-[#009AFF] hover:bg-blue-50'}
                    `}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            {/* Cost & Notes (Optional extras not in HTML but useful) */}
            <div className="grid grid-cols-2 gap-4">
               <div>
                 <label className="font-[Raleway] font-semibold text-[14px] text-[#322A2A] mb-2 block">Est. Cost</label>
                 <input 
                    type="number" 
                    placeholder="0.00"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#137fec] outline-none"
                    value={formData.cost}
                    onChange={(e) => setFormData({...formData, cost: e.target.value})}
                 />
               </div>
               <div>
                 <label className="font-[Raleway] font-semibold text-[14px] text-[#322A2A] mb-2 block">Notes</label>
                 <input 
                    type="text" 
                    placeholder="Short note..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#137fec] outline-none"
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                 />
               </div>
            </div>

          </form>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[#F7F2F2] bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
          <button 
            type="submit" 
            form="treatment-form"
            className="w-full bg-[#00D299] hover:bg-[#00B87F] text-white font-medium text-[16px] py-3.5 rounded-lg transition-all shadow-lg shadow-emerald-100 active:scale-[0.98]"
          >
            Add To Treatment Plan
          </button>
        </div>

      </div>
    </div>
  );
};

export default AddTreatmentModal;