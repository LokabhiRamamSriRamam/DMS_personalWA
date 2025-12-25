import React, { useState } from 'react';
import { Info } from 'lucide-react';

// --- Sub-Component: Dental Chart ---
const DentalChart = () => {
  const [dentition, setDentition] = useState('Adult');
  const [multiSelect, setMultiSelect] = useState(false);
  const [selectedTeeth, setSelectedTeeth] = useState([]);

  // --- Configuration Arrays ---
  const teethConfig = {
    Adult: {
      upper: [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28],
      lower: [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38]
    },
    Pedo: {
      upper: [55, 54, 53, 52, 51, 61, 62, 63, 64, 65],
      lower: [85, 84, 83, 82, 81, 71, 72, 73, 74, 75]
    },
    Mixed: {
      upper: [16, 55, 54, 53, 12, 11, 21, 22, 63, 64, 65, 26],
      lower: [46, 85, 84, 83, 42, 41, 31, 32, 73, 74, 75, 36]
    }
  };

  // --- Image Source Logic ---
  const getImageSrc = (currentMode, toothId) => {
    let folder = currentMode;
    if (currentMode === 'Mixed') {
      folder = toothId >= 50 ? 'Pedo' : 'Adult';
    }

    let fileId = toothId;
    if (folder === 'Pedo') {
      const pedoMapping = {
        55: 15, 54: 15, 64: 15, 65: 15,
        51: 52, 61: 52, 62: 52,
        63: 53,
        75: 85, 74: 85, 84: 85,
        73: 43, 83: 43,
        72: 42, 71: 42, 81: 42, 82: 42
      };
      if (pedoMapping[toothId]) fileId = pedoMapping[toothId];
    }

    return `https://dentobesscdn.b-cdn.net/dental-teeth/${folder}/Teeth${fileId}.svg`;
  };

  const toggleTooth = (id) => {
    if (multiSelect) {
      setSelectedTeeth((prev) =>
        prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
      );
    } else {
      setSelectedTeeth((prev) => (prev.includes(id) ? [] : [id]));
    }
  };

  const renderRow = (teethIds) => (
    <div className="flex gap-1 sm:gap-2 overflow-x-auto pb-4 pt-2 no-scrollbar justify-between">
      {teethIds.map((id) => (
        <div
          key={id}
          className="flex flex-col items-center gap-2 cursor-pointer min-w-[50px] sm:min-w-[60px] group"
          onClick={() => toggleTooth(id)}
        >
          <button 
             type="button"
             className={`w-[50px] sm:w-[60px] md:w-[70px] bg-transparent border-none p-0 cursor-pointer transition-transform duration-300 transform group-hover:scale-110 ${
                selectedTeeth.includes(id) ? 'drop-shadow-lg scale-110' : ''
              }`}
          >
            <img
              src={getImageSrc(dentition, id)}
              alt={`Tooth ${id}`}
              className="w-full h-auto object-contain"
              loading="lazy"
            />
          </button>
          <span
            className={`
            font-[Montserrat] font-medium text-[12px] sm:text-[14px] md:text-[16px] 
            h-[24px] w-[24px] sm:h-[28px] sm:w-[28px] 
            flex items-center justify-center rounded-full transition-colors duration-300 mt-2 sm:mt-4
            ${
              selectedTeeth.includes(id)
                ? 'bg-[#137fec] text-white shadow-md' // Updated to Blue
                : 'text-[#1D2D39] bg-transparent group-hover:bg-gray-100'
            }
          `}
          >
            {id}
          </span>
        </div>
      ))}
    </div>
  );

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-col gap-4 sm:gap-6 md:gap-8 mb-4 sm:mb-6 md:mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
          <div className="flex gap-1.5 sm:gap-2 items-center bg-[#F8F9FA] p-1 sm:p-1.5 rounded-[6px] sm:rounded-[8px] w-full sm:w-auto">
            {['Adult', 'Pedo', 'Mixed'].map((type) => (
              <button
                key={type}
                onClick={() => setDentition(type)}
                className={`py-1.5 sm:py-2 px-2 sm:px-3 font-medium text-[12px] sm:text-[14px] md:text-[16px] text-center cursor-pointer transform transition-all duration-300 rounded-[4px] sm:rounded-[6px] flex-1 sm:flex-none ${
                  dentition === type
                    ? 'text-white bg-[#137fec] shadow-sm' // Updated to Blue
                    : 'text-[#85969F] bg-transparent hover:bg-white'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
             <span className="font-medium text-[13px] sm:text-[14px] md:text-[16px] text-[#1D2D39]">Multi select</span>
             <button 
                onClick={() => setMultiSelect(!multiSelect)}
                className={`relative inline-flex items-center cursor-pointer w-11 h-6 rounded-full transition-colors duration-300 ${multiSelect ? 'bg-[#137fec]' : 'bg-gray-200'}`} // Updated to Blue
             >
                <span className={`absolute top-[2px] left-[2px] bg-white border border-gray-300 rounded-full h-5 w-5 transition-transform duration-300 ${multiSelect ? 'translate-x-full border-white' : ''}`}></span>
             </button>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {renderRow(teethConfig[dentition].upper)}
        {renderRow(teethConfig[dentition].lower)}
      </div>
      <div className="flex flex-wrap gap-4 items-center mt-6 pt-4 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#E3AAFF]"></div>
          <span className="font-[Montserrat] font-normal text-[14px] text-[#1D2D39]">Treatment Taken Before</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#AAAAAA]"></div>
          <span className="font-[Montserrat] font-normal text-[14px] text-[#1D2D39]">Teeth Removed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#F1F95B]"></div>
          <span className="font-[Montserrat] font-normal text-[14px] text-[#1D2D39]">Recommended To Take Treatment</span>
        </div>
      </div>
    </div>
  );
};

// --- Sub-Component: Soft Tissue View ---
const SoftTissueView = () => {
  const [multiSelect, setMultiSelect] = useState(false);
  const [selectedTissues, setSelectedTissues] = useState([]);

  const tissues = [
    { label: 'Buccal Mucosa', img: 'Buccal Mucosa.svg' },
    { label: 'Floor of the Mouth', img: 'Floor of the mouth.svg' },
    { label: 'Frenum', img: 'Frenum.svg' },
    { label: 'Gingiva', img: 'Gingiva.svg' },
    { label: 'Labial Mucosa', img: 'Labial mucosa.svg' },
    { label: 'Palate', img: 'Palate.svg' },
    { label: 'Salivary Glands', img: 'Salivary glands.svg' },
    { label: 'Tongue', img: 'Tongue.svg' },
  ];

  const toggleTissue = (label) => {
    if (multiSelect) {
      setSelectedTissues((prev) =>
        prev.includes(label) ? prev.filter((t) => t !== label) : [...prev, label]
      );
    } else {
      setSelectedTissues((prev) => (prev.includes(label) ? [] : [label]));
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Controls Header */}
      <div className="flex flex-col gap-4 sm:gap-6 md:gap-8 mb-4 sm:mb-6 md:mb-8">
        <div className="flex justify-end items-center">
          <div className="flex items-center gap-2">
            <span className="font-medium text-[13px] sm:text-[14px] md:text-[16px] text-[#1D2D39]">
              Multi select
            </span>
            <button
              onClick={() => setMultiSelect(!multiSelect)}
              className={`relative inline-flex items-center cursor-pointer w-11 h-6 rounded-full transition-colors duration-300 ${
                multiSelect ? 'bg-[#137fec]' : 'bg-gray-200' // Updated to Blue
              }`}
            >
              <span
                className={`absolute top-[2px] left-[2px] bg-white border border-gray-300 rounded-full h-5 w-5 transition-transform duration-300 ${
                  multiSelect ? 'translate-x-full border-white' : ''
                }`}
              ></span>
            </button>
          </div>
        </div>
      </div>

      {/* Tissues Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-5 md:gap-6 lg:gap-8">
        {tissues.map((item) => (
          <div
            key={item.label}
            onClick={() => toggleTissue(item.label)}
            className={`
              relative flex flex-col items-center gap-3 sm:gap-4 p-4 sm:p-5 md:p-6 
              bg-white rounded-[12px] sm:rounded-[16px] border-2 transition-all cursor-pointer group 
              ${selectedTissues.includes(item.label) 
                ? 'border-[#137fec] bg-blue-50' // Updated to Blue and Light Blue BG
                : 'border-[#E9ECEF] hover:border-[#137fec] hover:bg-blue-50'} // Updated Hover
            `}
          >
            <div className="w-full h-[78px] relative flex items-center justify-center rounded-[10px] overflow-hidden transition-all">
              <div className="relative w-[140px] h-[76px]">
                <img
                  alt={item.label}
                  loading="lazy"
                  className="object-contain w-full h-full transform transition-transform duration-300 group-hover:scale-105"
                  src={`https://dentobesscdn.b-cdn.net/soft-tissues/${item.img}`}
                />
              </div>
            </div>
            <p className={`
              font-[Montserrat] font-semibold text-[14px] sm:text-[16px] md:text-[18px] text-center w-full transition-all 
              ${selectedTissues.includes(item.label) ? 'text-[#137fec]' : 'text-[#1D2D39] group-hover:text-[#137fec]'}
            `}>
              {item.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- Sub-Component: TMJ View ---
const TMJView = () => {
  const tmjOptions = [
    { label: 'Left TMJ', img: 'Left TMJ.svg' },
    { label: 'Right TMJ', img: 'Right TMJ.svg' },
    { label: 'Both TMJ', img: 'Both TMJ.svg' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {tmjOptions.map((item) => (
        <div
          key={item.label}
          className="group cursor-pointer flex flex-col items-center gap-3 p-4 bg-white rounded-2xl border-2 border-gray-200 hover:border-[#137fec] hover:bg-blue-50 transition-all duration-300"
        >
          <div className="h-[100px] w-full flex items-center justify-center rounded-lg overflow-hidden">
            <img
              src={`https://dentobesscdn.b-cdn.net/TMJ/${item.img}`}
              alt={item.label}
              className="w-full h-full object-contain transform group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          </div>
          <p className="font-semibold text-gray-700 group-hover:text-[#137fec] transition-colors">
            {item.label}
          </p>
        </div>
      ))}
    </div>
  );
};

// --- Main Component ---
const TreatmentTabs = () => {
  const [activeTab, setActiveTab] = useState('Dental Chart');

  return (
    <div className="p-4 sm:p-6 bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
      {/* Tabs Header */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6">
        <h3 className="font-semibold text-lg text-gray-800 self-start md:self-auto">
          Dental Chart & Treatment Plans
        </h3>
        <div className="flex bg-gray-100 rounded-xl p-1 gap-2 mt-4 md:mt-0 w-full md:w-auto overflow-x-auto">
          {['Dental Chart', 'Soft Tissue', 'TMJ'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all duration-300 flex-1 md:flex-none ${
                activeTab === tab
                  ? 'bg-[#137fec] text-white shadow-sm' // Updated to Blue
                  : 'text-gray-600 hover:bg-white hover:text-[#137fec]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-[300px]">
        {activeTab === 'Dental Chart' && <DentalChart />}
        {activeTab === 'Soft Tissue' && <SoftTissueView />}
        {activeTab === 'TMJ' && <TMJView />}
      </div>
    </div>
  );
};

export default TreatmentTabs;