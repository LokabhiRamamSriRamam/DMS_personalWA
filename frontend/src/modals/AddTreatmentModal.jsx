import React, { useState, useEffect, useRef } from 'react';
import { X, Search, ChevronDown, Check, Plus } from 'lucide-react';
import API from '../services/api';

const AddTreatmentModal = ({ isOpen, onClose, selectedTeeth, onSave }) => {
  const [formData, setFormData] = useState({
    clinical_findings: [],
    diagnosis: [], // Changed to array for multi-select
    treatments: [], // Array for multi-select treatments
    notes: ''
  });

  // Dropdown states
  const [clinicalFindings, setClinicalFindings] = useState([]);
  const [diagnoses, setDiagnoses] = useState([]);
  const [suggestedTreatments, setSuggestedTreatments] = useState([]);

  // Search & dropdown states
  const [clinicalFindingSearch, setClinicalFindingSearch] = useState('');
  const [diagnosisSearch, setDiagnosisSearch] = useState('');
  const [treatmentSearch, setTreatmentSearch] = useState('');

  const [openDropdown, setOpenDropdown] = useState(null); // 'clinical', 'diagnosis', 'treatment'
  const dropdownRef = useRef(null);

  const [loading, setLoading] = useState(true);

  // Fetch data on mount
  useEffect(() => {
    if (isOpen) {
      fetchDropdownData();
      setFormData({
        clinical_findings: [],
        diagnosis: [],
        treatments: [],
        notes: ''
      });
    }
  }, [isOpen]);

  const fetchDropdownData = async () => {
    setLoading(true);
    try {
      const [findingsRes, diagnosesRes, treatmentsRes] = await Promise.all([
        API.get('/clinical-findings'),
        API.get('/diagnoses'),
        API.get('/suggested-treatments')
      ]);

      setClinicalFindings(findingsRes.data);
      setDiagnoses(diagnosesRes.data);
      setSuggestedTreatments(treatmentsRes.data);
    } catch (err) {
      console.error('Failed to fetch dropdown data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Close dropdown on click outside (for form container)
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event) => {
      // Close dropdown only if clicking outside the form
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        // Check if we're clicking on an input or dropdown button
        if (!event.target.closest('input') && !event.target.closest('button[type="button"]')) {
          setOpenDropdown(null);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  if (!isOpen) return null;

  // Filter functions based on search
  const filterFindings = clinicalFindings.filter(f =>
    f.name.toLowerCase().includes(clinicalFindingSearch.toLowerCase())
  );

  const filterDiagnoses = diagnoses.filter(d =>
    d.name.toLowerCase().includes(diagnosisSearch.toLowerCase())
  );

  const filterTreatments = suggestedTreatments.filter(t =>
    t.name.toLowerCase().includes(treatmentSearch.toLowerCase())
  );

  // Add new item functions
  const handleAddNewFinding = async () => {
    if (!clinicalFindingSearch.trim()) return;
    try {
      const res = await API.post('/clinical-findings', {
        name: clinicalFindingSearch,
        is_active: true
      });
      setClinicalFindings([...clinicalFindings, res.data]);
      handleSelectFinding(res.data);
      setClinicalFindingSearch('');
    } catch (err) {
      console.error('Failed to add finding:', err);
    }
  };

  const handleAddNewDiagnosis = async (e) => {
    e.preventDefault();
    if (!diagnosisSearch.trim()) return;
    try {
      const res = await API.post('/diagnoses', {
        name: diagnosisSearch,
        is_active: true
      });
      setDiagnoses([...diagnoses, res.data]);
      setFormData(prev => ({ ...prev, diagnosis: [...prev.diagnosis, res.data] }));
      setDiagnosisSearch('');
    } catch (err) {
      console.error('Failed to add diagnosis:', err);
    }
  };

  const handleAddNewTreatment = async () => {
    if (!treatmentSearch.trim()) return;
    // Prompt for cost
    const cost = prompt('Enter treatment cost:');
    if (cost === null) return;

    try {
      const res = await API.post('/suggested-treatments', {
        name: treatmentSearch,
        cost: parseFloat(cost) || 0,
        is_active: true
      });
      setSuggestedTreatments([...suggestedTreatments, res.data]);
      handleSelectTreatment(res.data);
      setTreatmentSearch('');
    } catch (err) {
      console.error('Failed to add treatment:', err);
    }
  };

  // Selection handlers
  const handleSelectFinding = (finding) => {
    setFormData(prev => ({
      ...prev,
      clinical_findings: prev.clinical_findings.find(f => f._id === finding._id)
        ? prev.clinical_findings.filter(f => f._id !== finding._id)
        : [...prev.clinical_findings, finding]
    }));
  };

  const handleSelectDiagnosis = (diagnosis) => {
    setFormData(prev => ({
      ...prev,
      diagnosis: prev.diagnosis.find(d => d._id === diagnosis._id)
        ? prev.diagnosis.filter(d => d._id !== diagnosis._id)
        : [...prev.diagnosis, diagnosis]
    }));
  };

  const handleSelectTreatment = (treatment) => {
    setFormData(prev => ({
      ...prev,
      treatments: prev.treatments.find(t => t._id === treatment._id)
        ? prev.treatments.filter(t => t._id !== treatment._id)
        : [...prev.treatments, treatment]
    }));
  };

  const totalCost = formData.treatments.reduce((sum, t) => sum + (t.cost || 0), 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
    onClose();
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
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200">
          <h2 className="font-semibold text-xl text-slate-800">
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
          <form id="treatment-form" onSubmit={handleSubmit} className="flex flex-col gap-6">

            {/* Selected Teeth Indicator */}
            <div className="flex gap-4 items-center">
              <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center">
                <img src="https://dentobesscdn.b-cdn.net/dental-teeth/Adult/Teeth11.svg" className="w-full h-full opacity-50" alt="tooth" />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">Selected Teeth</span>
                <div className="flex flex-wrap gap-2">
                  {selectedTeeth.length > 0 ? (
                    selectedTeeth.map(t => (
                      <span key={t} className="font-semibold text-sm bg-gray-100 px-3 py-1 rounded-lg border border-gray-200">
                        {t}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-red-500 font-medium">No teeth selected</span>
                  )}
                </div>
              </div>
            </div>

            {/* 1. Clinical Findings - Multi-select with Live Search */}
            <div className="flex flex-col gap-2" ref={dropdownRef}>
              <label className="font-semibold text-base text-slate-800">
                Clinical Findings
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Search findings..."
                  value={clinicalFindingSearch}
                  onChange={(e) => {
                    setClinicalFindingSearch(e.target.value);
                    setOpenDropdown('clinical');
                  }}
                  onFocus={() => setOpenDropdown('clinical')}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#137fec] outline-none transition-all"
                />

                {/* Selected findings tags */}
                {formData.clinical_findings.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.clinical_findings.map(f => (
                      <span key={f._id} className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
                        {f.name}
                        <button
                          type="button"
                          onClick={() => handleSelectFinding(f)}
                          className="hover:text-blue-900"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Dropdown */}
                {openDropdown === 'clinical' && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                    {filterFindings.length > 0 ? (
                      filterFindings.map(f => (
                        <button
                          key={f._id}
                          type="button"
                          onClick={() => handleSelectFinding(f)}
                          className="w-full text-left px-4 py-2 hover:bg-blue-50 flex items-center gap-2 text-sm"
                        >
                          <Check
                            size={16}
                            className={formData.clinical_findings.find(x => x._id === f._id) ? 'text-blue-500' : 'text-gray-300'}
                          />
                          {f.name}
                        </button>
                      ))
                    ) : (
                      <button
                        type="button"
                        onClick={handleAddNewFinding}
                        className="w-full text-left px-4 py-2 text-[#137fec] font-medium flex items-center gap-2 text-sm hover:bg-blue-50"
                      >
                        <Plus size={16} /> Add "{clinicalFindingSearch}"
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 2. Diagnosis - Multi-select with Live Search */}
            <div className="flex flex-col gap-2">
              <label className="font-semibold text-base text-slate-800">
                Diagnosis
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Search diagnosis..."
                  value={diagnosisSearch}
                  onChange={(e) => {
                    setDiagnosisSearch(e.target.value);
                    setOpenDropdown('diagnosis');
                  }}
                  onFocus={() => setOpenDropdown('diagnosis')}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#137fec] outline-none transition-all"
                />

                {/* Selected diagnosis tags */}
                {formData.diagnosis.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.diagnosis.map(d => (
                      <span key={d._id} className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
                        {d.name}
                        <button
                          type="button"
                          onClick={() => handleSelectDiagnosis(d)}
                          className="hover:text-purple-900"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Dropdown */}
                {openDropdown === 'diagnosis' && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                    {filterDiagnoses.length > 0 ? (
                      filterDiagnoses.map(d => (
                        <button
                          key={d._id}
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            handleSelectDiagnosis(d);
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-purple-50 flex items-center gap-2 text-sm"
                        >
                          <Check
                            size={16}
                            className={formData.diagnosis.find(x => x._id === d._id) ? 'text-purple-500' : 'text-gray-300'}
                          />
                          <div className="flex-1">
                            <div className="font-medium">{d.name}</div>
                            {d.code && <div className="text-xs text-gray-400">{d.code}</div>}
                          </div>
                        </button>
                      ))
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => handleAddNewDiagnosis(e)}
                        className="w-full text-left px-4 py-2 text-[#137fec] font-medium flex items-center gap-2 text-sm hover:bg-purple-50"
                      >
                        <Plus size={16} /> Add "{diagnosisSearch}"
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 3. Suggested Treatment - Multi-select with Live Search */}
            <div className="flex flex-col gap-2">
              <label className="font-semibold text-base text-slate-800">
                Suggested Treatments
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Search treatments..."
                  value={treatmentSearch}
                  onChange={(e) => {
                    setTreatmentSearch(e.target.value);
                    setOpenDropdown('treatment');
                  }}
                  onFocus={() => setOpenDropdown('treatment')}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#137fec] outline-none transition-all"
                />

                {/* Selected treatments tags */}
                {formData.treatments.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.treatments.map(t => (
                      <span key={t._id} className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
                        {t.name} - ₹{t.cost}
                        <button
                          type="button"
                          onClick={() => handleSelectTreatment(t)}
                          className="hover:text-green-900"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Dropdown */}
                {openDropdown === 'treatment' && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                    {filterTreatments.length > 0 ? (
                      filterTreatments.map(t => (
                        <button
                          key={t._id}
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            handleSelectTreatment(t);
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-green-50 flex items-center gap-2 text-sm"
                        >
                          <Check
                            size={16}
                            className={formData.treatments.find(x => x._id === t._id) ? 'text-green-500' : 'text-gray-300'}
                          />
                          <div className="flex-1">
                            <div className="font-medium">{t.name}</div>
                          </div>
                          <div className="text-green-600 font-semibold">₹{t.cost}</div>
                        </button>
                      ))
                    ) : (
                      <button
                        type="button"
                        onClick={handleAddNewTreatment}
                        className="w-full text-left px-4 py-2 text-[#137fec] font-medium flex items-center gap-2 text-sm hover:bg-green-50"
                      >
                        <Plus size={16} /> Add "{treatmentSearch}"
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Total Cost */}
            {formData.treatments.length > 0 && (
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-700">Total Cost:</span>
                  <span className="text-2xl font-bold text-[#137fec]">₹{totalCost.toLocaleString('en-IN')}</span>
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="flex flex-col gap-2">
              <label className="font-semibold text-base text-slate-800">
                Notes (Optional)
              </label>
              <textarea
                rows="3"
                placeholder="Add any additional notes..."
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#137fec] outline-none transition-all resize-none"
              />
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-semibold text-sm hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="treatment-form"
            className="px-6 py-2.5 rounded-lg bg-[#137fec] hover:bg-blue-600 text-white font-semibold text-sm shadow-lg shadow-blue-500/30 transition-colors"
          >
            Save Treatment Plan
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddTreatmentModal;
