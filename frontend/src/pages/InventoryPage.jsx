import React, { useState, useEffect } from 'react';
import { Search, Plus, Filter, PackageX, Settings as SettingsIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import API from '../services/api';

// --- IMPORT SUB-COMPONENTS ---
import InventoryStock from '../components/InventoryStocks.jsx';
import InventoryOrders, { CreateOrderModal } from '../components/InventoryOrders.jsx';
import InventoryItemList, { AddItemModal } from '../components/InventoryItems.jsx';
import InventoryLogs, { AddLogModal } from '../components/InventoryLogs.jsx';
import InventoryVendors, { AddVendorModal } from '../components/InventoryVendors.jsx';
import { useInventorySettings } from '../Context/SettingsContext.jsx';
  
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
  const { inventorySettings } = useInventorySettings();
  const { medicineEnabled, consumableEnabled } = inventorySettings;
  const bothDisabled = !medicineEnabled && !consumableEnabled;

  const [activeTab, setActiveTab] = useState('Stock');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLowStock, setIsLowStock] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [categoryPharmacyFilter, setCategoryPharmacyFilter] = useState('');
  const [categoryConsumableFilter, setCategoryConsumableFilter] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('');
  const [orderVendorFilter, setOrderVendorFilter] = useState('');
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');
  const [logTypeFilter, setLogTypeFilter] = useState('');
  const [logCategoryFilter, setLogCategoryFilter] = useState('');
  const [vendorTypeFilter, setVendorTypeFilter] = useState('');

  const [refreshKey, setRefreshKey] = useState(0);
  const [activeModal, setActiveModal] = useState(null);
  const [vendorList, setVendorList] = useState([]);
  const [brandList, setBrandList] = useState([]);
  const [categoryListPharmacy, setCategoryListPharmacy] = useState([]);
  const [categoryListConsumable, setCategoryListConsumable] = useState([]);

  const closeModal = () => setActiveModal(null);

  // Fetch vendors, brands, and categories on mount
  useEffect(() => {
    const fetchFiltersData = async () => {
      try {
        const [vendorsRes, inventoryRes] = await Promise.all([
          API.get('/vendors'),
          API.get('/inventory')
        ]);
        setVendorList(vendorsRes.data);

        // Extract unique brands and categories
        const inventory = inventoryRes.data;
        const brands = [...new Set(inventory.map(i => i.manufacturer).filter(Boolean))].sort();
        const pharmaCats = [...new Set(inventory.filter(i => i.type === 'Pharmacy').map(i => i.category).filter(Boolean))].sort();
        const consumableCats = [...new Set(inventory.filter(i => i.type === 'Consumable' || i.type === 'Asset').map(i => i.category).filter(Boolean))].sort();

        setBrandList(brands);
        setCategoryListPharmacy(pharmaCats);
        setCategoryListConsumable(consumableCats);
      } catch (err) {
        console.error('Failed to fetch filter data:', err);
      }
    };
    fetchFiltersData();
  }, []);

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

  const sharedProps = {
    StockBadge,
    SectionHeader,
    medicineEnabled,
    consumableEnabled,
    isLowStock,
    searchQuery,
    statusFilter,
    brandFilter,
    categoryPharmacyFilter,
    categoryConsumableFilter,
    orderStatusFilter,
    orderVendorFilter,
    dateFromFilter,
    dateToFilter,
    logTypeFilter,
    logCategoryFilter,
    vendorTypeFilter,
    vendorList,
    brandList,
    categoryListPharmacy,
    categoryListConsumable
  };

  const TABS = [
    { id: 'Stock',           label: 'Stock',    component: InventoryStock    },
    { id: 'Purchase Orders', label: 'Orders',   component: InventoryOrders   },
    { id: 'ItemList',        label: 'Items',    component: InventoryItemList },
    { id: 'Logs',            label: 'Logs',     component: InventoryLogs     },
    { id: 'Vendors',         label: 'Vendors',  component: InventoryVendors  },
  ];

  const ActiveComponent = TABS.find(t => t.id === activeTab)?.component || InventoryStock;

  if (bothDisabled) {
    return (
      <div className="flex flex-col h-full bg-slate-50 p-6 items-center justify-center">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-10 max-w-md text-center">
          <div className="mx-auto mb-4 size-16 rounded-full bg-slate-100 flex items-center justify-center">
            <PackageX size={32} className="text-slate-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Inventory is disabled</h2>
          <p className="text-sm text-slate-500 mb-6">
            Both Medicine and Consumable inventory tracking are turned off.
            Enable them in Settings to use this page.
          </p>
          <Link
            to="/settings"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#137fec] text-white text-sm font-bold rounded-lg hover:bg-blue-600 shadow-md"
          >
            <SettingsIcon size={16} /> Go to Settings
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col overflow-y-auto sm:overflow-hidden sm:h-full bg-slate-50 p-3 sm:p-6 gap-3 sm:gap-6 relative">

      {/* ── HEADER + TABS (combined row on mobile) ── */}
      <div className="flex items-center justify-between gap-2">
        {/* Title — hidden on very small screens to save space */}
        <div className="hidden xs:block flex-shrink-0">
          <h1 className="text-lg sm:text-2xl font-bold text-slate-800 leading-tight">Inventory</h1>
          <p className="text-slate-500 text-xs sm:text-sm hidden sm:block">Pharmacy & Clinic Consumables</p>
        </div>

        {/* Tab bar — scrollable, bleeds to page edges on mobile */}
        <div className="flex-1 overflow-x-auto scrollbar-none -mx-3 px-3 xs:mx-0 xs:px-0">
          <div className="bg-white p-1 rounded-xl border border-slate-200 shadow-sm inline-flex min-w-max">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setSearchQuery(''); }}
                className={`flex-shrink-0 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all whitespace-nowrap ${
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
      </div>

      {/* ── TOOLBAR ── */}
      <div className="bg-white px-3 py-2.5 sm:p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder={`Search…`}
              className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-[#137fec] focus:ring-1 focus:ring-[#137fec]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Stock Tab Filters */}
          {activeTab === 'Stock' && (
            <>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-[#137fec] focus:ring-1 focus:ring-[#137fec] bg-white"
              >
                <option value="">All Status</option>
                <option value="Good">Good</option>
                <option value="Low">Low</option>
                <option value="Critical">Critical</option>
                <option value="Out of Stock">Out of Stock</option>
              </select>
              <select
                value={brandFilter}
                onChange={(e) => setBrandFilter(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-[#137fec] focus:ring-1 focus:ring-[#137fec] bg-white"
              >
                <option value="">All Brands</option>
                {brandList.map(brand => (
                  <option key={brand} value={brand}>{brand}</option>
                ))}
              </select>
            </>
          )}

          {/* Items Tab Filters */}
          {activeTab === 'ItemList' && (
            <select
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-[#137fec] focus:ring-1 focus:ring-[#137fec] bg-white"
            >
              <option value="">All Brands</option>
              {brandList.map(brand => (
                <option key={brand} value={brand}>{brand}</option>
              ))}
            </select>
          )}

          {/* Orders Tab Filters */}
          {activeTab === 'Purchase Orders' && (
            <>
              <select
                value={orderVendorFilter}
                onChange={(e) => setOrderVendorFilter(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-[#137fec] focus:ring-1 focus:ring-[#137fec] bg-white"
              >
                <option value="">All Vendors</option>
                {vendorList.map(vendor => (
                  <option key={vendor._id} value={vendor.name}>{vendor.name}</option>
                ))}
              </select>
              <select
                value={orderStatusFilter}
                onChange={(e) => setOrderStatusFilter(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-[#137fec] focus:ring-1 focus:ring-[#137fec] bg-white"
              >
                <option value="">All Status</option>
                <option value="Pending">Pending</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Received">Received</option>
                <option value="Cancelled">Cancelled</option>
              </select>
              <input
                type="date"
                value={dateFromFilter}
                onChange={(e) => setDateFromFilter(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-[#137fec] focus:ring-1 focus:ring-[#137fec]"
              />
              <input
                type="date"
                value={dateToFilter}
                onChange={(e) => setDateToFilter(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-[#137fec] focus:ring-1 focus:ring-[#137fec]"
              />
            </>
          )}

          {/* Logs Tab Filters */}
          {activeTab === 'Logs' && (
            <>
              <select
                value={logTypeFilter}
                onChange={(e) => setLogTypeFilter(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-[#137fec] focus:ring-1 focus:ring-[#137fec] bg-white"
              >
                <option value="">All Types</option>
                <option value="Stock In">Stock In</option>
                <option value="Stock Out">Stock Out</option>
              </select>
              <select
                value={logCategoryFilter}
                onChange={(e) => setLogCategoryFilter(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-[#137fec] focus:ring-1 focus:ring-[#137fec] bg-white"
              >
                <option value="">All Categories</option>
                <option value="Pharmacy">Pharmacy</option>
                <option value="Consumable">Consumable</option>
                <option value="Asset">Asset</option>
              </select>
            </>
          )}

          {/* Vendors Tab Filters */}
          {activeTab === 'Vendors' && (
            <select
              value={vendorTypeFilter}
              onChange={(e) => setVendorTypeFilter(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-[#137fec] focus:ring-1 focus:ring-[#137fec] bg-white"
            >
              <option value="">All Types</option>
              <option value="Pharmacy">Pharmacy</option>
              <option value="Consumable">Consumable</option>
              <option value="Lab">Lab</option>
              <option value="General">General</option>
            </select>
          )}

          {/* Add button — non-Stock tabs */}
          {activeTab !== 'Stock' && (
            <button
              onClick={handleAddNew}
              className="flex items-center gap-1.5 bg-[#137fec] text-white px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold hover:bg-blue-700 shadow-sm transition-all flex-shrink-0"
            >
              <Plus size={16} />
              <span className="hidden xs:inline">
                {activeTab === 'Purchase Orders' ? 'Create PO' :
                 activeTab === 'Vendors'         ? 'Add Vendor' :
                 activeTab === 'ItemList'        ? 'Add Item' :
                 activeTab === 'Logs'            ? 'Create Log' : ''}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* ── CONTENT — mobile scrolls naturally; desktop is height-constrained ── */}
      <div className="sm:flex-1 sm:min-h-0">
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