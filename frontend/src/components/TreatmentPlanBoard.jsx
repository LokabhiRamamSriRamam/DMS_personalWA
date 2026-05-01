import React, { useState, useMemo } from 'react';
import { Trash2, Check, ArrowRight, X, Clock, FileText, AlertCircle, DollarSign, Calendar } from 'lucide-react';
import API from '../services/api';

// --- SUB-COMPONENT: DETAILED TREATMENT MODAL ---
const TreatmentStatusModal = ({ isOpen, onClose, treatment, onUpdate, onDelete }) => {
  if (!isOpen || !treatment) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-lg text-slate-800">Treatment Details</h3>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 text-slate-500 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto">
          
          {/* Main Title & Status */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <h4 className="text-2xl font-bold text-slate-900">{treatment.treatmentName}</h4>
              <p className="text-sm text-slate-500 mt-1 flex items-center gap-2">
                <Calendar size={14} /> Created on {treatment.date}
              </p>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
              treatment.status === 'Completed' ? 'bg-green-50 text-green-700 border-green-200' :
              treatment.status === 'In Progress' ? 'bg-blue-50 text-blue-700 border-blue-200' :
              'bg-yellow-50 text-yellow-700 border-yellow-200'
            }`}>
              {treatment.status}
            </span>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Teeth Involved</span>
              <span className="text-lg font-bold text-slate-800">
                {treatment.teeth && treatment.teeth.length > 0 ? treatment.teeth.join(', ') : 'General'}
              </span>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Cost Est.</span>
              <span className="text-lg font-bold text-slate-800 flex items-center">
                <DollarSign size={16} className="text-slate-400 mr-1"/> {treatment.cost}
              </span>
            </div>
          </div>

          {/* Clinical Info Section */}
          <div className="space-y-4 mb-8">
            <div className="flex gap-3 items-start">
              <div className="mt-1 p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                <AlertCircle size={18} />
              </div>
              <div>
                <h5 className="text-sm font-bold text-slate-700">Diagnosis / Findings</h5>
                <p className="text-sm text-slate-600 mt-1">
                  {treatment.diagnosis || "No specific diagnosis recorded."}
                </p>
              </div>
            </div>

            <div className="flex gap-3 items-start">
              <div className="mt-1 p-1.5 bg-purple-50 text-purple-600 rounded-lg">
                <FileText size={18} />
              </div>
              <div>
                <h5 className="text-sm font-bold text-slate-700">Clinical Notes</h5>
                <p className="text-sm text-slate-600 mt-1">
                  {treatment.notes || "No additional notes provided."}
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 pt-4 border-t border-slate-100">
            {treatment.status === 'Planned' && (
              <button 
                onClick={() => onUpdate(treatment.visitId, treatment.id, 'In Progress')}
                className="w-full py-3.5 flex items-center justify-center gap-2 bg-[#137fec] hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-200 transition-all active:scale-[0.98]"
              >
                <Clock size={20} /> Start Treatment (In Progress)
              </button>
            )}

            {treatment.status === 'In Progress' && (
              <button 
                onClick={() => onUpdate(treatment.visitId, treatment.id, 'Completed')}
                className="w-full py-3.5 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-200 transition-all active:scale-[0.98]"
              >
                <Check size={20} /> Mark as Completed
              </button>
            )}

            {treatment.status === 'Completed' && (
               <div className="py-3 bg-green-50 text-green-700 rounded-xl flex items-center gap-2 justify-center font-bold border border-green-100">
                  <Check size={20} /> Treatment Completed
               </div>
            )}

            {treatment.status === 'Planned' && onDelete && (
              <button
                onClick={() => onDelete(treatment.visitId, treatment.id)}
                className="w-full py-3 flex items-center justify-center gap-2 text-red-600 bg-white border border-red-200 hover:bg-red-50 font-semibold rounded-xl transition-all"
              >
                <Trash2 size={18} /> Delete Treatment
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

// --- TREATMENT CARD (Small View) ---
const TreatmentCard = ({ data, status, onClick }) => {
  return (
    <div
      onClick={() => onClick(data)}
      className="p-4 bg-white border border-[#DCE5EE] rounded-xl shadow-sm flex flex-col gap-3 relative cursor-pointer hover:shadow-md hover:border-blue-300 transition-all group"
    >
      <div className="flex justify-between items-start">
        <p className="text-xs font-medium text-slate-400">{data.date}</p>
        <div className="flex items-center gap-1.5">
          <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
            data.invoiced
              ? 'bg-green-50 text-green-600 border-green-100'
              : 'bg-orange-50 text-orange-500 border-orange-100'
          }`}>
            {data.invoiced ? 'Paid' : 'Unpaid'}
          </span>
          <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
              status === 'Completed' ? 'bg-green-50 text-green-600 border-green-100' :
              status === 'In Progress' ? 'bg-blue-50 text-blue-600 border-blue-100' :
              'bg-yellow-50 text-yellow-600 border-yellow-100'
          }`}>
              {status}
          </span>
        </div>
      </div>

      <div>
        <h4 className="font-bold text-slate-800 text-sm leading-tight mb-1">{data.treatmentName}</h4>
        <div className="flex items-center gap-2">
           <span className="text-xs text-slate-500">Teeth:</span>
           <div className="flex gap-1">
             {data.teeth && data.teeth.length > 0 ? (
                 data.teeth.map((t, i) => (
                    <span key={i} className="text-xs font-bold text-slate-700 bg-slate-100 px-1.5 rounded">
                        {t}
                    </span>
                 ))
             ) : <span className="text-xs text-slate-400">Gen</span>}
           </div>
        </div>
      </div>
    </div>
  );
};

// --- MAIN BOARD ---
const TreatmentPlanBoard = ({ visits = [], onRefresh }) => {
  const [selectedPlan, setSelectedPlan] = useState(null);

  const handleDelete = async (visitId, treatmentId) => {
    if (!confirm('Delete this treatment? This cannot be undone.')) return;
    try {
      await API.delete(`/visits/${visitId}/treatments/${treatmentId}`);
      setSelectedPlan(null);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Delete failed', err);
      alert('Failed to delete treatment.');
    }
  };

  // Parse visits into lists
  const { planned, inProgress, completed } = useMemo(() => {
    const p = [], i = [], c = [];

    visits.forEach(visit => {
        const visitDate = new Date(visit.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        const findings = visit.findings?.diagnosis_notes || ''; // Extract diagnosis from visit findings

        if (visit.treatments) {
            visit.treatments.filter(t => t.treatment_name !== 'Missing').forEach(treatment => {
                const item = {
                    visitId: visit._id,
                    id: treatment._id,
                    date: visitDate,
                    treatmentName: treatment.treatment_name,
                    teeth: treatment.teeth_numbers,
                    cost: treatment.cost,
                    status: treatment.status,
                    invoiced: !!treatment.invoice_id,
                    diagnosis: findings,
                    notes: "No notes"
                };

                if (item.status === 'Completed') c.push(item);
                else if (item.status === 'In Progress') i.push(item);
                else p.push(item);
            });
        }
    });

    return { planned: p, inProgress: i, completed: c };
  }, [visits]);

  // API Call
  const handleUpdateStatus = async (visitId, treatmentId, newStatus) => {
    try {
        console.log(`Updating: Visit ${visitId}, Treatment ${treatmentId} -> ${newStatus}`);
        
        // This matches the backend route exactly
        await API.patch(`/visits/${visitId}/treatments/${treatmentId}/status`, { status: newStatus });
        
        setSelectedPlan(null);
        if (onRefresh) onRefresh(); // Reload data
    } catch (err) {
        console.error("Update failed", err);
        alert("Failed to update status. Check console.");
    }
  };

  return (
    <>
      <div className="p-5 bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Planned */}
              <div className="flex flex-col gap-4 bg-[#F9F9F9] p-4 rounded-xl border border-gray-200 transition-all">
                  <h3 className="w-fit px-3 py-1.5 rounded-full font-heading font-semibold text-xs uppercase tracking-wide text-[#8B720D] bg-[#FFFAE4] border border-[#FFCC00]">
                      Planned ({planned.length})
                  </h3>
                  <div className="flex flex-col gap-3 max-h-[600px] overflow-y-auto custom-scrollbar">
                      {planned.map((item, idx) => (
                        <TreatmentCard key={idx} data={item} status="Planned" onClick={setSelectedPlan} />
                      ))}
                      {planned.length === 0 && <p className="text-center text-xs text-gray-400 mt-4">No treatments planned</p>}
                  </div>
              </div>

              {/* In Progress */}
              <div className="flex flex-col gap-4 bg-[#F9FAFB] p-4 rounded-xl border border-gray-200 transition-all">
                  <h3 className="w-fit px-3 py-1.5 rounded-full font-heading font-semibold text-xs uppercase tracking-wide text-[#0C3A99] bg-[#E4EDFF] border border-[#0054FF]">
                      In Progress ({inProgress.length})
                  </h3>
                  <div className="flex flex-col gap-3 max-h-[600px] overflow-y-auto custom-scrollbar">
                       {inProgress.map((item, idx) => (
                         <TreatmentCard key={idx} data={item} status="In Progress" onClick={setSelectedPlan} />
                       ))}
                  </div>
              </div>

              {/* Completed */}
              <div className="flex flex-col gap-4 bg-[#F9FAFB] p-4 rounded-xl border border-gray-200 transition-all">
                  <h3 className="w-fit px-3 py-1.5 rounded-full font-heading font-semibold text-xs uppercase tracking-wide text-[#066C50] bg-[#E7FFF8] border border-[#00D299]">
                      Completed ({completed.length})
                  </h3>
                  <div className="flex flex-col gap-3 max-h-[600px] overflow-y-auto custom-scrollbar">
                       {completed.map((item, idx) => (
                         <TreatmentCard key={idx} data={item} status="Completed" onClick={setSelectedPlan} />
                       ))}
                  </div>
              </div>

          </div>
      </div>

      <TreatmentStatusModal
        isOpen={!!selectedPlan}
        onClose={() => setSelectedPlan(null)}
        treatment={selectedPlan}
        onUpdate={handleUpdateStatus}
        onDelete={handleDelete}
      />
    </>
  );
};

export default TreatmentPlanBoard;