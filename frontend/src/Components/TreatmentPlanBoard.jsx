import React, { useMemo } from 'react';
import { Trash2, Check, ArrowRight, FileText, Plus, Minus, Calendar } from 'lucide-react';

// Keep your existing ToothSurfaceGraphic component here...
// const ToothSurfaceGraphic = ... 

// --- Treatment Card Component ---
const TreatmentCard = ({ data, status }) => {
  return (
    <div className="p-3 sm:p-4 bg-white border border-[#DCE5EE] rounded-xl shadow-sm flex flex-col gap-4 relative animate-in fade-in slide-in-from-bottom-4 duration-300">
      
      {/* Date Header */}
      <div className="flex justify-between items-start">
        <p className="text-xs sm:text-sm text-gray-500">{data.date}</p>
        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
            status === 'Completed' ? 'bg-green-50 text-green-600 border-green-100' : 
            status === 'In Progress' ? 'bg-blue-50 text-blue-600 border-blue-100' :
            'bg-yellow-50 text-yellow-600 border-yellow-100'
        }`}>
            {status}
        </span>
      </div>

      {/* Teeth & Details */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="flex flex-col gap-2 sm:col-span-2">
          <p className="font-[Montserrat] text-xs text-gray-400 capitalize">Teeth</p>
          <div className="flex items-center gap-2">
             {data.teeth && data.teeth.length > 0 ? (
                 data.teeth.map((t, i) => (
                    <span key={i} className="font-[Montserrat] font-medium text-lg text-[#1D2D39] bg-gray-100 px-2 rounded">
                        {t}
                    </span>
                 ))
             ) : (
                <span className="text-sm text-gray-400">General</span>
             )}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <p className="font-[Montserrat] text-xs text-gray-400 capitalize">Treatment</p>
          <p className="font-[Montserrat] font-medium text-sm text-[#1D2D39] leading-tight">
            {data.treatmentName}
          </p>
        </div>
      </div>

      {/* Pricing */}
      <div className="grid grid-cols-2 gap-4 pb-4 border-b border-gray-200">
        <div className="flex flex-col gap-1">
           <p className="font-[Montserrat] text-xs text-gray-400 capitalize">Cost</p>
           <p className="font-[Montserrat] text-sm text-[#1D2D39]">₹{data.cost}</p>
        </div>
      </div>
      
      {/* Actions (Only show for Planned/Progress) */}
      {status !== 'Completed' && (
          <div className="flex gap-2">
             <button className="flex-1 py-2 flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 font-semibold text-xs rounded-lg hover:bg-emerald-50 hover:border-emerald-500 hover:text-emerald-700 transition-colors">
                <Check size={14} /> Complete
             </button>
             {status === 'Planned' && (
                 <button className="flex-1 py-2 flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 font-semibold text-xs rounded-lg hover:bg-blue-50 hover:border-blue-500 hover:text-blue-700 transition-colors">
                    <ArrowRight size={14} /> Start
                 </button>
             )}
          </div>
      )}
    </div>
  );
};

const TreatmentPlanBoard = ({ visits = [] }) => {
  
  // --- Transform Data: Flatten Visits into Treatments ---
  const { planned, inProgress, completed } = useMemo(() => {
    const p = [], i = [], c = [];

    visits.forEach(visit => {
        const visitDate = new Date(visit.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        
        visit.treatments.forEach(treatment => {
            const item = {
                id: treatment._id,
                date: visitDate,
                treatmentName: treatment.treatment_name,
                teeth: treatment.teeth_numbers,
                cost: treatment.cost,
                status: treatment.status
            };

            if (item.status === 'Completed') c.push(item);
            else if (item.status === 'In Progress') i.push(item);
            else p.push(item); // Default to Planned
        });
    });

    return { planned: p, inProgress: i, completed: c };
  }, [visits]);

  return (
    <div className="p-5 bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Planned */}
            <div className="flex flex-col gap-4 bg-[#F9F9F9] p-4 rounded-xl border border-gray-200 transition-all">
                <h3 className="w-fit px-3 py-1.5 rounded-full font-heading font-semibold text-base text-[#8B720D] bg-[#FFFAE4] border border-[#FFCC00]">
                    Treatment Plans ({planned.length})
                </h3>
                <div className="flex flex-col gap-4 max-h-[800px] overflow-y-auto no-scrollbar">
                    {planned.map((item, idx) => <TreatmentCard key={idx} data={item} status="Planned" />)}
                    {planned.length === 0 && <p className="text-center text-gray-400 mt-10">No pending treatments</p>}
                </div>
            </div>

            {/* In Progress */}
            <div className="flex flex-col gap-4 bg-[#F9FAFB] p-4 rounded-xl border border-gray-200 transition-all">
                <h3 className="w-fit px-3 py-1.5 rounded-full font-heading font-semibold text-base text-[#0C3A99] bg-[#E4EDFF] border border-[#0054FF]">
                    In Progress ({inProgress.length})
                </h3>
                <div className="flex flex-col gap-4 max-h-[800px] overflow-y-auto no-scrollbar">
                     {inProgress.map((item, idx) => <TreatmentCard key={idx} data={item} status="In Progress" />)}
                </div>
            </div>

            {/* Completed */}
            <div className="flex flex-col gap-4 bg-[#F9FAFB] p-4 rounded-xl border border-gray-200 transition-all">
                <h3 className="w-fit px-3 py-1.5 rounded-full font-heading font-semibold text-base text-[#066C50] bg-[#E7FFF8] border border-[#00D299]">
                    Completed ({completed.length})
                </h3>
                <div className="flex flex-col gap-4 max-h-[800px] overflow-y-auto no-scrollbar">
                     {completed.map((item, idx) => <TreatmentCard key={idx} data={item} status="Completed" />)}
                </div>
            </div>

        </div>
    </div>
  );
};

export default TreatmentPlanBoard;