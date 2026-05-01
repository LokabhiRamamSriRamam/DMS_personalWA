import React, { useState } from 'react';
import { Search, Plus, Filter } from 'lucide-react';

// --- IMPORT SUB-COMPONENTS ---
import InventoryStock from '../components/InventoryStocks.jsx';
import InventoryOrders, { CreateOrderModal } from '../components/InventoryOrders.jsx'; 
import InventoryItemList, { AddItemModal } from '../components/InventoryItems.jsx';   
import InventoryLogs, { AddLogModal } from '../components/InventoryLogs.jsx';         
import InventoryVendors, { AddVendorModal } from '../components/InventoryVendors.jsx'; 

// --- SHARED COMPONENTS DEFINED HERE ---

// 1. Status Badge
const StockBadge = ({ status }) => {
  const styles = {
    'Good': 'bg-emerald-100 text-emerald-700 border-emerald-200',
    'Low': 'bg-orange-100 text-orange-700 border-orange-200',
    'Critical': 'bg-red-100 text-red-700 border-red-200',
    'Expiring': 'bg-purple-100 text-purple-700 border-purple-200',
  };
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${styles[status] || 'bg-slate-100'}`}>
      {status}
    </span>
  );
};

// 2. Section Header (for split views)
const SectionHeader = ({ title, icon: Icon, colorClass, count }) => (
  <div className={`flex items-center justify-between p-3 border-b border-slate-200 ${colorClass}`}>
    <div className="flex items-center gap-2">
      <div className="p-1.5 bg-white/60 rounded-lg shadow-sm">
        <Icon size={16} className="text-slate-700" />
      </div>
      <h3 className="font-bold text-slate-800 text-sm">{title}</h3>
    </div>
    <span className="bg-white/50 px-2 py-0.5 rounded text-xs font-semibold text-slate-600">{count} Items</span>
  </div>
);

// --- MAIN PAGE COMPONENT ---

const InventoryPage = () => {
  const [activeTab, setActiveTab] = useState('Stock');
  const [searchQuery, setSearchQuery] = useState('');
  
  // 1. REFRESH TRIGGER STATE
  const [refreshKey, setRefreshKey] = useState(0);

  // Tracks which modal is currently active
  const [activeModal, setActiveModal] = useState(null);

  const closeModal = () => setActiveModal(null);

  // 2. HANDLE SAVE & REFRESH
  // Passed to Modals. When called, it closes modal AND increments key to reload lists
  const handleSave = () => {
    setRefreshKey(prev => prev + 1);
    closeModal();
  };

  const handleAddNew = () => {
    if (activeTab === 'Purchase Orders') setActiveModal('order');
    else if (activeTab === 'ItemList') setActiveModal('item');
    else if (activeTab === 'Logs') setActiveModal('log');
    else if (activeTab === 'Vendors') setActiveModal('vendor');
  };

  const sharedProps = { StockBadge, SectionHeader };

  const TABS = [
    { id: 'Stock', label: 'Stock Overview', component: InventoryStock },
    { id: 'Purchase Orders', label: 'Purchase Orders', component: InventoryOrders },
    { id: 'ItemList', label: 'Item List', component: InventoryItemList },
    { id: 'Logs', label: 'Inventory Logs', component: InventoryLogs },
    { id: 'Vendors', label: 'Vendors', component: InventoryVendors },
  ];

  const ActiveComponent = TABS.find(t => t.id === activeTab)?.component || InventoryStock;

  return (
    <div className="flex flex-col h-full bg-slate-50 p-6 gap-6 relative">
      
      {/* HEADER & NAVIGATION */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div>
           <h1 className="text-2xl font-bold text-slate-800">Inventory Manager</h1>
           <p className="text-slate-500 text-sm">Pharmacy & Clinic Consumables</p>
        </div>
        
        <div className="bg-white p-1 rounded-xl border border-slate-200 shadow-sm overflow-x-auto max-w-full flex">
          {TABS.map(tab => (
            <button 
              key={tab.id} 
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all whitespace-nowrap ${
                activeTab === tab.id 
                ? 'bg-[#137fec] text-white shadow-md' 
                : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* --- TOOLBAR --- */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
        
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search size={18} className="absolute left-3 top-2.5 text-slate-400" />
          <input 
            type="text" 
            placeholder={`Search ${activeTab}...`} 
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl text-sm outline-none focus:border-[#137fec] focus:ring-1 focus:ring-[#137fec]"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex gap-3 w-full md:w-auto">
          {/* Filter Button (Only for Stock) */}
          {activeTab === 'Stock' && (
            <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50">
              <Filter size={16} /> Filter Low Stock
            </button>
          )}

          {/* Dynamic Add Button */}
          {activeTab !== 'Stock' && (
            <button 
              onClick={handleAddNew}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-[#137fec] text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 shadow-md transition-all"
            >
              <Plus size={18} />
              {activeTab === 'Purchase Orders' ? 'Create PO' : 
               activeTab === 'Vendors' ? 'Add Vendor' : 
               activeTab === 'ItemList' ? 'Add Item' : 
               activeTab === 'Logs' ? 'Create Log' : ''}
            </button>
          )}
        </div>
      </div>

      {/* CONTENT AREA */}
      <div className="flex-1 min-h-0">
        {/* 3. PASS REFRESH KEY 
           Changing the key forces the component to unmount/remount, 
           triggering its internal useEffect to re-fetch data.
        */}
        <ActiveComponent 
            key={activeTab + refreshKey} 
            {...sharedProps} 
            searchQuery={searchQuery} 
        />
      </div>

      {/* --- MOUNT MODALS HERE --- */}
      
      {/* 4. PASS handleSave TO MODALS */}

      {CreateOrderModal && (
        <CreateOrderModal 
          isOpen={activeModal === 'order'} 
          onClose={closeModal} 
          onSave={handleSave} 
        />
      )}

      {AddItemModal && (
        <AddItemModal 
          isOpen={activeModal === 'item'} 
          onClose={closeModal} 
          onSave={handleSave} // <--- FIX: Passing the function here
        />
      )}

      {AddVendorModal && (
        <AddVendorModal 
          isOpen={activeModal === 'vendor'} 
          onClose={closeModal} 
          onSave={handleSave}
        />
      )}

      {AddLogModal && (
        <AddLogModal 
          isOpen={activeModal === 'log'} 
          onClose={closeModal} 
          onSave={handleSave}
        />
      )}

    </div>
  );
};

export default InventoryPage;