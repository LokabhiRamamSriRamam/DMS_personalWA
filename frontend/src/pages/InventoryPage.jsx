import React, { useState } from 'react';
import { Search, Plus, Filter } from 'lucide-react';

// --- IMPORT SUB-COMPONENTS ---
import InventoryStock from '../components/InventoryStocks';
import InventoryOrders, { CreateOrderModal } from '../components/InventoryOrders'; // Assuming named export for Modal
import InventoryItemList, { AddItemModal } from '../components/InventoryItems';   // Assuming named export for Modal
import InventoryLogs, { AddLogModal } from '../components/InventoryLogs';         // Assuming named export for Modal
import InventoryVendors, { AddVendorModal } from '../components/InventoryVendors'; // Assuming named export for Modal

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

  // --- NEW: MODAL STATE MANAGEMENT ---
  // Tracks which modal is currently active: 'order' | 'item' | 'log' | 'vendor' | null
  const [activeModal, setActiveModal] = useState(null);

  const closeModal = () => setActiveModal(null);

  // Logic to decide which modal to open based on the current tab
  const handleAddNew = () => {
    if (activeTab === 'Purchase Orders') setActiveModal('order');
    else if (activeTab === 'ItemList') setActiveModal('item');
    else if (activeTab === 'Logs') setActiveModal('log');
    else if (activeTab === 'Vendors') setActiveModal('vendor');
  };

  // We pass the shared components (Badge, Header) as props to the tabs
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

          {/* Dynamic Add Button - HIDDEN when tab is 'Stock' */}
          {activeTab !== 'Stock' && (
            <button 
              onClick={handleAddNew} // <--- ATTACHED HANDLER HERE
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
        <ActiveComponent {...sharedProps} searchQuery={searchQuery} />
      </div>

      {/* --- MOUNT MODALS HERE --- */}
      {/* 1. Create Purchase Order Modal */}
      {CreateOrderModal && (
        <CreateOrderModal 
          isOpen={activeModal === 'order'} 
          onClose={closeModal} 
        />
      )}

      {/* 2. Add Item Modal */}
      {AddItemModal && (
        <AddItemModal 
          isOpen={activeModal === 'item'} 
          onClose={closeModal} 
        />
      )}

      {/* 3. Add Vendor Modal */}
      {AddVendorModal && (
        <AddVendorModal 
          isOpen={activeModal === 'vendor'} 
          onClose={closeModal} 
        />
      )}

      {/* 4. Add Log/Adjustment Modal */}
      {/* (Assuming you have this component, if not, you can remove this block) */}
      {AddLogModal && (
        <AddLogModal 
          isOpen={activeModal === 'log'} 
          onClose={closeModal} 
        />
      )}

    </div>
  );
};

export default InventoryPage;