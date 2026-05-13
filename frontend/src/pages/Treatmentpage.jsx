import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  Printer, FileText, Monitor, Phone,
  MapPin, User, Plus, ChevronDown, X, NotebookPen, Pill, TestTube, Loader2, Save, Edit2, Receipt, Mic, AlertTriangle
} from 'lucide-react';

// --- IMPORTS ---
import API from '../services/api';
import { useAuth } from '../Context/AuthContext.jsx';
import { useTreatment } from '../Context/TreatmentContext.jsx';
import PatientProfileModal from '../modals/PatientProfileModal.jsx';
import RichTextEditorModal from '../modals/RichTextEditorModal.jsx';
import PrescriptionModal from '../modals/PrescriptionModal.jsx';
import NewInvoiceModal from '../modals/NewInvoiceModal.jsx';
import ClinicalReportModal from '../modals/ClinicalReportModal.jsx';
import TreatmentTabs from '../components/TreatmentTabs.jsx';
import TreatmentPlanBoard from '../components/TreatmentPlanBoard.jsx';
import ReportsNotesSection from '../components/ReportNotesSection.jsx';
import AppointmentTimeline from '../components/AppointmentTimeline.jsx';
import InventoryConsumption from '../components/InventoryConsumption.jsx';
import { useInventorySettings } from '../Context/SettingsContext.jsx';
import SendMailDropdown from '../components/SendMailDropdown.jsx';

// --- Sub-Components ---

// Updated to accept onViewProfile prop and appointments
// eslint-disable-next-line react/prop-types
const PatientInfoCard = ({ patient, onViewProfile, appointments = [] }) => {
  // Handle Loading/Empty State
  if (!patient) {
      return <div className="p-5 bg-white rounded-xl shadow-sm border border-gray-100 mb-6 h-48 animate-pulse"></div>;
  }

  const age = patient.dob ? new Date().getFullYear() - new Date(patient.dob).getFullYear() : '-';
  const fullName = `${patient.first_name} ${patient.last_name || ''}`.trim();

  // Get the latest appointment visit type
  const latestAppointment = appointments && appointments.length > 0
    ? appointments.sort((a, b) => new Date(b.start_time) - new Date(a.start_time))[0]
    : null;
  const visitType = latestAppointment?.type || '-';

  return (
    <div className="p-4 sm:p-5 bg-white rounded-xl relative shadow-sm border border-gray-100 mb-3">
      <div className="absolute top-0 left-4 sm:left-5 bg-blue-50 text-blue-600 px-3 py-1 rounded-b-md text-xs sm:text-sm font-medium">
        Patient Profile
      </div>

      <div className="pt-7 sm:pt-8 flex flex-col gap-3 sm:gap-5">
        {/* Name row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1 min-w-0">
            <h2 className="font-semibold text-xl sm:text-2xl text-gray-800 capitalize truncate">{fullName}</h2>
            <div className="flex flex-wrap gap-2 sm:gap-4 items-center text-gray-500 text-xs sm:text-sm">
              <span className="flex gap-1 items-center"><MapPin size={12} /> {patient.contact?.city || 'N/A'}</span>
              <span className="flex gap-1 items-center"><Phone size={12} /> {patient.contact?.mobile || '--'}</span>
              <span className="flex gap-1 items-center"><User size={12} /> {patient.gender}</span>
            </div>
          </div>
          <button
            onClick={onViewProfile}
            className="flex-shrink-0 px-2.5 sm:px-3 py-1.5 border border-[#137fec] text-[#137fec] rounded-md text-xs sm:text-sm font-medium hover:bg-[#137fec] hover:text-white transition-colors"
          >
            View Profile
          </button>
        </div>

        {/* Chief Complaint */}
        {patient.chief_complaint && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 sm:px-4 py-2.5">
            <AlertTriangle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <span className="text-xs font-bold text-red-500 uppercase tracking-wide">Chief Complaint</span>
              <p className="text-sm text-red-800 font-medium mt-0.5">{patient.chief_complaint}</p>
            </div>
          </div>
        )}

        <div className="border-t border-gray-100 w-full" />

        {/* Stats grid — 3 cols on mobile, 6 on desktop */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 sm:gap-5">
          {[
            { label: 'Gender',      value: patient.gender },
            { label: 'Age',         value: `${age} Yrs` },
            { label: 'Patient ID',  value: patient.patientId || patient._id?.slice(-6).toUpperCase() },
            { label: 'Blood Group', value: patient.blood_group || '-' },
            { label: 'Reg Date',    value: new Date(patient.createdAt).toLocaleDateString() },
          ].map((item, idx) => (
            <div key={idx} className="flex flex-col gap-0.5">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">{item.label}</p>
              <p className="font-medium text-gray-800 text-xs sm:text-sm truncate">{item.value}</p>
            </div>
          ))}
          <div className="flex flex-col gap-0.5">
            <p className="text-[10px] text-gray-400 uppercase tracking-wide">Visit Type</p>
            <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100 font-medium capitalize self-start">{visitType}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const ClinicalHistory = ({ patient, currentVisit, onSaveHistory, onSaveVisitComplaint }) => {
  // Local state for editing fields
  const [formData, setFormData] = useState({
    chief_complaint: '',
    medical_history: [],
    dental_history: '',
    tobacco_smoking: false,
    tobacco_smokeless: false,
    tea_consumption: '',
    coffee_consumption: '',
    dentition_type: 'Adult'
  });
  const [isEditing, setIsEditing] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null); // 'saving' | 'saved' | 'error'

  // Initialize data from patient prop and current visit
  useEffect(() => {
    if (patient) {
      setFormData({
        // chief_complaint comes from the current visit, not the patient
        chief_complaint: currentVisit?.chief_complaint || '',
        medical_history: patient.medical_history || [],
        dental_history: patient.dental_history || '',
        tobacco_smoking: patient.tobacco_smoking || false,
        tobacco_smokeless: patient.tobacco_smokeless || false,
        tea_consumption: patient.tea_consumption || '',
        coffee_consumption: patient.coffee_consumption || '',
        dentition_type: patient.dentition_type || 'Adult'
      });
    }
  }, [patient, currentVisit]);

  const handleSave = async () => {
    // 1. Save medical_history, dental_history, lifestyle habits, and dentition type to patient
    onSaveHistory({
      medical_history: formData.medical_history,
      dental_history: formData.dental_history,
      tobacco_smoking: formData.tobacco_smoking,
      tobacco_smokeless: formData.tobacco_smokeless,
      tea_consumption: formData.tea_consumption,
      coffee_consumption: formData.coffee_consumption,
      dentition_type: formData.dentition_type
    });
    // 2. Save chief_complaint to current visit (if a visit exists)
    if (currentVisit?._id) {
      await onSaveVisitComplaint(currentVisit._id, formData.chief_complaint);
    }
    setIsEditing(false);
  };

  const handleMedicalHistoryChange = (e) => {
    const val = e.target.value;
    setFormData({ ...formData, medical_history: val ? val.split(',').map(s => s.trim()) : [] });
  };

  return (
    <div className="p-5 bg-white rounded-xl shadow-sm border border-gray-100 mb-6 relative">
      {/* Always-visible edit/save controls */}
      <div className="absolute top-4 right-4 flex items-center gap-2">
        {saveStatus === 'saved' && <span className="text-xs text-green-600 font-medium">✓ Saved</span>}
        {saveStatus === 'error' && <span className="text-xs text-red-500 font-medium">Save failed</span>}
        {isEditing ? (
          <button
            onClick={handleSave}
            disabled={saveStatus === 'saving'}
            className="flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-600 rounded-md text-xs font-bold border border-green-200 hover:bg-green-100 disabled:opacity-60"
          >
            <Save size={14} /> {saveStatus === 'saving' ? 'Saving…' : 'Save Changes'}
          </button>
        ) : (
          <button onClick={() => setIsEditing(true)} className="flex items-center gap-1 px-3 py-1.5 bg-slate-50 text-slate-500 rounded-md text-xs font-bold border border-slate-200 hover:bg-slate-100">
            <NotebookPen size={14} /> Edit History
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="flex flex-col gap-5">
          
          {/* 1. Chief Complaint — per visit */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <label className="font-semibold text-gray-700">Chief Complaints</label>
              <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-500 border border-blue-100 rounded font-medium">This Visit</span>
            </div>
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

        {/* Right Column: Dentition Type & Lifestyle Habits */}
        <div className="flex flex-col gap-5">

          {/* 4. Dentition Type */}
          <div className="flex flex-col gap-2">
            <label className="font-semibold text-gray-700">Dentition Type</label>
            {isEditing ? (
                <div className="relative">
                  <select
                    value={formData.dentition_type}
                    onChange={(e) => setFormData({...formData, dentition_type: e.target.value})}
                    className="w-full border border-gray-300 rounded-md p-2 text-sm focus:outline-none focus:border-[#137fec] bg-white cursor-pointer"
                  >
                    <option value="Adult">Adult</option>
                    <option value="Pedo">Pedo (Pediatric)</option>
                    <option value="Mixed">Mixed</option>
                  </select>
                </div>
            ) : (
                <div className="p-2 bg-slate-50 rounded-md text-sm text-gray-700 min-h-[40px] flex items-center">
                  {formData.dentition_type === 'Pedo' ? 'Pedo (Pediatric)' : formData.dentition_type}
                </div>
            )}
          </div>

          {/* 5. Tobacco Consumption */}
          <div className="flex flex-col gap-2">
            <label className="font-semibold text-gray-700">Tobacco Consumption</label>
            {isEditing ? (
                <div className="flex flex-col gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.tobacco_smoking}
                      onChange={(e) => setFormData({...formData, tobacco_smoking: e.target.checked})}
                      className="w-4 h-4 rounded border-gray-300 cursor-pointer"
                    />
                    <span className="text-sm text-gray-700">Smoking</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.tobacco_smokeless}
                      onChange={(e) => setFormData({...formData, tobacco_smokeless: e.target.checked})}
                      className="w-4 h-4 rounded border-gray-300 cursor-pointer"
                    />
                    <span className="text-sm text-gray-700">Smokeless (Chewing/Snuff)</span>
                  </label>
                </div>
            ) : (
                <div className="flex flex-wrap gap-2 min-h-[40px] items-center">
                  {formData.tobacco_smoking || formData.tobacco_smokeless ? (
                    <>
                      {formData.tobacco_smoking && <span className="px-2 py-1 bg-orange-50 text-orange-600 rounded text-xs border border-orange-100 font-medium">Smoking</span>}
                      {formData.tobacco_smokeless && <span className="px-2 py-1 bg-orange-50 text-orange-600 rounded text-xs border border-orange-100 font-medium">Smokeless</span>}
                    </>
                  ) : <span className="text-gray-400 italic text-sm">None</span>}
                </div>
            )}
          </div>

          {/* 6. Tea Consumption */}
          <div className="flex flex-col gap-2">
            <label className="font-semibold text-gray-700">Tea Consumption</label>
            {isEditing ? (
                <input
                    type="text"
                    className="w-full border border-gray-300 rounded-md p-2 text-sm focus:outline-none focus:border-[#137fec]"
                    value={formData.tea_consumption}
                    onChange={(e) => setFormData({...formData, tea_consumption: e.target.value})}
                    placeholder="e.g. 1-2 cups daily, None, Occasional"
                />
            ) : (
                <div className="p-2 bg-slate-50 rounded-md text-sm text-gray-700 min-h-[40px] flex items-center">
                    {formData.tea_consumption || <span className="text-gray-400 italic">No record</span>}
                </div>
            )}
          </div>

          {/* 7. Coffee Consumption */}
          <div className="flex flex-col gap-2">
            <label className="font-semibold text-gray-700">Coffee Consumption</label>
            {isEditing ? (
                <input
                    type="text"
                    className="w-full border border-gray-300 rounded-md p-2 text-sm focus:outline-none focus:border-[#137fec]"
                    value={formData.coffee_consumption}
                    onChange={(e) => setFormData({...formData, coffee_consumption: e.target.value})}
                    placeholder="e.g. 1 cup daily, None, Occasional"
                />
            ) : (
                <div className="p-2 bg-slate-50 rounded-md text-sm text-gray-700 min-h-[40px] flex items-center">
                    {formData.coffee_consumption || <span className="text-gray-400 italic">No record</span>}
                </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

// --- Shared: date label for a visit ---
const formatVisitDate = (date) =>
  new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

// --- CONSULTATION NOTES ---
const ConsultationNotes = ({ visits, patientId, onRefresh }) => {
  const [modalOpen, setModalOpen]   = useState(false);
  const [editTarget, setEditTarget] = useState(null); // { visitId, noteId, content }

  const allNotes = visits
    .filter(v => v.consultation_notes?.length > 0)
    .flatMap(v =>
      [...v.consultation_notes]
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .map(note => ({ ...note, visitId: v._id, visitDate: v.date }))
    )
    .sort((a, b) => new Date(b.visitDate) - new Date(a.visitDate));

  function openCreate() { setEditTarget(null); setModalOpen(true); }
  function openEdit(note) { setEditTarget(note); setModalOpen(true); }
  function handleClose() { setModalOpen(false); setEditTarget(null); }

  async function handleSave(content) {
    if (editTarget) {
      await API.patch(`/visits/${editTarget.visitId}/notes/${editTarget._id}`, { content });
    } else {
      await API.post(`/visits/patient/${patientId}/note`, { content });
    }
    onRefresh();
  }

  return (
    <div className="p-5 bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-[#137fec]">
            <NotebookPen size={20} />
          </div>
          <h3 className="font-semibold text-lg text-slate-800">Consultation Notes</h3>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors font-medium text-sm"
        >
          <Plus size={16} /> New Note
        </button>
      </div>

      {allNotes.length === 0 ? (
        <div className="flex items-center justify-center py-10 text-slate-400 text-sm bg-slate-50 rounded-xl border border-dashed border-slate-200">
          No consultation notes yet.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {allNotes.map(note => (
            <div key={note._id} className="relative group bg-slate-50 rounded-lg px-4 pt-4 pb-3 border border-slate-100">
              <button
                onClick={() => openEdit(note)}
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 px-2 py-1 bg-white border border-slate-200 rounded-md text-xs text-slate-500 hover:text-[#137fec] hover:border-[#137fec]"
              >
                <Edit2 size={11} /> Edit
              </button>
              <div
                className="text-sm text-slate-700 leading-relaxed pr-12
                  [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5
                  [&_li]:my-0.5 [&_b]:font-semibold [&_strong]:font-semibold"
                dangerouslySetInnerHTML={{ __html: note.content }}
              />
              <p className="text-right text-[11px] text-slate-400 mt-2">{formatVisitDate(note.visitDate)}</p>
            </div>
          ))}
        </div>
      )}

      <RichTextEditorModal
        isOpen={modalOpen}
        onClose={handleClose}
        type="note"
        initialContent={editTarget?.content}
        onSave={handleSave}
        onDelete={editTarget ? async () => {
          await API.delete(`/visits/${editTarget.visitId}/notes/${editTarget._id}`);
          onRefresh();
        } : undefined}
      />
    </div>
  );
};

const DOSAGE_OPTIONS = [
  '1-0-0', '0-0-1', '0-1-0',
  '1-1-0', '0-1-1', '1-0-1',
  '1-1-1', 'SOS', 'Once daily',
  'Twice daily', 'Thrice daily',
];
const DURATION_OPTIONS = [
  '1 day', '2 days', '3 days', '4 days', '5 days',
  '7 days', '10 days', '14 days', '1 month',
];
const emptyRow = () => ({ drug_name: '', dosage: '', duration: '', instructions: '' });

// --- MEDICATIONS ---
const Medications = ({ visits = [], patientId, onRefresh }) => {
  const [showForm, setShowForm] = useState(false);
  const [pharmacyItems, setPharmacyItems] = useState([]);
  const [rows, setRows] = useState([emptyRow()]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    API.get('/inventory').then(res => {
      const data = Array.isArray(res.data) ? res.data : [];
      setPharmacyItems(data.filter(i => i.type === 'Pharmacy'));
    }).catch(() => {});
  }, []);

  const allPrescriptions = visits
    .filter(v => v.prescriptions?.length > 0)
    .flatMap(v => v.prescriptions.map(p => ({ ...p, visitId: v._id, visitDate: v.date })))
    .sort((a, b) => new Date(b.visitDate) - new Date(a.visitDate));

  const updateRow = (idx, field, value) => {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  };

  const addRow = () => setRows(prev => [...prev, emptyRow()]);

  const removeRow = (idx) => setRows(prev => prev.length === 1 ? prev : prev.filter((_, i) => i !== idx));

  const handleSaveAll = async () => {
    const valid = rows.filter(r => r.drug_name.trim());
    if (!valid.length) return;
    setSaving(true);
    try {
      await Promise.all(valid.map(r =>
        API.post(`/visits/patient/${patientId}/prescription`, r)
      ));
      setRows([emptyRow()]);
      setShowForm(false);
      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => { setRows([emptyRow()]); setShowForm(false); };

  const handleDelete = async (visitId, prescriptionId) => {
    try {
      await API.delete(`/visits/${visitId}/prescriptions/${prescriptionId}`);
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-5 bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-[#137fec]">
            <Pill size={20} />
          </div>
          <h3 className="font-semibold text-lg text-slate-800">Medications</h3>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors font-medium text-sm"
          >
            <Plus size={16} /> Prescribe Medicine
          </button>
        )}
      </div>

      {/* Multi-row prescription form */}
      {showForm && (
        <div className="mb-4 rounded-xl border border-blue-100 overflow-hidden">
          {/* Column headers */}
          <div className="grid grid-cols-[2fr_1.2fr_1.2fr_1.5fr_32px] gap-2 px-3 py-2 bg-blue-50/60 border-b border-blue-100">
            <span className="text-xs font-semibold text-slate-500">Drug Name *</span>
            <span className="text-xs font-semibold text-slate-500">Dosage</span>
            <span className="text-xs font-semibold text-slate-500">Days</span>
            <span className="text-xs font-semibold text-slate-500">Instructions</span>
            <span></span>
          </div>

          <datalist id="pharmacy-drugs">
            {pharmacyItems.map(item => <option key={item._id} value={item.name} />)}
          </datalist>

          {/* Medicine rows */}
          <div className="flex flex-col divide-y divide-slate-100">
            {rows.map((row, idx) => (
              <div key={idx} className="grid grid-cols-[2fr_1.2fr_1.2fr_1.5fr_32px] gap-2 items-center px-3 py-2 bg-white">
                {/* Drug Name */}
                <div>
                  <input
                    list="pharmacy-drugs"
                    className="w-full border border-gray-200 rounded-md px-2.5 py-1.5 text-sm focus:outline-none focus:border-[#137fec]"
                    placeholder="Medicine name..."
                    value={row.drug_name}
                    onChange={e => updateRow(idx, 'drug_name', e.target.value)}
                  />
                </div>
                {/* Dosage dropdown */}
                <div>
                  <select
                    className="w-full border border-gray-200 rounded-md px-2.5 py-1.5 text-sm focus:outline-none focus:border-[#137fec] bg-white"
                    value={row.dosage}
                    onChange={e => updateRow(idx, 'dosage', e.target.value)}
                  >
                    <option value="">-- Select --</option>
                    {DOSAGE_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                {/* Duration dropdown */}
                <div>
                  <select
                    className="w-full border border-gray-200 rounded-md px-2.5 py-1.5 text-sm focus:outline-none focus:border-[#137fec] bg-white"
                    value={row.duration}
                    onChange={e => updateRow(idx, 'duration', e.target.value)}
                  >
                    <option value="">-- Select --</option>
                    {DURATION_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                {/* Instructions */}
                <div>
                  <input
                    className="w-full border border-gray-200 rounded-md px-2.5 py-1.5 text-sm focus:outline-none focus:border-[#137fec]"
                    placeholder="After food..."
                    value={row.instructions}
                    onChange={e => updateRow(idx, 'instructions', e.target.value)}
                  />
                </div>
                {/* Remove row */}
                <button
                  onClick={() => removeRow(idx)}
                  disabled={rows.length === 1}
                  className="flex items-center justify-center w-7 h-7 rounded-md text-slate-300 hover:text-red-400 hover:bg-red-50 disabled:opacity-0 transition-colors"
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-t border-slate-100">
            <button
              onClick={addRow}
              className="flex items-center gap-1 text-xs text-[#137fec] font-medium hover:underline"
            >
              <Plus size={13} /> Add Medicine
            </button>
            <div className="flex gap-2">
              <button onClick={handleDiscard} className="px-4 py-1.5 text-sm border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-100">
                Discard
              </button>
              <button
                onClick={handleSaveAll}
                disabled={saving || !rows.some(r => r.drug_name.trim())}
                className="px-4 py-1.5 text-sm bg-[#137fec] text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : `Save ${rows.filter(r => r.drug_name.trim()).length > 1 ? `All (${rows.filter(r => r.drug_name.trim()).length})` : 'Prescription'}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      {allPrescriptions.length === 0 ? (
        <div className="flex items-center justify-center py-8 text-slate-400 text-sm bg-slate-50 rounded-xl border border-dashed border-slate-200">
          No prescriptions recorded.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
                <th className="pb-2 font-semibold">Drug</th>
                <th className="pb-2 font-semibold">Dosage</th>
                <th className="pb-2 font-semibold">Duration</th>
                <th className="pb-2 font-semibold">Instructions</th>
                <th className="pb-2 font-semibold">Date</th>
                <th className="pb-2 font-semibold">Status</th>
                <th className="pb-2"></th>
              </tr>
            </thead>
            <tbody>
              {allPrescriptions.map(p => (
                <tr key={p._id} className="border-b border-slate-50 hover:bg-slate-50 group">
                  <td className="py-2 font-medium text-slate-800">{p.drug_name}</td>
                  <td className="py-2 text-slate-600">{p.dosage || '-'}</td>
                  <td className="py-2 text-slate-600">{p.duration || '-'}</td>
                  <td className="py-2 text-slate-600">{p.instructions || '-'}</td>
                  <td className="py-2 text-slate-400 text-xs">{formatVisitDate(p.visitDate)}</td>
                  <td className="py-2">
                    {(() => {
                      const inv = p.invoice_id;
                      const isPaid    = inv?.status === 'Paid';
                      const isPartial = inv && !isPaid;
                      return (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                          isPaid    ? 'bg-green-50 text-green-600 border-green-100'
                          : isPartial ? 'bg-yellow-50 text-yellow-600 border-yellow-100'
                          : 'bg-orange-50 text-orange-500 border-orange-100'
                        }`}>
                          {isPaid ? 'Paid' : isPartial ? 'Partial' : 'Unpaid'}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="py-2">
                    <button
                      onClick={() => handleDelete(p.visitId, p._id)}
                      className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 text-xs px-2 py-0.5 rounded border border-transparent hover:border-red-200 transition-all"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const LAB_STATUS_COLORS = {
  'Sent':                 'bg-blue-50 text-blue-600',
  'In Process':           'bg-amber-50 text-amber-600',
  'Received':             'bg-purple-50 text-purple-600',
  'Delivered to Patient': 'bg-green-50 text-green-600',
};

// --- LAB ORDERS ---
const LabOrders = ({ patientId, onRefresh, onOrdersLoaded }) => {
  const [orders, setOrders] = useState([]);
  const [catalogItems, setCatalogItems] = useState([]);
  const [labVendors, setLabVendors] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    item_name: '', shade: '', notes: '', expected_delivery: '',
    vendor_id: '', cost_to_clinic: ''
  });
  const [saving, setSaving] = useState(false);

  const fetchOrders = async () => {
    try {
      const res = await API.get('/labs/orders');
      const data = Array.isArray(res.data) ? res.data : [];
      const filtered = data.filter(o => o.patient_id?._id === patientId || o.patient_id === patientId);
      setOrders(filtered);
      onOrdersLoaded?.(filtered);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    fetchOrders();
    Promise.all([
      API.get('/labs/items'),
      API.get('/vendors'),
    ]).then(([catalogRes, vendorRes]) => {
      setCatalogItems(Array.isArray(catalogRes.data) ? catalogRes.data : []);
      const vendors = Array.isArray(vendorRes.data) ? vendorRes.data : [];
      setLabVendors(vendors.filter(v => v.type === 'Lab'));
    }).catch(() => {});
  }, [patientId]);

  const handleItemSelect = (itemName) => {
    const selectedItem = catalogItems.find(item => item.name === itemName);
    const newForm = { ...form, item_name: itemName };
    if (selectedItem && selectedItem.price) {
      newForm.cost_to_clinic = selectedItem.price;
    }
    setForm(newForm);
  };

  const handleAdd = async () => {
    if (!form.item_name.trim()) return;
    setSaving(true);
    try {
      await API.post('/labs/orders', { ...form, patient_id: patientId });
      setForm({ item_name: '', shade: '', notes: '', expected_delivery: '', vendor_id: '', cost_to_clinic: '' });
      setShowForm(false);
      fetchOrders();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (orderId, status) => {
    try {
      await API.patch(`/labs/orders/${orderId}`, { status });
      fetchOrders();
    } catch (err) { console.error(err); }
  };

  return (
    <div className="p-5 bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-[#137fec]">
            <TestTube size={20} />
          </div>
          <h3 className="font-semibold text-lg text-slate-800">Lab Orders</h3>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors font-medium text-sm"
        >
          <Plus size={16} /> Add Lab Order
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="mb-4 p-4 bg-blue-50/40 rounded-xl border border-blue-100 flex flex-col gap-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Item *</label>
              <input
                list="lab-catalog-items"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#137fec]"
                placeholder="Type or select lab item..."
                value={form.item_name}
                onChange={e => handleItemSelect(e.target.value)}
              />
              <datalist id="lab-catalog-items">
                {catalogItems.map(item => <option key={item._id} value={item.name} />)}
              </datalist>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Shade</label>
              <input
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#137fec]"
                placeholder="e.g. A2"
                value={form.shade}
                onChange={e => setForm({ ...form, shade: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Lab Vendor</label>
              <select
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#137fec]"
                value={form.vendor_id}
                onChange={e => setForm({ ...form, vendor_id: e.target.value })}
              >
                <option value="">-- Select Vendor --</option>
                {labVendors.map(v => <option key={v._id} value={v._id}>{v.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Expected Delivery</label>
              <input
                type="date"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#137fec]"
                value={form.expected_delivery}
                onChange={e => setForm({ ...form, expected_delivery: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Cost to Clinic (₹)</label>
              <input
                type="number"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#137fec]"
                placeholder="0"
                value={form.cost_to_clinic}
                onChange={e => setForm({ ...form, cost_to_clinic: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Notes / Instructions</label>
              <input
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#137fec]"
                placeholder="Special instructions..."
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="px-4 py-1.5 text-sm border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50">Cancel</button>
            <button
              onClick={handleAdd}
              disabled={saving || !form.item_name.trim()}
              className="px-4 py-1.5 text-sm bg-[#137fec] text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Create Order'}
            </button>
          </div>
        </div>
      )}

      {/* Orders list */}
      {orders.length === 0 ? (
        <div className="flex items-center justify-center py-8 text-slate-400 text-sm bg-slate-50 rounded-xl border border-dashed border-slate-200">
          No lab orders for this patient.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {orders.map(order => {
            const item = order.items?.[0] || {};
            return (
              <div key={order._id} className="flex items-center justify-between gap-4 px-4 py-3 bg-slate-50 rounded-lg border border-slate-100">
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="font-medium text-slate-800 text-sm truncate">{item.item_name || '-'}</span>
                  <span className="text-xs text-slate-400">
                    {order.vendor_id?.name || 'No vendor'}
                    {item.shade ? ` · Shade: ${item.shade}` : ''}
                    {order.expected_delivery ? ` · Due: ${formatVisitDate(order.expected_delivery)}` : ''}
                  </span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {order.cost_to_clinic > 0 && (
                    <span className="text-xs text-slate-500">₹{order.cost_to_clinic}</span>
                  )}
                  {(() => {
                    const inv = order.invoice_id;
                    const isPaid    = inv?.status === 'Paid';
                    const isPartial = inv && !isPaid;
                    return (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                        isPaid    ? 'bg-green-50 text-green-600 border-green-100'
                        : isPartial ? 'bg-yellow-50 text-yellow-600 border-yellow-100'
                        : 'bg-orange-50 text-orange-500 border-orange-100'
                      }`}>
                        {isPaid ? 'Paid' : isPartial ? 'Partial' : 'Unpaid'}
                      </span>
                    );
                  })()}
                  <select
                    value={order.status}
                    onChange={e => handleStatusChange(order._id, e.target.value)}
                    className={`text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer focus:outline-none ${LAB_STATUS_COLORS[order.status] || 'bg-slate-100 text-slate-600'}`}
                  >
                    {['Sent', 'In Process', 'Received', 'Delivered to Patient'].map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// --- ADVICES & RECALL ---
const AdvicesRecall = ({ visits, patientId, patient, onRefresh, onSelectDate }) => {
  const [activeTab, setActiveTab]   = useState('Advices');
  const [modalOpen, setModalOpen]   = useState(false);
  const [editTarget, setEditTarget] = useState(null);

  const allAdvices = visits
    .filter(v => v.advices?.length > 0)
    .flatMap(v =>
      [...v.advices]
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .map(advice => ({ ...advice, visitId: v._id, visitDate: v.date }))
    )
    .sort((a, b) => new Date(b.visitDate) - new Date(a.visitDate));

  function openCreate() { setEditTarget(null); setModalOpen(true); }
  function openEdit(advice) { setEditTarget(advice); setModalOpen(true); }
  function handleClose() { setModalOpen(false); setEditTarget(null); }

  async function handleSave(content) {
    if (editTarget) {
      await API.patch(`/visits/${editTarget.visitId}/advices/${editTarget._id}`, { content });
    } else {
      await API.post(`/visits/patient/${patientId}/advice`, { content });
    }
    onRefresh();
  }

  return (
    <div className="p-5 bg-white rounded-xl shadow-sm border border-gray-100 mb-6">

      {/* Tab Header */}
      <div className="flex justify-between items-center mb-5">
        <div className="flex gap-5 border-b border-slate-100 w-full pb-3">
          {['Advices', 'Recall'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`text-sm font-semibold pb-1 border-b-2 transition-all ${
                activeTab === tab
                  ? 'text-[#137fec] border-[#137fec]'
                  : 'text-slate-400 border-transparent hover:text-slate-600'
              }`}
            >
              {tab}
            </button>
          ))}
          {/* Action button aligned right */}
          <div className="ml-auto">
            {activeTab === 'Advices' ? (
              <button
                onClick={openCreate}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition-colors font-medium text-xs"
              >
                <Plus size={14} /> Add Advice
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {/* Advices Tab */}
      {activeTab === 'Advices' && (
        <>
          {allAdvices.length === 0 ? (
            <div className="flex items-center justify-center py-10 text-slate-400 text-sm bg-slate-50 rounded-xl border border-dashed border-slate-200">
              No advices added yet.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {allAdvices.map(advice => (
                <div key={advice._id} className="relative group bg-amber-50/40 rounded-lg px-4 pt-4 pb-3 border border-amber-100">
                  <button
                    onClick={() => openEdit(advice)}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 px-2 py-1 bg-white border border-amber-200 rounded-md text-xs text-slate-500 hover:text-amber-600 hover:border-amber-400"
                  >
                    <Edit2 size={11} /> Edit
                  </button>
                  <div
                    className="text-sm text-slate-700 leading-relaxed pr-12
                      [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5
                      [&_li]:my-0.5 [&_b]:font-semibold [&_strong]:font-semibold"
                    dangerouslySetInnerHTML={{ __html: advice.content }}
                  />
                  <p className="text-right text-[11px] text-slate-400 mt-2">{formatVisitDate(advice.visitDate)}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Recall Tab */}
      {activeTab === 'Recall' && (
        <AppointmentTimeline
          patientId={patientId}
          patient={patient}
          buttonLabel="Add Recall"
          onSelectDate={onSelectDate}
        />
      )}

      <RichTextEditorModal
        isOpen={modalOpen}
        onClose={handleClose}
        type="advice"
        initialContent={editTarget?.content}
        onSave={handleSave}
        onDelete={editTarget ? async () => {
          await API.delete(`/visits/${editTarget.visitId}/advices/${editTarget._id}`);
          onRefresh();
        } : undefined}
      />
    </div>
  );
};

// --- MAIN PAGE COMPONENT ---

// eslint-disable-next-line react/prop-types
function Section({ number, title, description, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mb-3">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-slate-100 shadow-sm text-left hover:bg-slate-50 transition-colors"
      >
        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#137fec] text-white text-xs font-bold flex items-center justify-center">{number}</span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-800 text-sm">{title}</p>
          {description && <p className="text-xs text-slate-400 mt-0.5 hidden sm:block">{description}</p>}
        </div>
        <ChevronDown size={16} className={`flex-shrink-0 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="mt-3 space-y-3">{children}</div>}
    </div>
  );
}

// eslint-disable-next-line react/prop-types
function MobileActionBar({ onConclude, onPrescription, onInvoice, patientId, patient }) {
  const [open, setOpen]       = useState(false);
  const [pos, setPos]         = useState(() => ({
    x: Math.max(0, window.innerWidth / 2 - 28),
    y: window.innerHeight - 100,
  }));
  const [dragging, setDragging] = useState(false);
  const startRef  = useRef(null);
  const movedRef  = useRef(false);

  const onMouseDown = useCallback((e) => {
    e.preventDefault();
    movedRef.current = false;
    startRef.current = { mouseX: e.clientX, mouseY: e.clientY, elX: pos.x, elY: pos.y };
    setDragging(true);
  }, [pos]);

  const onTouchStart = useCallback((e) => {
    const t = e.touches[0];
    movedRef.current = false;
    startRef.current = { mouseX: t.clientX, mouseY: t.clientY, elX: pos.x, elY: pos.y };
    setDragging(true);
  }, [pos]);

  useEffect(() => {
    if (!dragging) return;
    const SIZE = 56;
    const move = (cx, cy) => {
      const dx = cx - startRef.current.mouseX;
      const dy = cy - startRef.current.mouseY;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
        movedRef.current = true;
        setOpen(false);
      }
      setPos({
        x: Math.max(0, Math.min(window.innerWidth  - SIZE, startRef.current.elX + dx)),
        y: Math.max(0, Math.min(window.innerHeight - SIZE, startRef.current.elY + dy)),
      });
    };
    const onMouseMove = (e) => move(e.clientX, e.clientY);
    const onTouchMove = (e) => { e.preventDefault(); move(e.touches[0].clientX, e.touches[0].clientY); };
    const stop = () => setDragging(false);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup',   stop);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend',  stop);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup',   stop);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend',  stop);
    };
  }, [dragging]);

  return (
    <div className="sm:hidden">
      {open && (
        <div className="fixed inset-0 z-30 bg-black/40" onClick={() => setOpen(false)} />
      )}
      <div
        style={{ position: 'fixed', left: pos.x, top: pos.y, zIndex: 40, touchAction: 'none' }}
        className="flex flex-col items-center gap-2"
      >
        {open && (
          <div className="flex flex-col items-end gap-2 mb-1 w-52" style={{ position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', paddingBottom: 8 }}>
            <button
              onClick={() => { onConclude(); setOpen(false); }}
              className="w-full flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-red-300 text-red-600 font-semibold rounded-xl shadow-lg text-sm"
            >
              ✓ Conclude Appointment
            </button>
            <div className="w-full" onClick={() => setOpen(false)}>
              <SendMailDropdown patientId={patientId} patient={patient} fullWidth />
            </div>
            <button
              onClick={() => { onPrescription(); setOpen(false); }}
              className="w-full flex items-center gap-2 px-4 py-2.5 bg-white border border-[#137fec] text-[#137fec] font-semibold rounded-xl shadow-lg text-sm"
            >
              <FileText size={16} /> Prescription
            </button>
            <button
              onClick={() => { onInvoice(); setOpen(false); }}
              className="w-full flex items-center gap-2 px-4 py-2.5 bg-[#137fec] text-white font-semibold rounded-xl shadow-lg text-sm"
            >
              <Receipt size={16} /> Generate Invoice
            </button>
          </div>
        )}
        <button
          onMouseDown={onMouseDown}
          onTouchStart={onTouchStart}
          onClick={() => { if (!movedRef.current) setOpen(o => !o); }}
          className={`w-14 h-14 rounded-full bg-[#137fec] text-white shadow-xl shadow-blue-400/40 flex items-center justify-center transition-transform active:scale-95 ${dragging ? 'cursor-grabbing scale-110' : 'cursor-grab'}`}
        >
          {open ? <X size={22} /> : <Plus size={22} />}
        </button>
      </div>
    </div>
  );
}

// eslint-disable-next-line react/prop-types
function MolarisFAB({ onOpen }) {
  const [pos, setPos]         = useState(() => ({
    x: window.innerWidth - 88,
    y: Math.max(80, window.innerHeight / 2 - 32),
  }));
  const [dragging, setDragging] = useState(false);
  const [showTip, setShowTip]   = useState(false);
  const dragRef   = useRef(null);
  const startRef  = useRef(null); // { mouseX, mouseY, elX, elY }
  const movedRef  = useRef(false);

  const onMouseDown = useCallback((e) => {
    e.preventDefault();
    movedRef.current = false;
    startRef.current = { mouseX: e.clientX, mouseY: e.clientY, elX: pos.x, elY: pos.y };
    setDragging(true);
  }, [pos]);

  const onTouchStart = useCallback((e) => {
    const t = e.touches[0];
    movedRef.current = false;
    startRef.current = { mouseX: t.clientX, mouseY: t.clientY, elX: pos.x, elY: pos.y };
    setDragging(true);
  }, [pos]);

  useEffect(() => {
    if (!dragging) return;
    const SIZE = 64;

    const move = (cx, cy) => {
      const dx = cx - startRef.current.mouseX;
      const dy = cy - startRef.current.mouseY;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) movedRef.current = true;
      setPos({
        x: Math.max(0, Math.min(window.innerWidth  - SIZE, startRef.current.elX + dx)),
        y: Math.max(0, Math.min(window.innerHeight - SIZE, startRef.current.elY + dy)),
      });
    };

    const onMouseMove = (e) => move(e.clientX, e.clientY);
    const onTouchMove = (e) => { e.preventDefault(); move(e.touches[0].clientX, e.touches[0].clientY); };
    const stop = () => setDragging(false);

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup',   stop);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend',  stop);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup',   stop);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend',  stop);
    };
  }, [dragging]);

  return (
    <div
      ref={dragRef}
      style={{ position: 'fixed', left: pos.x, top: pos.y, zIndex: 50, touchAction: 'none' }}
      className="group"
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
    >
      {/* Hover tooltip */}
      <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1 bg-slate-900 text-white text-xs font-semibold rounded-lg whitespace-nowrap shadow-lg pointer-events-none transition-all duration-150 ${showTip && !dragging ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
        Molaris TCO
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
      </div>

      <button
        onClick={() => { if (!movedRef.current) onOpen(); }}
        onMouseEnter={() => setShowTip(true)}
        onMouseLeave={() => setShowTip(false)}
        className={`relative w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-purple-700 text-white shadow-xl shadow-purple-400/50 flex items-center justify-center transition-all duration-200 ${dragging ? 'scale-110 shadow-purple-500/70 cursor-grabbing' : 'hover:scale-110 active:scale-95 cursor-grab'}`}
      >
        <span className="absolute inset-0 rounded-full bg-purple-500 opacity-25 animate-ping" />
        <Mic size={26} />
      </button>
    </div>
  );
}

export default function TreatmentPage({ patientIdProp }) {
  const { id: paramId } = useParams();
  const id = patientIdProp || paramId;

  const { user } = useAuth();
  const { closeTreatment, activeTreatment } = useTreatment();
  const { inventorySettings } = useInventorySettings();

  const [patient, setPatient]               = useState(null);
  const [visits, setVisits]                 = useState([]);
  const [appointments, setAppointments]     = useState([]);
  const [labOrders, setLabOrders]           = useState([]);
  const [loading, setLoading]               = useState(true);
  const [isProfileOpen, setIsProfileOpen]   = useState(false);
  const [isPrescriptionOpen, setIsPrescriptionOpen] = useState(false);
  const [isInvoiceOpen, setIsInvoiceOpen]   = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportRefreshKey, setReportRefreshKey]   = useState(0);
  const [viewingDate, setViewingDate]             = useState(null); // ISO date string or null (= today)
  const [showConcludeModal, setShowConcludeModal] = useState(false);
  const [concludingAppointment, setConcludingAppointment] = useState(null);
  const [pageBanner, setPageBanner] = useState(null); // { type: 'success'|'error', msg: string }

  const showBanner = (type, msg) => {
    setPageBanner({ type, msg });
    setTimeout(() => setPageBanner(null), 3500);
  };

  // Central Data Fetch Function
  const fetchPageData = async () => {
    try {
      const [patientRes, visitsRes, appointmentsRes] = await Promise.all([
          API.get(`/patients/${id}`),
          API.get(`/visits/patient/${id}`),
          API.get(`/appointments/patient/${id}`)
      ]);
      setPatient(patientRes.data);
      setVisits(visitsRes.data);
      setAppointments(appointmentsRes.data);
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
          // Only patient-level fields (NO chief_complaint)
          await API.put(`/patients/${id}`, updatedData);
          setPatient(prev => ({ ...prev, ...updatedData }));
          alert("Clinical History Updated");
      } catch (err) {
          console.error("Failed to update history", err);
          alert("Update failed");
      }
  };

  const handleSaveVisitComplaint = async (visitId, chief_complaint) => {
      try {
          await API.patch(`/visits/${visitId}`, { chief_complaint });
          // Optimistically update local visits state
          setVisits(prev => prev.map(v => v._id === visitId ? { ...v, chief_complaint } : v));
      } catch (err) {
          console.error("Failed to update visit chief complaint", err);
          alert("Failed to save Chief Complaint");
      }
  };

  const handleConcludeAppointment = async () => {
    if (!concludingAppointment) throw new Error('No appointment to conclude');

    try {
      const response = await API.patch(`/appointments/${concludingAppointment._id}/status`, { status: 'Completed' });

      if (response.data.status !== 'Completed') {
        throw new Error('Failed to update appointment status');
      }

      await fetchPageData();
      setShowConcludeModal(false);
      setConcludingAppointment(null);
      closeTreatment(true);
    } catch (err) {
      console.error('Error concluding appointment:', err);
      showBanner('error', 'Failed to conclude appointment: ' + err.message);
      throw err;
    }
  };

  if (loading) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-[#EBF2F7]">
              <Loader2 className="animate-spin text-[#137fec]" size={40} />
          </div>
      );
  }

  // When a past appointment is selected, filter visits to that day only
  const displayVisits = viewingDate
    ? visits.filter(v => new Date(v.date).toISOString().slice(0, 10) === new Date(viewingDate).toISOString().slice(0, 10))
    : visits;

  const viewingDateLabel = viewingDate
    ? new Date(viewingDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  const handleConclude = () => {
    const apptId = activeTreatment?.appointmentId;
    const activeAppt = apptId ? appointments.find(a => a._id === apptId) : null;
    if (activeAppt) { setConcludingAppointment(activeAppt); setShowConcludeModal(true); }
    else showBanner('error', 'No active appointment found for this patient.');
  };

  return (
    <div className="min-h-screen bg-[#EBF2F7] px-3 sm:px-4 font-sans pb-32 sm:pb-24">
      <div className="max-w-7xl mx-auto pt-4 sm:pt-6">

        {/* Page banner */}
        {pageBanner && (
          <div className={`flex items-center gap-2 px-4 py-3 rounded-xl mb-4 text-sm font-medium border ${
            pageBanner.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'
          }`}>
            {pageBanner.type === 'success' ? '✓' : '✕'} {pageBanner.msg}
          </div>
        )}

        <PatientInfoCard patient={patient} onViewProfile={() => setIsProfileOpen(true)} appointments={appointments} />

        {/* Past date banner */}
        {viewingDate && (
          <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-3">
            <p className="text-sm text-amber-800">Viewing <span className="font-semibold">{viewingDateLabel}</span></p>
            <button onClick={() => setViewingDate(null)} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-amber-300 text-amber-700 rounded-lg text-xs font-semibold hover:bg-amber-100 transition-colors">
              ← Back to Today
            </button>
          </div>
        )}

        {/* ── Section 1: Assessment ── */}
        <Section number="1" title="Assessment" description="Clinical history & dental chart" defaultOpen={false}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <ClinicalHistory
              patient={patient}
              currentVisit={visits[visits.length - 1] || null}
              onSaveHistory={handleSaveHistory}
              onSaveVisitComplaint={handleSaveVisitComplaint}
            />
            <TreatmentTabs
              onTreatmentAdded={fetchPageData}
              visits={visits}
              patientId={id}
              initialDentition={patient?.dentition_type || 'Adult'}
            />
          </div>
        </Section>

        {/* ── Section 2: Treatment Plan ── */}
        <Section number="2" title="Treatment Plan" description="Planned treatments, prescriptions & lab orders" defaultOpen={false}>
          <TreatmentPlanBoard visits={displayVisits} onRefresh={fetchPageData} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <Medications visits={displayVisits} patientId={id} onRefresh={fetchPageData} />
            <LabOrders patientId={id} onRefresh={fetchPageData} onOrdersLoaded={setLabOrders} />
          </div>
          {inventorySettings.consumableEnabled && (
            <InventoryConsumption visits={displayVisits} patientId={id} onRefresh={fetchPageData} />
          )}
        </Section>

        {/* ── Section 3: Visit Notes ── */}
        <Section number="3" title="Visit Notes" description="Consultation notes & patient advice" defaultOpen={false}>
          <ConsultationNotes visits={displayVisits} patientId={id} onRefresh={fetchPageData} />
          <AdvicesRecall visits={displayVisits} patientId={id} patient={patient} onRefresh={fetchPageData} onSelectDate={setViewingDate} />
        </Section>

        {/* ── Section 4: Files & Reports ── */}
        <Section number="4" title="Files & Reports" description="Uploaded files and AI reports" defaultOpen={false}>
          <ReportsNotesSection patientId={id} refreshTrigger={reportRefreshKey} visits={visits} onRefresh={fetchPageData} />
        </Section>

        {/* Desktop bottom bar */}
        <div className="hidden sm:flex sticky bottom-4 z-10 bg-white p-3 sm:p-4 rounded-xl shadow-[0_-4px_20px_rgba(0,0,0,0.05)] border border-gray-100 justify-between items-center gap-3">
          <button onClick={handleConclude} className="px-4 sm:px-6 py-2 border-2 border-red-300 text-red-600 font-medium rounded-lg hover:bg-red-50 flex items-center gap-2 transition-colors text-sm whitespace-nowrap">
            ✓ Conclude Appointment
          </button>
          <div className="flex gap-2 sm:gap-3 flex-wrap justify-end">
            <SendMailDropdown patientId={id} patient={patient} />
            <button onClick={() => setIsPrescriptionOpen(true)} className="px-4 sm:px-6 py-2 border border-[#137fec] text-[#137fec] font-medium rounded-lg hover:bg-blue-50 flex items-center gap-2 transition-colors text-sm">
              <FileText size={16} /> Prescription
            </button>
            <button onClick={() => setIsInvoiceOpen(true)} className="px-4 sm:px-6 py-2 bg-[#137fec] text-white font-medium rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors text-sm">
              <Receipt size={16} /> Generate Invoice
            </button>
          </div>
        </div>
      </div>

      {/* Mobile action FAB */}
      <MobileActionBar
        onConclude={handleConclude}
        onPrescription={() => setIsPrescriptionOpen(true)}
        onInvoice={() => setIsInvoiceOpen(true)}
        patientId={id}
        patient={patient}
      />

      {/* Molaris TCO — Draggable FAB */}
      <MolarisFAB onOpen={() => setIsReportModalOpen(true)} />

      <ClinicalReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        onSuccess={() => { fetchPageData(); setReportRefreshKey(k => k + 1); }}
        patientId={id}
        patient={patient}
      />

      <PatientProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        patient={patient}
      />

      <PrescriptionModal
        isOpen={isPrescriptionOpen}
        onClose={() => setIsPrescriptionOpen(false)}
        patient={patient}
        visits={visits}
        doctorName={user?.name}
      />

      <NewInvoiceModal
        isOpen={isInvoiceOpen}
        onClose={() => setIsInvoiceOpen(false)}
        onSuccess={() => { setIsInvoiceOpen(false); fetchPageData(); }}
        initialPatient={patient}
        initialItems={[
          // Unpaid treatments (no invoice or invoice status is not 'Paid')
          ...visits.flatMap(v =>
            (v.treatments || [])
              .filter(t => {
                  const inv = t.invoice_id;
                  const isUnpaid = !inv || inv.status !== 'Paid';
                  return isUnpaid && t.status !== 'Cancelled' && t.treatment_name !== 'Missing';
              })
              .map(t => ({
                name:           t.treatment_name,
                type:           'Service',
                quantity:       t.qty || 1,
                rate:           t.cost || 0,
                total:          (t.cost || 0) * (t.qty || 1),
                item_id:        null,
                _treatmentRef:  { visitId: v._id, treatmentId: t._id },
              }))
          ),
          // Unpaid prescriptions (no invoice or invoice status is not 'Paid')
          ...visits.flatMap(v =>
            (v.prescriptions || [])
              .filter(p => !p.invoice_id || p.invoice_id.status !== 'Paid')
              .map(p => ({
                name:               p.drug_name,
                type:               'Pharmacy',
                quantity:           1,
                rate:               0,
                total:              0,
                item_id:            null,
                _prescriptionRef:   { visitId: v._id, prescriptionId: p._id },
              }))
          ),
          // Unpaid lab orders (no invoice or invoice status is not 'Paid')
          ...labOrders
            .filter(o => !o.invoice_id || o.invoice_id.status !== 'Paid')
            .map(o => ({
              name:     o.items?.[0]?.item_name || 'Lab Order',
              type:     'Lab',
              quantity: 1,
              rate:     o.cost_to_clinic || 0,
              total:    o.cost_to_clinic || 0,
              item_id:  o._id,
            })),
        ]}
      />

      {/* Conclude Appointment Confirmation Modal */}
      {showConcludeModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mx-auto mb-4">
              <span className="text-2xl text-red-600">⚠️</span>
            </div>
            <h3 className="text-xl font-bold text-slate-900 text-center mb-2">
              Conclude Appointment
            </h3>
            <p className="text-slate-600 text-center mb-6">
              Are you sure you want to mark this appointment as <span className="font-semibold">completed</span>?
              This action will update the appointment status and cannot be easily undone.
            </p>
            {concludingAppointment && (
              <div className="bg-slate-50 rounded-lg p-4 mb-6 border border-slate-200">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-slate-500 text-xs font-medium uppercase">Time</p>
                    <p className="text-slate-900 font-semibold">
                      {new Date(concludingAppointment.start_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs font-medium uppercase">Status</p>
                    <p className="text-slate-900 font-semibold capitalize">{concludingAppointment.status}</p>
                  </div>
                </div>
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowConcludeModal(false);
                  setConcludingAppointment(null);
                }}
                className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConcludeAppointment}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
              >
                Yes, Conclude
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}