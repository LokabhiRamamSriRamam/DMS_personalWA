import React, { useState, useEffect } from 'react';
import { 
  Search, Calendar, ChevronDown, Download, 
  Printer, Plus, Edit, Trash2, X, Save, ArrowLeft,
  Package, DollarSign, MapPin, Phone, Mail, User, Clock
} from 'lucide-react';

// --- 1. LAB ORDER MODAL (Main Order Form) ---
const LabOrderModal = ({ isOpen, onClose, orderData, onSave }) => {
  if (!isOpen) return null;
  const isEditMode = !!orderData;
  const [formData, setFormData] = useState({
    patient: '', vendor: '', item: '',
    orderDate: new Date().toISOString().split('T')[0],
    expectedDate: '', amount: '', status: 'Pending',
    invoice: '', po: '', notes: ''
  });

  useEffect(() => {
    if (orderData) setFormData({ ...orderData, invoice: orderData.invoice === '-' ? '' : orderData.invoice });
    else setFormData({
      patient: '', vendor: '', item: '', orderDate: new Date().toISOString().split('T')[0],
      expectedDate: '', amount: '', status: 'Pending', invoice: '', po: '', notes: ''
    });
  }, [orderData]);

  const handleSubmit = (e) => { e.preventDefault(); onSave(formData); onClose(); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <h3 className="text-xl font-bold text-slate-800">{isEditMode ? 'Edit Order' : 'New Lab Order'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-red-50 hover:text-red-500 rounded-full"><X size={20} /></button>
        </div>
        <div className="p-6 overflow-y-auto">
          <form id="order-form" onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
             <div className="space-y-1"><label className="text-sm font-medium text-slate-700">Patient Name *</label><select required value={formData.patient} onChange={e => setFormData({...formData, patient: e.target.value})} className="w-full p-2.5 border rounded-xl focus:ring-2 focus:ring-[#137fec] outline-none"><option value="">Select</option><option value="Avtansh">Avtansh</option><option value="Alok Kumar">Alok Kumar</option></select></div>
             <div className="space-y-1"><label className="text-sm font-medium text-slate-700">Lab Vendor *</label><select required value={formData.vendor} onChange={e => setFormData({...formData, vendor: e.target.value})} className="w-full p-2.5 border rounded-xl focus:ring-2 focus:ring-[#137fec] outline-none"><option value="">Select</option><option value="Dental Depot">Dental Depot</option><option value="City Lab">City Lab</option></select></div>
             <div className="space-y-1"><label className="text-sm font-medium text-slate-700">Order Item *</label><input required type="text" value={formData.item} onChange={e => setFormData({...formData, item: e.target.value})} className="w-full p-2.5 border rounded-xl outline-none focus:border-[#137fec]" /></div>
             <div className="space-y-1"><label className="text-sm font-medium text-slate-700">Amount (₹)</label><input type="number" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} className="w-full p-2.5 border rounded-xl outline-none focus:border-[#137fec]" /></div>
             <div className="space-y-1"><label className="text-sm font-medium text-slate-700">Order Date</label><input type="date" value={formData.orderDate} onChange={e => setFormData({...formData, orderDate: e.target.value})} className="w-full p-2.5 border rounded-xl outline-none focus:border-[#137fec]" /></div>
             <div className="space-y-1"><label className="text-sm font-medium text-slate-700">Expected Date</label><input type="date" value={formData.expectedDate} onChange={e => setFormData({...formData, expectedDate: e.target.value})} className="w-full p-2.5 border rounded-xl outline-none focus:border-[#137fec]" /></div>
             <div className="md:col-span-2"><label className="text-sm font-medium text-slate-700">Notes</label><textarea rows="2" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full p-2.5 border rounded-xl resize-none outline-none focus:border-[#137fec]"></textarea></div>
          </form>
        </div>
        <div className="p-4 border-t flex justify-end gap-3 bg-slate-50">
          <button onClick={onClose} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg">Cancel</button>
          <button type="submit" form="order-form" className="px-4 py-2 bg-[#137fec] text-white font-medium rounded-lg hover:bg-blue-700">Save Order</button>
        </div>
      </div>
    </div>
  );
};

// --- 2. LAB ITEM MODAL (Mini) ---
const LabItemModal = ({ isOpen, onClose, itemData, onSave }) => {
  if (!isOpen) return null;
  const isEditMode = !!itemData;
  const [formData, setFormData] = useState({ name: '', category: 'Crown & Bridge', price: '', turnaround: '', vendor: '' });

  useEffect(() => {
    if (itemData) setFormData(itemData);
    else setFormData({ name: '', category: 'Crown & Bridge', price: '', turnaround: '', vendor: '' });
  }, [itemData]);

  const handleSubmit = (e) => { e.preventDefault(); onSave(formData); onClose(); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b bg-slate-50">
          <h3 className="text-lg font-bold text-slate-800">{isEditMode ? 'Edit Item' : 'Add Lab Item'}</h3>
          <button onClick={onClose}><X size={18} className="text-slate-400 hover:text-red-500" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div><label className="text-xs font-bold text-slate-500 uppercase">Item Name</label><input required className="w-full mt-1 p-2 border rounded-lg focus:border-[#137fec] outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Zirconia Crown" /></div>
          <div><label className="text-xs font-bold text-slate-500 uppercase">Category</label><select className="w-full mt-1 p-2 border rounded-lg outline-none" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}><option>Crown & Bridge</option><option>Orthodontics</option><option>Prosthodontics</option></select></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-xs font-bold text-slate-500 uppercase">Std. Cost (₹)</label><input type="number" required className="w-full mt-1 p-2 border rounded-lg outline-none" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} /></div>
            <div><label className="text-xs font-bold text-slate-500 uppercase">Turnaround</label><input type="text" placeholder="e.g. 4 Days" className="w-full mt-1 p-2 border rounded-lg outline-none" value={formData.turnaround} onChange={e => setFormData({...formData, turnaround: e.target.value})} /></div>
          </div>
          <div><label className="text-xs font-bold text-slate-500 uppercase">Preferred Vendor</label><input type="text" className="w-full mt-1 p-2 border rounded-lg outline-none" value={formData.vendor} onChange={e => setFormData({...formData, vendor: e.target.value})} placeholder="Optional" /></div>
          <button type="submit" className="w-full py-2.5 bg-[#137fec] hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md mt-2">Save Item</button>
        </form>
      </div>
    </div>
  );
};

// --- 3. VENDOR MODAL (Mini) ---
const LabVendorModal = ({ isOpen, onClose, vendorData, onSave }) => {
  if (!isOpen) return null;
  const isEditMode = !!vendorData;
  const [formData, setFormData] = useState({ name: '', contact: '', phone: '', email: '', address: '' });

  useEffect(() => {
    if (vendorData) setFormData(vendorData);
    else setFormData({ name: '', contact: '', phone: '', email: '', address: '' });
  }, [vendorData]);

  const handleSubmit = (e) => { e.preventDefault(); onSave(formData); onClose(); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b bg-slate-50">
          <h3 className="text-lg font-bold text-slate-800">{isEditMode ? 'Edit Vendor' : 'Add New Vendor'}</h3>
          <button onClick={onClose}><X size={18} className="text-slate-400 hover:text-red-500" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div><label className="text-xs font-bold text-slate-500 uppercase">Lab Name</label><input required className="w-full mt-1 p-2 border rounded-lg focus:border-[#137fec] outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. City Dental Lab" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-xs font-bold text-slate-500 uppercase">Contact Person</label><input className="w-full mt-1 p-2 border rounded-lg outline-none" value={formData.contact} onChange={e => setFormData({...formData, contact: e.target.value})} /></div>
            <div><label className="text-xs font-bold text-slate-500 uppercase">Phone</label><input className="w-full mt-1 p-2 border rounded-lg outline-none" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} /></div>
          </div>
          <div><label className="text-xs font-bold text-slate-500 uppercase">Email</label><input type="email" className="w-full mt-1 p-2 border rounded-lg outline-none" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} /></div>
          <div><label className="text-xs font-bold text-slate-500 uppercase">Address</label><textarea rows="2" className="w-full mt-1 p-2 border rounded-lg outline-none resize-none" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="Lab Address..."></textarea></div>
          <button type="submit" className="w-full py-2.5 bg-[#137fec] hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md mt-2">Save Vendor</button>
        </form>
      </div>
    </div>
  );
};

// --- MAIN PAGE COMPONENT ---
const LabOrdersPage = () => {
  const [activeModule, setActiveModule] = useState('Lab Order');
  
  // Modal States
  const [modalState, setModalState] = useState({ type: null, data: null }); // type: 'order' | 'item' | 'vendor'
  const closeModals = () => setModalState({ type: null, data: null });

  // Filter State
  const [dateLabel, setDateLabel] = useState('This Month');
  const [showDateMenu, setShowDateMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // --- MOCK DATA ---
  const [labOrders, setLabOrders] = useState([
    { id: 1, orderDate: '2025-12-24', expectedDate: '2025-12-28', item: 'Zirconia Crown', vendor: 'Dental Depot', status: 'Received', patient: 'Avtansh', amount: 4500, invoice: 'INV-9001', po: 'PO-221' },
    { id: 2, orderDate: '2025-12-23', expectedDate: '2025-12-30', item: 'Full Denture', vendor: 'City Lab', status: 'Pending', patient: 'Alok Kumar', amount: 12000, invoice: 'INV-9002', po: 'PO-222' },
  ]);

  const [labItems, setLabItems] = useState([
    { id: 1, name: 'Zirconia Crown', category: 'Crown & Bridge', price: 4500, turnaround: '4 Days', vendor: 'Dental Depot' },
    { id: 2, name: 'Clear Aligner', category: 'Orthodontics', price: 25000, turnaround: '14 Days', vendor: 'Smile Craft' },
  ]);

  const [vendors, setVendors] = useState([
    { id: 1, name: 'Dental Depot', contact: 'Mr. Sharma', phone: '9876543210', email: 'orders@dental.com', address: 'Mumbai, MH' },
    { id: 2, name: 'City Lab', contact: 'Rajesh', phone: '9988776655', email: 'info@citylab.in', address: 'Delhi, DL' },
  ]);

  // --- HANDLERS ---
  const handleAddNew = () => {
    if (activeModule === 'Lab Order') setModalState({ type: 'order', data: null });
    else if (activeModule === 'Lab Item') setModalState({ type: 'item', data: null });
    else if (activeModule === 'Vendor Labs') setModalState({ type: 'vendor', data: null });
  };

  const handleEdit = (item) => {
    if (activeModule === 'Lab Order') setModalState({ type: 'order', data: item });
    else if (activeModule === 'Lab Item') setModalState({ type: 'item', data: item });
    else if (activeModule === 'Vendor Labs') setModalState({ type: 'vendor', data: item });
  };

  const saveData = (formData) => {
    if (activeModule === 'Lab Order') {
      if (modalState.data) setLabOrders(labOrders.map(i => i.id === modalState.data.id ? { ...i, ...formData } : i));
      else setLabOrders([{ id: Date.now(), ...formData }, ...labOrders]);
    } else if (activeModule === 'Lab Item') {
      if (modalState.data) setLabItems(labItems.map(i => i.id === modalState.data.id ? { ...i, ...formData } : i));
      else setLabItems([{ id: Date.now(), ...formData }, ...labItems]);
    } else if (activeModule === 'Vendor Labs') {
      if (modalState.data) setVendors(vendors.map(i => i.id === modalState.data.id ? { ...i, ...formData } : i));
      else setVendors([{ id: Date.now(), ...formData }, ...vendors]);
    }
  };

  const renderTable = () => {
    if (activeModule === 'Lab Order') {
        const filtered = labOrders.filter(o => o.patient.toLowerCase().includes(searchQuery.toLowerCase()));
        return (
            <table className="w-full text-left border-collapse">
                <thead className="bg-[#F7F2F2] sticky top-0 z-10 text-xs text-slate-500 uppercase"><tr><th className="p-4">Date</th><th className="p-4">Patient</th><th className="p-4">Item</th><th className="p-4">Vendor</th><th className="p-4">Status</th><th className="p-4 text-center">Action</th></tr></thead>
                <tbody className="divide-y divide-slate-100">{filtered.map(o => (
                    <tr key={o.id} className="hover:bg-slate-50 text-sm"><td className="p-4 font-medium text-slate-700">{o.orderDate}</td><td className="p-4 text-[#137fec] font-medium">{o.patient}</td><td className="p-4 text-slate-900">{o.item}</td><td className="p-4 text-slate-500">{o.vendor}</td><td className="p-4"><span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded border border-orange-200">{o.status}</span></td><td className="p-4 text-center"><button onClick={() => handleEdit(o)} className="text-slate-400 hover:text-blue-600"><Edit size={16}/></button></td></tr>
                ))}</tbody>
            </table>
        );
    }
    if (activeModule === 'Lab Item') {
        const filtered = labItems.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()));
        return (
            <table className="w-full text-left border-collapse">
                <thead className="bg-[#F7F2F2] sticky top-0 z-10 text-xs text-slate-500 uppercase"><tr><th className="p-4">Item Name</th><th className="p-4">Category</th><th className="p-4">Std Cost</th><th className="p-4">Vendor</th><th className="p-4 text-center">Action</th></tr></thead>
                <tbody className="divide-y divide-slate-100">{filtered.map(i => (
                    <tr key={i.id} className="hover:bg-slate-50 text-sm"><td className="p-4 font-bold text-slate-800 flex items-center gap-2"><Package size={16} className="text-slate-400"/>{i.name}</td><td className="p-4"><span className="bg-slate-100 px-2 py-1 rounded text-slate-600 text-xs">{i.category}</span></td><td className="p-4 font-bold text-slate-700">₹{i.price}</td><td className="p-4 text-[#137fec]">{i.vendor}</td><td className="p-4 text-center"><button onClick={() => handleEdit(i)} className="text-slate-400 hover:text-blue-600"><Edit size={16}/></button></td></tr>
                ))}</tbody>
            </table>
        );
    }
    if (activeModule === 'Vendor Labs') {
        const filtered = vendors.filter(v => v.name.toLowerCase().includes(searchQuery.toLowerCase()));
        return (
            <table className="w-full text-left border-collapse">
                <thead className="bg-[#F7F2F2] sticky top-0 z-10 text-xs text-slate-500 uppercase"><tr><th className="p-4">Vendor Name</th><th className="p-4">Contact</th><th className="p-4">Phone</th><th className="p-4">Email</th><th className="p-4 text-center">Action</th></tr></thead>
                <tbody className="divide-y divide-slate-100">{filtered.map(v => (
                    <tr key={v.id} className="hover:bg-slate-50 text-sm"><td className="p-4 font-bold text-slate-800">{v.name}</td><td className="p-4 text-slate-600 flex items-center gap-2"><User size={14}/>{v.contact}</td><td className="p-4 text-slate-600">{v.phone}</td><td className="p-4 text-[#137fec]">{v.email}</td><td className="p-4 text-center"><button onClick={() => handleEdit(v)} className="text-slate-400 hover:text-blue-600"><Edit size={16}/></button></td></tr>
                ))}</tbody>
            </table>
        );
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 p-6">
      {/* --- MOUNT MODALS --- */}
      <LabOrderModal isOpen={modalState.type === 'order'} onClose={closeModals} orderData={modalState.data} onSave={saveData} />
      <LabItemModal isOpen={modalState.type === 'item'} onClose={closeModals} itemData={modalState.data} onSave={saveData} />
      <LabVendorModal isOpen={modalState.type === 'vendor'} onClose={closeModals} vendorData={modalState.data} onSave={saveData} />

      {/* --- HEADER --- */}
      <div className="flex justify-between items-center mb-6">
        <div className="bg-slate-200/60 p-1.5 rounded-xl inline-flex">
          {['Lab Order', 'Lab Item', 'Vendor Labs'].map(tab => (
            <button key={tab} onClick={() => setActiveModule(tab)} className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${activeModule === tab ? 'bg-[#137fec] text-white shadow' : 'text-slate-600 hover:bg-white/50'}`}>{tab}</button>
          ))}
        </div>
        <button className="flex items-center gap-2 bg-white border px-4 py-2.5 rounded-xl text-sm font-medium hover:border-[#137fec] text-slate-600"><Download size={18}/>Export CSV</button>
      </div>

      {/* --- TOOLBAR --- */}
      <div className="bg-white p-4 rounded-2xl border shadow-sm mb-6 flex justify-between items-center">
        <h2 className="text-xl font-bold text-slate-800">{activeModule === 'Lab Order' ? 'Orders' : activeModule === 'Lab Item' ? 'Items Catalog' : 'Directory'}</h2>
        <div className="flex gap-4">
            <div className="relative"><Search size={18} className="absolute left-3 top-2.5 text-slate-400"/><input type="text" placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10 pr-4 py-2 border rounded-xl text-sm w-64 focus:ring-1 focus:ring-[#137fec] outline-none"/></div>
            {activeModule === 'Lab Order' && (
                <div className="relative">
                    <button onClick={() => setShowDateMenu(!showDateMenu)} className="flex items-center gap-2 px-4 py-2 border rounded-xl text-sm text-slate-700 min-w-[160px] justify-between"><span className="flex items-center gap-2"><Calendar size={16} className="text-[#137fec]"/>{dateLabel}</span><ChevronDown size={16}/></button>
                    {showDateMenu && <div className="absolute top-full right-0 mt-2 w-48 bg-white border rounded-lg shadow-xl z-20 py-1">{['Today', 'This Month', 'All Time'].map(o => <button key={o} onClick={() => {setDateLabel(o); setShowDateMenu(false)}} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50">{o}</button>)}</div>}
                </div>
            )}
            <button onClick={handleAddNew} className="flex items-center gap-2 bg-[#137fec] text-white px-5 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 shadow-md"><Plus size={18}/> Add {activeModule === 'Lab Order' ? 'Order' : activeModule === 'Lab Item' ? 'Item' : 'Vendor'}</button>
        </div>
      </div>

      {/* --- TABLE --- */}
      <div className="flex-1 bg-white border rounded-xl shadow-sm overflow-hidden flex flex-col">{renderTable()}</div>
    </div>
  );
};

export default LabOrdersPage;