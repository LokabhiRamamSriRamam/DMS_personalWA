import React from 'react';
import { useTreatment } from '../Context/TreatmentContext.jsx';
import TreatmentPage from '../pages/Treatmentpage.jsx'; 
import { Minimize2, Maximize2, X, Activity } from 'lucide-react';

const GlobalTreatmentOverlay = () => {
  const { activeTreatment, minimizeTreatment, maximizeTreatment, closeTreatment } = useTreatment();

  if (!activeTreatment) return null;

  // --- MINIMIZED STATE (Widget) ---
  if (activeTreatment.minimized) {
    return (
      <div className="fixed bottom-6 right-6 z-[200] w-80 bg-white rounded-xl shadow-2xl border border-slate-200 animate-in slide-in-from-bottom-4 fade-in duration-300 overflow-hidden">
        {/* Widget Header */}
        <div className="p-3 bg-slate-900 flex justify-between items-center">
          <div className="flex items-center gap-2">
             <div className="relative">
                <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></div>
                <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-green-500 blur-sm"></div>
             </div>
             <span className="text-white font-bold text-xs uppercase tracking-wider">Active Session</span>
          </div>
          <div className="flex gap-1">
             <button onClick={maximizeTreatment} className="p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"><Maximize2 size={14}/></button>
             <button onClick={closeTreatment} className="p-1 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded transition-colors"><X size={14}/></button>
          </div>
        </div>
        
        {/* Widget Body */}
        <div className="p-4 bg-white">
           <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <Activity size={20} />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase">Patient</p>
                <p className="text-sm font-bold text-slate-800">{activeTreatment.patientName || `#${activeTreatment.id.slice(-6)}`}</p>
              </div>
           </div>
           <button 
             onClick={maximizeTreatment} 
             className="w-full py-2.5 bg-[#137fec] text-white text-sm font-bold rounded-lg hover:bg-blue-600 transition-all shadow-md shadow-blue-200"
           >
             Resume Treatment
           </button>
        </div>
      </div>
    );
  }

  // --- MAXIMIZED STATE (Full Screen Overlay) ---
  return (
    <div className="fixed inset-0 z-[100] bg-[#EBF2F7] overflow-auto animate-in fade-in slide-in-from-bottom-4 duration-200">
        
        {/* Floating Controls for Overlay */}
        <div className="fixed top-4 right-4 z-[101] flex gap-2">
            <button 
                onClick={minimizeTreatment} 
                className="p-3 bg-white rounded-full shadow-lg text-slate-600 hover:text-[#137fec] hover:scale-105 transition-all border border-slate-100" 
                title="Minimize Window"
            >
                <Minimize2 size={24} />
            </button>
            <button 
                onClick={closeTreatment} 
                className="p-3 bg-white rounded-full shadow-lg text-slate-600 hover:text-red-500 hover:scale-105 transition-all border border-slate-100" 
                title="Close Session"
            >
                <X size={24} />
            </button>
        </div>

        {/* Render Treatment Page with forced ID */}
        <div className="pt-2"> {/* Tiny padding to ensure content doesn't clip under header if any */}
            <TreatmentPage patientIdProp={activeTreatment.id} isOverlay={true} />
        </div>
    </div>
  );
};

export default GlobalTreatmentOverlay;