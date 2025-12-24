import React from 'react';
import { Trash2, Check, ArrowRight, FileText, Plus, Minus, Calendar } from 'lucide-react';

// --- New Component: Surface Graphic (The SVG you provided) ---
const ToothSurfaceGraphic = () => (
  <div className="w-fit h-fit overflow-hidden">
    <div className="scale-[0.45] sm:scale-[0.5] md:scale-[0.5] lg:scale-[0.55] xl:scale-[0.6] origin-left xl:origin-center -m-[25%] sm:-m-[22%] md:-m-[22%] lg:-m-[20%] xl:-m-[18%]">
      <div>
        {/* SVG 1: Horizontal Bar */}
        <svg width="50" height="30" viewBox="0 0 30 22" fill="none" xmlns="http://www.w3.org/2000/svg">
          <mask id="path-1-inside-1_629_32624" fill="white">
            <path d="M33.2858 16.2859C33.2858 11.9666 31.5699 7.82425 28.5157 4.77004C25.4615 1.71584 21.3191 3.26098e-07 16.9998 0C12.6805 -3.26098e-07 8.53812 1.71584 5.48391 4.77004C2.42971 7.82425 0.713868 11.9666 0.713867 16.2859H9.03956C9.03956 14.1748 9.87823 12.15 11.3711 10.6572C12.8639 9.16436 14.8886 8.32569 16.9998 8.32569C19.111 8.32569 21.1357 9.16436 22.6286 10.6572C24.1214 12.15 24.9601 14.1748 24.9601 16.2859H33.2858Z"></path>
          </mask>
          <path d="M33.2858 16.2859C33.2858 11.9666 31.5699 7.82425 28.5157 4.77004C25.4615 1.71584 21.3191 3.26098e-07 16.9998 0C12.6805 -3.26098e-07 8.53812 1.71584 5.48391 4.77004C2.42971 7.82425 0.713868 11.9666 0.713867 16.2859H9.03956C9.03956 14.1748 9.87823 12.15 11.3711 10.6572C12.8639 9.16436 14.8886 8.32569 16.9998 8.32569C19.111 8.32569 21.1357 9.16436 22.6286 10.6572C24.1214 12.15 24.9601 14.1748 24.9601 16.2859H33.2858Z" fill="#00D299" stroke="#85969F" strokeWidth="2" mask="url(#path-1-inside-1_629_32624)"></path>
        </svg>
        
        {/* SVG 2: Quadrant Circle */}
        <svg width="60" height="60" viewBox="0 0 100 100" className="cursor-pointer">
          <circle cx="50" cy="50" r="45" fill="lightgray" stroke="gray" strokeWidth="2"></circle>
          <path d="M50,50 L50,5 A45,45 0 0,1 95,50 Z" fill="#00D299" stroke="gray" strokeWidth="2"></path>
          <path d="M50,50 L95,50 A45,45 0 0,1 50,95 Z" fill="white" stroke="gray" strokeWidth="2"></path>
          <path d="M50,50 L50,95 A45,45 0 0,1 5,50 Z" fill="white" stroke="gray" strokeWidth="2"></path>
          <path d="M50,50 L5,50 A45,45 0 0,1 50,5 Z" fill="#00D299" stroke="gray" strokeWidth="2"></path>
          <circle cx="50" cy="50" r="20" fill="white" stroke="gray" strokeWidth="2"></circle>
        </svg>
      </div>
    </div>
  </div>
);

const TreatmentCard = ({ data, status }) => {
  return (
    <div className="p-3 sm:p-4 bg-white border border-[#DCE5EE] rounded-xl shadow-sm flex flex-col gap-4 relative animate-in fade-in slide-in-from-bottom-4 duration-300">
      
      {/* --- Date Header --- */}
      <div className="flex justify-between items-start">
        <p className="text-xs sm:text-sm text-gray-500">{data.date}</p>
        {status === 'progress' && (
          <p className="text-xs sm:text-sm text-gray-500 text-right flex items-center gap-1 justify-end">
             <Calendar size={14} /> {data.startDate}
          </p>
        )}
      </div>

      {/* --- Teeth & Diagnosis Section --- */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* Teeth Image/Number + Surface Graphic */}
        <div className="flex flex-col gap-2 sm:col-span-2">
          <p className="font-[Montserrat] text-xs text-gray-400 capitalize">Teeth</p>
          <div className="flex items-start gap-2 flex-wrap">
            {data.teeth.map((tooth, idx) => (
               <div key={idx} className="flex flex-col xl:flex-row gap-1 xl:items-center">
                 <div className="flex items-center gap-1.5">
                   {/* Tooth Icon/Image */}
                   {tooth.img && (
                     <img 
                      src={tooth.img} 
                      alt="Tooth" 
                      className="w-5 h-5 sm:w-6 sm:h-6 object-contain"
                     />
                   )}
                   <p className="font-[Montserrat] font-medium text-lg text-[#1D2D39]">{tooth.number}</p>
                 </div>

                 {/* Insert the Surface Graphic Here if needed */}
                 {tooth.showSurface && <ToothSurfaceGraphic />}
               </div>
            ))}
          </div>
        </div>

        {/* Diagnosis */}
        <div className="flex flex-col gap-2">
          <p className="font-[Montserrat] text-xs text-gray-400 capitalize">Diagnosis</p>
          <p className="font-[Montserrat] font-medium text-sm text-[#1D2D39] leading-tight">
            {data.diagnosis}
          </p>
        </div>
      </div>

      {/* --- Treatment & Quantity Section --- */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="flex flex-col gap-2 sm:col-span-2">
           <p className="font-[Montserrat] text-xs text-gray-400 capitalize">Treatment Name</p>
           <p className="font-[Montserrat] text-sm text-[#1D2D39] uppercase">{data.treatment}</p>
        </div>

        <div className="flex flex-col gap-2">
            <p className="font-[Montserrat] text-xs text-gray-400 capitalize">Qty</p>
            <div className="flex items-center w-fit">
                <button disabled={status !== 'planned'} className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-l-md hover:bg-gray-50 disabled:opacity-50 text-gray-600 transition-colors">
                    <Minus size={14} />
                </button>
                <span className="h-8 px-3 min-w-[40px] flex items-center justify-center text-sm font-medium bg-[#F7F2F2] text-[#1D2D39]">
                    {data.qty}
                </span>
                <button disabled={status !== 'planned'} className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-r-md hover:bg-gray-50 disabled:opacity-50 text-gray-600 transition-colors">
                    <Plus size={14} />
                </button>
            </div>
        </div>
      </div>

      {/* --- Pricing & Doctor Section --- */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-4 border-b border-gray-200">
        <div className="flex flex-col gap-2">
            <p className="font-[Montserrat] text-xs text-gray-400 capitalize">Item Price</p>
            <div className={`
                font-[Montserrat] text-sm text-[#1D2D39] bg-[#F7F2F2] px-3 py-2 rounded-md w-fit flex items-center gap-2
                ${status === 'completed' ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer hover:bg-green-50'}
            `}>
                <span>₹{data.price}</span>
            </div>
        </div>
        
        <div className="flex flex-col gap-2">
            <p className="font-[Montserrat] text-xs text-gray-400 capitalize">Total</p>
            <p className="font-[Montserrat] text-sm text-[#1D2D39]">₹{data.total}</p>
        </div>

        <div className="flex flex-col gap-2">
            <p className="font-[Montserrat] text-xs text-gray-400 capitalize">Doctor</p>
            <p className="font-[Montserrat] text-sm text-[#1D2D39] capitalize">{data.doctor}</p>
        </div>
      </div>

      {/* --- Action Buttons --- */}
      <div>
            <div className="flex flex-col sm:flex-row gap-3">
                {status === 'planned' && (
                    <>
                        {/* Green Hover Effect */}
                        <button className="flex-1 h-11 flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 font-semibold text-sm rounded-lg transition-colors hover:bg-emerald-50 hover:border-emerald-500 hover:text-emerald-700">
                            <Check size={18} className="text-emerald-500" />
                            <span>Mark as completed</span>
                        </button>
                        
                        {/* Blue Hover Effect */}
                        <button className="flex-1 h-11 flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 font-semibold text-sm rounded-lg transition-colors hover:bg-blue-50 hover:border-blue-500 hover:text-blue-700">
                            <ArrowRight size={18} className="text-blue-600" />
                            <span>Move to in process</span>
                        </button>
                    </>
                )}

                {status === 'progress' && (
                    <>
                        {/* Grey Hover Effect */}
                        <button className="flex-1 h-11 flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 font-semibold text-sm rounded-lg transition-colors hover:bg-gray-100 hover:border-gray-600 hover:text-gray-900">
                            <FileText size={18} />
                            <span>Add Notes</span>
                        </button>

                        {/* Green Hover Effect */}
                        <button className="flex-1 h-11 flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 font-semibold text-sm rounded-lg transition-colors hover:bg-emerald-50 hover:border-emerald-500 hover:text-emerald-700">
                            <Check size={18} className="text-emerald-500" />
                            <span>Mark as completed</span>
                        </button>
                    </>
                )}
            </div>
        </div>

      {/* --- Delete Button (Bottom) --- */}
      <div className="pt-3 border-t border-gray-200">
        <button className="w-full h-11 flex items-center justify-center gap-2 bg-white border border-red-500 text-red-500 font-semibold text-sm rounded-lg hover:bg-red-50 transition-colors">
            <Trash2 size={18} />
            <span>Delete Treatment</span>
        </button>
      </div>

    </div>
  );
};

const TreatmentPlanBoard = () => {
  // Mock Data
  const plannedTreatments = [
    {
        date: "23 Dec 2025",
        teeth: [{ number: "55", img: "https://dentobesscdn.b-cdn.net/dental-teeth/Pedo/Teeth15.svg", showSurface: true }],
        diagnosis: "Reversible pulpitis",
        treatment: "CD INSERTION",
        qty: 1,
        price: 0,
        total: 0,
        doctor: "yashit gupta"
    }
  ];

  const inProgressTreatments = [
    {
        date: "23 Dec 2025",
        startDate: "23 Dec 2025",
        teeth: [{ number: "73", img: "https://dentobesscdn.b-cdn.net/dental-teeth/Pedo/Teeth43.svg", showSurface: true }],
        diagnosis: "Reversible pulpitis",
        treatment: "APEXIFICATION",
        qty: 1,
        price: 3000,
        total: 3000,
        doctor: "yashit gupta"
    }
  ];

  const completedTreatments = [
    {
        date: "23 Dec 2025",
        teeth: [{ number: "T - 22, 63", img: null, showSurface: false }],
        diagnosis: "Gingivitis",
        treatment: "COMPOSITE FILLING - POSTERIOR",
        qty: 2,
        price: 800,
        total: 1600,
        doctor: "yashit gupta"
    }
  ];

  return (
    <div className="p-5 bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Column 1: Planned (Yellow Theme) */}
            <div className="flex flex-col gap-4 bg-[#F9F9F9] p-4 rounded-xl border border-gray-200 transition-all">
                <h3 className="w-fit px-3 py-1.5 rounded-full font-heading font-semibold text-base text-[#8B720D] bg-[#FFFAE4] border border-[#FFCC00]">
                    Treatment Plans
                </h3>
                <div className="flex flex-col gap-4 max-h-[1300px] overflow-y-auto no-scrollbar">
                    {plannedTreatments.map((item, i) => (
                        <TreatmentCard key={i} data={item} status="planned" />
                    ))}
                    {plannedTreatments.length === 0 && <p className="text-center text-gray-400 mt-10">No pending treatments</p>}
                </div>
            </div>

            {/* Column 2: In Progress (Blue Theme) */}
            <div className="flex flex-col gap-4 bg-[#F9FAFB] p-4 rounded-xl border border-gray-200 transition-all">
                <h3 className="w-fit px-3 py-1.5 rounded-full font-heading font-semibold text-base text-[#0C3A99] bg-[#E4EDFF] border border-[#0054FF]">
                    In Progress
                </h3>
                <div className="flex flex-col gap-4 max-h-[1300px] overflow-y-auto no-scrollbar">
                     {inProgressTreatments.map((item, i) => (
                        <TreatmentCard key={i} data={item} status="progress" />
                    ))}
                    {inProgressTreatments.length === 0 && <p className="text-center text-gray-400 mt-10">No treatments in progress</p>}
                </div>
            </div>

            {/* Column 3: Completed (Green Theme) */}
            <div className="flex flex-col gap-4 bg-[#F9FAFB] p-4 rounded-xl border border-gray-200 transition-all">
                <h3 className="w-fit px-3 py-1.5 rounded-full font-heading font-semibold text-base text-[#066C50] bg-[#E7FFF8] border border-[#00D299]">
                    Completed
                </h3>
                <div className="flex flex-col gap-4 max-h-[1300px] overflow-y-auto no-scrollbar">
                     {completedTreatments.map((item, i) => (
                        <TreatmentCard key={i} data={item} status="completed" />
                    ))}
                    {completedTreatments.length === 0 && <p className="text-center text-gray-400 mt-10">No completed treatments</p>}
                </div>
            </div>

        </div>
    </div>
  );
};

export default TreatmentPlanBoard;