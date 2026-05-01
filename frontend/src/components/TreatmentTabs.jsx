import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Info, Plus, Check, MoreVertical, AlertCircle } from 'lucide-react';
import AddTreatmentModal from '../modals/AddTreatmentModal.jsx';
import { useParams } from 'react-router-dom';
import API from '../services/api';

// --- HELPER: Get Status Color ---
const getStatusColor = (statusList) => {
  if (statusList.includes('In Progress')) return 'bg-[#137fec]'; 
  if (statusList.includes('Planned')) return 'bg-[#F1F95B]';     
  if (statusList.includes('Completed')) return 'bg-[#E3AAFF]';   
  if (statusList.includes('Missing')) return 'bg-[#AAAAAA]';     
  return 'bg-gray-100'; 
};

// --- HELPER: Common Status Logic ---
const useStatusMap = (visits, activeTab) => {
    return useMemo(() => {
        const map = {}; 
        visits.forEach(visit => {
            // Check Findings (Soft Tissue / TMJ)
            if (visit.findings) {
                if(activeTab === 'Soft Tissue' && visit.findings.soft_tissue) {
                    visit.findings.soft_tissue.forEach(item => {
                        if (!map[item]) map[item] = [];
                        if (!map[item].includes('Planned')) map[item].push('Planned'); // Default finding = Planned/Recommended
                    });
                }
                if(activeTab === 'TMJ' && visit.findings.tmj) {
                    visit.findings.tmj.forEach(item => {
                        if (!map[item]) map[item] = [];
                        if (!map[item].includes('Planned')) map[item].push('Planned');
                    });
                }
            }

            // Check Treatments (Teeth mainly, but can be adapted)
            if (visit.treatments) {
                visit.treatments.forEach(t => {
                    t.teeth_numbers.forEach(tooth => {
                        if (!map[tooth]) map[tooth] = [];
                        if (t.treatment_name === 'Missing' || t.treatment_name === 'Extraction') {
                            if (!map[tooth].includes('Missing')) map[tooth].push('Missing');
                        } else {
                            if (!map[tooth].includes(t.status)) map[tooth].push(t.status);
                        }
                    });
                });
            }
        });
        return map;
    }, [visits, activeTab]);
};


// --- Sub-Component: Dental Chart ---
const DentalChart = ({ selectedItems, onSelectionChange, dentition, setDentition, visits = [], onContextMenuAction }) => {
  const [contextMenu, setContextMenu] = useState(null); 
  const menuRef = useRef(null);
  
  // Use the Hook for Logic
  const statusMap = useStatusMap(visits, 'Dental Chart');

  useEffect(() => {
    const handleClick = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setContextMenu(null); };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const teethConfig = {
    Adult: { upper: [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28], lower: [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38] },
    Pedo: { upper: [55, 54, 53, 52, 51, 61, 62, 63, 64, 65], lower: [85, 84, 83, 82, 81, 71, 72, 73, 74, 75] },
    Mixed: { upper: [16, 55, 54, 53, 12, 11, 21, 22, 63, 64, 65, 26], lower: [46, 85, 84, 83, 42, 41, 31, 32, 73, 74, 75, 36] }
  };

  const getImageSrc = (currentMode, toothId) => {
    let folder = currentMode;
    if (currentMode === 'Mixed') folder = toothId >= 50 ? 'Pedo' : 'Adult';
    let fileId = toothId;
    if (folder === 'Pedo') {
      const pedoMapping = { 55: 15, 54: 15, 64: 15, 65: 15, 51: 52, 61: 52, 62: 52, 63: 53, 75: 85, 74: 85, 84: 85, 73: 43, 83: 43, 72: 42, 71: 42, 81: 42, 82: 42 };
      if (pedoMapping[toothId]) fileId = pedoMapping[toothId];
    }
    return `https://dentobesscdn.b-cdn.net/dental-teeth/${folder}/Teeth${fileId}.svg`;
  };

  const handleRightClick = (e, id) => { e.preventDefault(); setContextMenu({ x: e.pageX, y: e.pageY, toothId: id }); };

  const renderRow = (teethIds) => (
    <div className="flex gap-1 sm:gap-2 overflow-x-auto pb-4 pt-2 no-scrollbar justify-between">
      {teethIds.map((id) => {
        const statuses = statusMap[id] || [];
        const isSelected = selectedItems.includes(id);
        const isMissing = statuses.includes('Missing');
        
        return (
          <div key={id} className="flex flex-col items-center gap-2 cursor-pointer min-w-[50px] sm:min-w-[60px] group relative" onClick={() => onSelectionChange(id)} onContextMenu={(e) => handleRightClick(e, id)}>
            <button type="button" className={`w-[50px] sm:w-[60px] md:w-[70px] bg-transparent border-none p-0 cursor-pointer transition-transform duration-300 transform group-hover:scale-110 ${isSelected ? 'drop-shadow-lg scale-110' : ''}`}>
              <img src={getImageSrc(dentition, id)} alt={`Tooth ${id}`} className="w-full h-auto object-contain transition-opacity duration-300" loading="lazy" style={{ opacity: isMissing ? 0.3 : 1 }} />
            </button>
            <span className={`font-[Montserrat] font-medium text-[12px] sm:text-[14px] md:text-[16px] h-[24px] w-[24px] sm:h-[28px] sm:w-[28px] flex items-center justify-center rounded-full transition-colors duration-300 mt-2 sm:mt-4 ${isSelected ? 'bg-[#137fec] text-white shadow-md' : statuses.length > 0 ? `${getStatusColor(statuses)} text-[#1D2D39] shadow-sm` : 'text-[#1D2D39] bg-transparent group-hover:bg-gray-100'}`}>
              {id}
            </span>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-500 relative">
      <div className="flex flex-col gap-4 mb-4">
        <div className="flex gap-1.5 sm:gap-2 items-center bg-[#F8F9FA] p-1 sm:p-1.5 rounded-[6px] w-fit">
          {['Adult', 'Pedo', 'Mixed'].map((type) => (
            <button key={type} onClick={() => setDentition(type)} className={`py-1.5 sm:py-2 px-3 font-medium text-sm rounded-[4px] ${dentition === type ? 'text-white bg-[#137fec] shadow-sm' : 'text-[#85969F] bg-transparent hover:bg-white'}`}>{type}</button>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {renderRow(teethConfig[dentition].upper)}
        {renderRow(teethConfig[dentition].lower)}
      </div>
      
      {/* Legend */}
      <div className="flex flex-wrap gap-4 items-center mt-6 pt-4 border-t border-gray-100">
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#E3AAFF]"></div><span className="text-sm text-[#1D2D39]">Treatment Taken</span></div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#AAAAAA]"></div><span className="text-sm text-[#1D2D39]">Missing</span></div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#F1F95B]"></div><span className="text-sm text-[#1D2D39]">Recommended</span></div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#137fec]"></div><span className="text-sm text-[#1D2D39]">In Progress</span></div>
      </div>

      {contextMenu && (
        <div ref={menuRef} className="fixed bg-white rounded-lg shadow-xl border border-gray-100 py-1 z-[100] w-48" style={{ top: contextMenu.y, left: contextMenu.x }}>
            <div className="px-3 py-2 border-b border-gray-100 text-xs font-bold text-gray-400 uppercase">Tooth {contextMenu.toothId}</div>
            <button onClick={() => onContextMenuAction(contextMenu.toothId, 'Planned', 'Recommended')} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-yellow-50 hover:text-yellow-700 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#F1F95B]"></div> Recommended
            </button>
            <button onClick={() => onContextMenuAction(contextMenu.toothId, 'DirectMissing', 'Missing')} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#AAAAAA]"></div> Mark Missing
            </button>
        </div>
      )}
    </div>
  );
};

// --- Sub-Component: Soft Tissue View ---
const SoftTissueView = ({ selectedItems, onSelectionChange, visits = [], onContextMenuAction }) => {
  const [contextMenu, setContextMenu] = useState(null);
  const menuRef = useRef(null);
  
  // Use Hook
  const statusMap = useStatusMap(visits, 'Soft Tissue');

  useEffect(() => {
    const handleClick = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setContextMenu(null); };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const tissues = [
    { label: 'Buccal Mucosa', img: 'Buccal Mucosa.svg' }, { label: 'Floor of the Mouth', img: 'Floor of the mouth.svg' },
    { label: 'Frenum', img: 'Frenum.svg' }, { label: 'Gingiva', img: 'Gingiva.svg' },
    { label: 'Labial Mucosa', img: 'Labial mucosa.svg' }, { label: 'Palate', img: 'Palate.svg' },
    { label: 'Salivary Glands', img: 'Salivary glands.svg' }, { label: 'Tongue', img: 'Tongue.svg' },
  ];

  const handleRightClick = (e, label) => { e.preventDefault(); setContextMenu({ x: e.pageX, y: e.pageY, label: label }); };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-500 relative">
      {tissues.map((item) => {
        const statuses = statusMap[item.label] || [];
        const isSelected = selectedItems.includes(item.label);
        
        return (
            <div 
            key={item.label} 
            onClick={() => onSelectionChange(item.label)} 
            onContextMenu={(e) => handleRightClick(e, item.label)}
            className={`relative flex flex-col items-center gap-4 p-4 rounded-2xl border-2 transition-all cursor-pointer group 
                ${isSelected ? 'border-[#137fec] bg-blue-50' : 'border-[#E9ECEF] hover:border-[#137fec] hover:bg-blue-50'}
                ${statuses.length > 0 ? 'border-l-4 border-l-yellow-400' : ''} 
            `}
            >
            <div className="w-full h-[80px] flex items-center justify-center">
                <img alt={item.label} className="object-contain w-full h-full transform transition-transform duration-300 group-hover:scale-105" src={`https://dentobesscdn.b-cdn.net/soft-tissues/${item.img}`} loading="lazy" />
            </div>
            <p className={`font-semibold text-sm text-center ${selectedItems.includes(item.label) ? 'text-[#137fec]' : 'text-[#1D2D39] group-hover:text-[#137fec]'}`}>{item.label}</p>
            
            {/* Status Indicators */}
            <div className="absolute top-2 right-2 flex gap-1">
                {isSelected && <div className="bg-[#137fec] text-white rounded-full p-1 shadow-sm"><Check size={12} strokeWidth={3} /></div>}
                {statuses.includes('Planned') && <div className="bg-[#F1F95B] w-4 h-4 rounded-full shadow-sm border border-yellow-200"></div>}
            </div>
            </div>
        );
      })}

      {contextMenu && (
        <div ref={menuRef} className="fixed bg-white rounded-lg shadow-xl border border-gray-100 py-1 z-[100] w-48" style={{ top: contextMenu.y, left: contextMenu.x }}>
            <div className="px-3 py-2 border-b border-gray-100 text-xs font-bold text-gray-400 uppercase">{contextMenu.label}</div>
            <button onClick={() => onContextMenuAction(contextMenu.label, 'Planned', 'Recommended')} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-yellow-50 hover:text-yellow-700 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#F1F95B]"></div> Recommended
            </button>
        </div>
      )}
    </div>
  );
};

// --- Sub-Component: TMJ View ---
const TMJView = ({ selectedItems, onSelectionChange, visits = [], onContextMenuAction }) => {
  const [contextMenu, setContextMenu] = useState(null);
  const menuRef = useRef(null);
  
  // Use Hook
  const statusMap = useStatusMap(visits, 'TMJ');

  useEffect(() => {
    const handleClick = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setContextMenu(null); };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const tmjOptions = [ { label: 'Left TMJ', img: 'Left TMJ.svg' }, { label: 'Right TMJ', img: 'Right TMJ.svg' }, { label: 'Both TMJ', img: 'Both TMJ.svg' } ];

  const handleRightClick = (e, label) => { e.preventDefault(); setContextMenu({ x: e.pageX, y: e.pageY, label: label }); };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-500 relative">
      {tmjOptions.map((item) => {
        const statuses = statusMap[item.label] || [];
        const isSelected = selectedItems.includes(item.label);

        return (
            <div key={item.label} onClick={() => onSelectionChange(item.label)} onContextMenu={(e) => handleRightClick(e, item.label)} 
                className={`group cursor-pointer flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all duration-300 relative
                ${isSelected ? 'border-[#137fec] bg-blue-50' : 'border-gray-200 hover:border-[#137fec] hover:bg-blue-50'}
                `}
            >
            <div className="h-[100px] w-full flex items-center justify-center">
                <img src={`https://dentobesscdn.b-cdn.net/TMJ/${item.img}`} alt={item.label} className="w-full h-full object-contain transform group-hover:scale-105 transition-transform duration-300" loading="lazy" />
            </div>
            <p className={`font-semibold text-gray-700 transition-colors ${selectedItems.includes(item.label) ? 'text-[#137fec]' : 'group-hover:text-[#137fec]'}`}>{item.label}</p>
            
            {/* Status Indicators */}
            <div className="absolute top-2 right-2 flex gap-1">
                {statuses.includes('Planned') && <div className="bg-[#F1F95B] w-4 h-4 rounded-full shadow-sm border border-yellow-200"></div>}
            </div>
            </div>
        );
      })}
      
      {contextMenu && (
        <div ref={menuRef} className="fixed bg-white rounded-lg shadow-xl border border-gray-100 py-1 z-[100] w-48" style={{ top: contextMenu.y, left: contextMenu.x }}>
            <div className="px-3 py-2 border-b border-gray-100 text-xs font-bold text-gray-400 uppercase">{contextMenu.label}</div>
            <button onClick={() => onContextMenuAction(contextMenu.label, 'Planned', 'Recommended')} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-yellow-50 hover:text-yellow-700 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#F1F95B]"></div> Recommended
            </button>
        </div>
      )}
    </div>
  );
};

// --- Main Component ---
const TreatmentTabs = ({ onTreatmentAdded, visits = [], patientId }) => {
  const [activeTab, setActiveTab] = useState('Dental Chart');
  
  const [dentalSelections, setDentalSelections] = useState([]);
  const [softTissueSelections, setSoftTissueSelections] = useState([]);
  const [tmjSelections, setTmjSelections] = useState([]);
  const [dentition, setDentition] = useState('Adult');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('Plan'); 
  const [modalTargets, setModalTargets] = useState([]); 

  const toggleSelection = (item, currentSelections, setFunction) => {
    setFunction(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]);
  };

  const currentSelections = 
    activeTab === 'Dental Chart' ? dentalSelections : 
    activeTab === 'Soft Tissue' ? softTissueSelections : tmjSelections;

  // --- Handlers ---

  const handleAddTreatmentClick = () => {
    setModalTargets(currentSelections);
    setModalMode('Plan'); 
    setIsModalOpen(true);
  };

  const handleContextMenuAction = async (targetId, status, label) => {
    if (label === 'Missing') {
        try {
            const payload = {
                patient_id: patientId, 
                date: new Date(),
                treatments: [{
                    teeth_numbers: [targetId], 
                    treatment_name: 'Missing',
                    cost: 0,
                    status: 'Completed', 
                    qty: 1
                }]
            };
            await API.post('/visits', payload);
            if (onTreatmentAdded) onTreatmentAdded();
            setDentalSelections([]);
        } catch (err) {
            alert("Error marking as missing");
        }
    } else if (label === 'Recommended') {
        setModalTargets([targetId]);
        setModalMode('Recommended');
        setIsModalOpen(true);
    }
  };

  const handleSaveTreatment = async (formData) => {
    try {
      if (!patientId) return alert("Error: Patient ID is missing.");
      if (modalTargets.length === 0) return alert("No items selected");

      let selectedTeeth = [], selectedSoftTissues = [], selectedTMJ = [];

      if (activeTab === 'Dental Chart') selectedTeeth = modalTargets;
      else if (activeTab === 'Soft Tissue') selectedSoftTissues = modalTargets;
      else selectedTMJ = modalTargets;

      // Handle multiple treatments with their costs
      const treatments = formData.treatments && formData.treatments.length > 0
        ? formData.treatments.map(t => ({
            teeth_numbers: selectedTeeth,
            surfaces: [],
            treatment_name: t.name,
            cost: Number(t.cost) || 0,
            status: 'Planned',
            qty: 1
          }))
        : [];

      // Handle multiple diagnoses
      const diagnosisNotes = formData.diagnosis && formData.diagnosis.length > 0
        ? formData.diagnosis.map(d => d.name).join(', ')
        : '';

      const payload = {
        patient_id: patientId,
        date: new Date(),
        treatments: treatments,
        findings: {
          diagnosis_notes: diagnosisNotes,
          clinical_findings: formData.clinical_findings && formData.clinical_findings.length > 0
            ? formData.clinical_findings.map(f => f.name)
            : [],
          soft_tissue: selectedSoftTissues,
          tmj: selectedTMJ
        },
        notes: formData.notes || ''
      };

      await API.post('/visits', payload);

      setDentalSelections([]);
      setSoftTissueSelections([]);
      setTmjSelections([]);
      setIsModalOpen(false);
      setModalMode('Plan');

      if (onTreatmentAdded) onTreatmentAdded();

    } catch (err) {
      console.error("Failed to save treatment", err);
      alert("Error saving treatment plan: " + (err.response?.data?.error || err.message));
    }
  };

  return (
    <div className="p-4 sm:p-6 bg-white rounded-xl shadow-sm border border-gray-100 mb-6 relative overflow-hidden">
      
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h3 className="font-semibold text-lg text-gray-800 self-start md:self-auto">Dental Chart & Findings</h3>
        <div className="flex bg-gray-100 rounded-xl p-1 gap-2 w-full md:w-auto overflow-x-auto no-scrollbar">
          {['Dental Chart', 'Soft Tissue', 'TMJ'].map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all duration-300 flex-1 md:flex-none ${activeTab === tab ? 'bg-[#137fec] text-white shadow-sm' : 'text-gray-600 hover:bg-white hover:text-[#137fec]'}`}>{tab}</button>
          ))}
        </div>
      </div>

      <div className="min-h-[300px] pb-16">
        {activeTab === 'Dental Chart' && (
          <DentalChart 
            selectedItems={dentalSelections} 
            onSelectionChange={(id) => toggleSelection(id, dentalSelections, setDentalSelections)} 
            dentition={dentition}
            setDentition={setDentition}
            visits={visits} 
            onContextMenuAction={handleContextMenuAction} 
          />
        )}
        {activeTab === 'Soft Tissue' && (
          <SoftTissueView 
            selectedItems={softTissueSelections} 
            onSelectionChange={(id) => toggleSelection(id, softTissueSelections, setSoftTissueSelections)} 
            visits={visits}
            onContextMenuAction={handleContextMenuAction}
          />
        )}
        {activeTab === 'TMJ' && (
          <TMJView 
            selectedItems={tmjSelections} 
            onSelectionChange={(id) => toggleSelection(id, tmjSelections, setTmjSelections)} 
            visits={visits}
            onContextMenuAction={handleContextMenuAction}
          />
        )}
      </div>

      {currentSelections.length > 0 && (
        <div className="absolute bottom-6 right-6 animate-in slide-in-from-bottom-4 fade-in duration-300 z-10">
          <button 
            onClick={handleAddTreatmentClick}
            className="flex items-center gap-2 bg-[#137fec] text-white px-6 py-3 rounded-full shadow-lg shadow-blue-500/30 hover:bg-blue-600 hover:scale-105 transition-all font-semibold"
          >
            <Plus size={20} strokeWidth={2.5} />
            Add Treatment ({currentSelections.length})
          </button>
        </div>
      )}

      <AddTreatmentModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        selectedTeeth={modalTargets}
        onSave={handleSaveTreatment}
      />

    </div>
  );
};

export default TreatmentTabs;