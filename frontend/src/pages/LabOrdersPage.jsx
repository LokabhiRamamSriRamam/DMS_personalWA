import { useState, useEffect, useRef } from 'react';
import { Search, Download, Plus, Edit, X, Package, User, Loader2 } from 'lucide-react';
import api from '../services/api';

const STATUS_STYLES = {
  'Sent':                 'bg-blue-50   text-blue-700   border-blue-200',
  'In Process':           'bg-yellow-50 text-yellow-700 border-yellow-200',
  'Received':             'bg-green-50  text-green-700  border-green-200',
  'Delivered to Patient': 'bg-slate-100 text-slate-600  border-slate-200',
};

const LAB_STATUSES   = ['Sent', 'In Process', 'Received', 'Delivered to Patient'];
const ITEM_CATEGORIES = ['Crown & Bridge', 'Orthodontics', 'Prosthodontics', 'Implants', 'Dentures', 'Other'];

// ─── Item Combobox ────────────────────────────────────────────────────────────
function ItemCombobox({ value = '', onChange, onSelect, catalogItems = [] }) {
  const [open, setOpen]   = useState(false);
  const containerRef      = useRef(null);

  const suggestions = catalogItems.filter(i =>
    i.name?.toLowerCase().includes(value.toLowerCase())
  );

  // Close on outside click
  useEffect(() => {
    function handleOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  function handlePick(item) {
    onSelect(item);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        required
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        className="w-full p-2.5 border rounded-xl outline-none focus:border-[#137fec]"
        placeholder="e.g. Zirconia Crown"
        autoComplete="off"
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
          {suggestions.map(item => (
            <li
              key={item._id}
              onMouseDown={() => handlePick(item)}
              className="flex items-center justify-between px-3 py-2 text-sm cursor-pointer hover:bg-blue-50"
            >
              <span className="font-medium text-slate-800">{item.name}</span>
              <span className="text-xs text-slate-400">₹{item.price?.toLocaleString()}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Lab Order Modal ─────────────────────────────────────────────────────────
function LabOrderModal({ isOpen, onClose, order, patients, labVendors, catalogItems, onSave }) {
  const [form, setForm]     = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (order) {
      setForm({
        patient_id:        order.patient_id?._id  || order.patient_id  || '',
        vendor_id:         order.vendor_id?._id   || order.vendor_id   || '',
        item_name:         order.items?.[0]?.item_name    || '',
        shade:             order.items?.[0]?.shade        || '',
        cost_to_clinic:    order.cost_to_clinic           ?? '',
        order_date:        order.order_date        ? order.order_date.slice(0, 10)        : new Date().toISOString().slice(0, 10),
        expected_delivery: order.expected_delivery ? order.expected_delivery.slice(0, 10) : '',
        notes:             order.items?.[0]?.instructions || '',
        status:            order.status || 'Sent',
      });
    } else {
      setForm({
        patient_id: '', vendor_id: '', item_name: '', shade: '',
        cost_to_clinic: '', order_date: new Date().toISOString().slice(0, 10),
        expected_delivery: '', notes: '', status: 'Sent',
      });
    }
  }, [isOpen, order]);

  if (!isOpen) return null;

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try { await onSave(form); onClose(); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b bg-slate-50">
          <h3 className="text-xl font-bold text-slate-800">{order ? 'Edit Lab Order' : 'New Lab Order'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-red-50 hover:text-red-500 rounded-full"><X size={20}/></button>
        </div>

        <div className="p-6 overflow-y-auto">
          <form id="lab-order-form" onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Patient *</label>
              <select required value={form.patient_id} onChange={e => set('patient_id', e.target.value)}
                className="w-full p-2.5 border rounded-xl focus:ring-2 focus:ring-[#137fec] outline-none">
                <option value="">Select patient</option>
                {patients.map(p => (
                  <option key={p._id} value={p._id}>{p.first_name} {p.last_name} ({p.patientId})</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Lab Vendor *</label>
              <select required value={form.vendor_id} onChange={e => set('vendor_id', e.target.value)}
                className="w-full p-2.5 border rounded-xl focus:ring-2 focus:ring-[#137fec] outline-none">
                <option value="">Select lab</option>
                {labVendors.map(v => <option key={v._id} value={v._id}>{v.name}</option>)}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Item Name *</label>
              <ItemCombobox
                value={form.item_name}
                onChange={v => set('item_name', v)}
                onSelect={item => setForm(f => ({
                  ...f,
                  item_name:      item.name,
                  cost_to_clinic: f.cost_to_clinic !== '' ? f.cost_to_clinic : item.price ?? '',
                }))}
                catalogItems={catalogItems}
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Shade</label>
              <input value={form.shade} onChange={e => set('shade', e.target.value)}
                className="w-full p-2.5 border rounded-xl outline-none focus:border-[#137fec]"
                placeholder="e.g. A2"/>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Amount (₹)</label>
              <input type="number" value={form.cost_to_clinic} onChange={e => set('cost_to_clinic', e.target.value)}
                className="w-full p-2.5 border rounded-xl outline-none focus:border-[#137fec]"/>
            </div>

            {order && (
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Status</label>
                <select value={form.status} onChange={e => set('status', e.target.value)}
                  className="w-full p-2.5 border rounded-xl outline-none">
                  {LAB_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Order Date</label>
              <input type="date" value={form.order_date} onChange={e => set('order_date', e.target.value)}
                className="w-full p-2.5 border rounded-xl outline-none focus:border-[#137fec]"/>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Expected Delivery</label>
              <input type="date" value={form.expected_delivery} onChange={e => set('expected_delivery', e.target.value)}
                className="w-full p-2.5 border rounded-xl outline-none focus:border-[#137fec]"/>
            </div>

            <div className="md:col-span-2 space-y-1">
              <label className="text-sm font-medium text-slate-700">Notes / Instructions</label>
              <textarea rows="2" value={form.notes} onChange={e => set('notes', e.target.value)}
                className="w-full p-2.5 border rounded-xl resize-none outline-none focus:border-[#137fec]"/>
            </div>
          </form>
        </div>

        <div className="p-4 border-t flex justify-end gap-3 bg-slate-50">
          <button onClick={onClose} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg">Cancel</button>
          <button type="submit" form="lab-order-form" disabled={saving}
            className="px-4 py-2 bg-[#137fec] text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60 flex items-center gap-2">
            {saving && <Loader2 size={15} className="animate-spin"/>}
            {order ? 'Update Order' : 'Save Order'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Lab Item Modal ───────────────────────────────────────────────────────────
function LabItemModal({ isOpen, onClose, item, labVendors, onSave }) {
  const [form, setForm]     = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (item) {
      setForm({
        name:                item.name               || '',
        category:            item.category            || 'Crown & Bridge',
        price:               item.price               ?? '',
        turnaround_time:     item.turnaround_time     || '',
        preferred_vendor_id: item.preferred_vendor_id?._id || item.preferred_vendor_id || '',
      });
    } else {
      setForm({ name: '', category: 'Crown & Bridge', price: '', turnaround_time: '', preferred_vendor_id: '' });
    }
  }, [isOpen, item]);

  if (!isOpen) return null;

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try { await onSave(form); onClose(); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b bg-slate-50">
          <h3 className="text-lg font-bold text-slate-800">{item ? 'Edit Lab Item' : 'Add Lab Item'}</h3>
          <button onClick={onClose}><X size={18} className="text-slate-400 hover:text-red-500"/></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Item Name *</label>
            <input required value={form.name} onChange={e => set('name', e.target.value)}
              className="w-full mt-1 p-2 border rounded-lg focus:border-[#137fec] outline-none"
              placeholder="e.g. Zirconia Crown"/>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Category</label>
            <select value={form.category} onChange={e => set('category', e.target.value)}
              className="w-full mt-1 p-2 border rounded-lg outline-none">
              {ITEM_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Cost (₹) *</label>
              <input type="number" required value={form.price} onChange={e => set('price', e.target.value)}
                className="w-full mt-1 p-2 border rounded-lg outline-none"/>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Turnaround</label>
              <input value={form.turnaround_time} onChange={e => set('turnaround_time', e.target.value)}
                placeholder="e.g. 4 Days" className="w-full mt-1 p-2 border rounded-lg outline-none"/>
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Preferred Vendor</label>
            <select value={form.preferred_vendor_id} onChange={e => set('preferred_vendor_id', e.target.value)}
              className="w-full mt-1 p-2 border rounded-lg outline-none">
              <option value="">None</option>
              {labVendors.map(v => <option key={v._id} value={v._id}>{v.name}</option>)}
            </select>
          </div>
          <button type="submit" disabled={saving}
            className="w-full py-2.5 bg-[#137fec] hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md mt-2 disabled:opacity-60 flex items-center justify-center gap-2">
            {saving && <Loader2 size={15} className="animate-spin"/>}
            {item ? 'Update Item' : 'Save Item'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Lab Vendor Modal ─────────────────────────────────────────────────────────
function LabVendorModal({ isOpen, onClose, vendor, onSave }) {
  const [form, setForm]     = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (vendor) {
      setForm({
        name:           vendor.name           || '',
        contact_person: vendor.contact_person || '',
        phone:          vendor.phone          || '',
        email:          vendor.email          || '',
        address:        vendor.address        || '',
      });
    } else {
      setForm({ name: '', contact_person: '', phone: '', email: '', address: '' });
    }
  }, [isOpen, vendor]);

  if (!isOpen) return null;

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try { await onSave(form); onClose(); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b bg-slate-50">
          <h3 className="text-lg font-bold text-slate-800">{vendor ? 'Edit Vendor' : 'Add Lab Vendor'}</h3>
          <button onClick={onClose}><X size={18} className="text-slate-400 hover:text-red-500"/></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Lab Name *</label>
            <input required value={form.name} onChange={e => set('name', e.target.value)}
              className="w-full mt-1 p-2 border rounded-lg focus:border-[#137fec] outline-none"
              placeholder="e.g. City Dental Lab"/>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Contact Person</label>
              <input value={form.contact_person} onChange={e => set('contact_person', e.target.value)}
                className="w-full mt-1 p-2 border rounded-lg outline-none"/>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Phone</label>
              <input value={form.phone} onChange={e => set('phone', e.target.value)}
                className="w-full mt-1 p-2 border rounded-lg outline-none"/>
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Email</label>
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
              className="w-full mt-1 p-2 border rounded-lg outline-none"/>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Address</label>
            <textarea rows="2" value={form.address} onChange={e => set('address', e.target.value)}
              className="w-full mt-1 p-2 border rounded-lg outline-none resize-none"/>
          </div>
          <button type="submit" disabled={saving}
            className="w-full py-2.5 bg-[#137fec] hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md mt-2 disabled:opacity-60 flex items-center justify-center gap-2">
            {saving && <Loader2 size={15} className="animate-spin"/>}
            {vendor ? 'Update Vendor' : 'Save Vendor'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function LabOrdersPage() {
  const [activeModule, setActiveModule] = useState('Lab Order');
  const [modalState, setModalState]     = useState({ type: null, data: null });
  const [searchQuery, setSearchQuery]   = useState('');

  const [orders,     setOrders]     = useState([]);
  const [items,      setItems]      = useState([]);
  const [vendors,    setVendors]    = useState([]);
  const [patients,   setPatients]   = useState([]);
  const [labVendors, setLabVendors] = useState([]);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    try {
      const [ordersRes, itemsRes, vendorsRes, patientsRes] = await Promise.all([
        api.get('/labs/orders'),
        api.get('/labs/items'),
        api.get('/vendors?type=Lab'),
        api.get('/patients'),
      ]);
      setOrders(ordersRes.data);
      setItems(itemsRes.data);
      setVendors(vendorsRes.data);
      setLabVendors(vendorsRes.data);
      setPatients(patientsRes.data);
    } catch (err) {
      console.error('Failed to fetch lab data', err);
    } finally {
      setLoading(false);
    }
  }

  const closeModals = () => setModalState({ type: null, data: null });

  function handleAddNew() {
    if (activeModule === 'Lab Order') setModalState({ type: 'order',  data: null });
    else if (activeModule === 'Lab Item') setModalState({ type: 'item',   data: null });
    else setModalState({ type: 'vendor', data: null });
  }

  function handleEdit(row) {
    if (activeModule === 'Lab Order') setModalState({ type: 'order',  data: row });
    else if (activeModule === 'Lab Item') setModalState({ type: 'item',   data: row });
    else setModalState({ type: 'vendor', data: row });
  }

  async function handleSaveOrder(form) {
    if (modalState.data) {
      const res = await api.put(`/labs/orders/${modalState.data._id}`, form);
      setOrders(prev => prev.map(o => o._id === modalState.data._id ? res.data : o));
    } else {
      const res = await api.post('/labs/orders', form);
      setOrders(prev => [res.data, ...prev]);
    }
  }

  async function handleSaveItem(form) {
    if (modalState.data) {
      const res = await api.put(`/labs/items/${modalState.data._id}`, form);
      setItems(prev => prev.map(i => i._id === modalState.data._id ? res.data : i));
    } else {
      const res = await api.post('/labs/items', form);
      setItems(prev => [...prev, res.data]);
    }
  }

  async function handleSaveVendor(form) {
    const payload = { ...form, type: 'Lab' };
    if (modalState.data) {
      const res = await api.put(`/vendors/${modalState.data._id}`, payload);
      const updated = res.data;
      setVendors(prev => prev.map(v => v._id === modalState.data._id ? updated : v));
      setLabVendors(prev => prev.map(v => v._id === modalState.data._id ? updated : v));
    } else {
      const res = await api.post('/vendors', payload);
      setVendors(prev => [...prev, res.data]);
      setLabVendors(prev => [...prev, res.data]);
    }
  }

  async function handleStatusChange(orderId, newStatus) {
    try {
      await api.patch(`/labs/orders/${orderId}`, { status: newStatus });
      setOrders(prev => prev.map(o => o._id === orderId ? { ...o, status: newStatus } : o));
    } catch (err) {
      console.error('Failed to update status', err);
    }
  }

  function exportCSV() {
    let rows = [];
    if (activeModule === 'Lab Order') {
      rows = [
        ['Order Date', 'Patient', 'Item', 'Shade', 'Vendor', 'Status', 'Amount'],
        ...orders.map(o => [
          o.order_date ? new Date(o.order_date).toLocaleDateString('en-GB') : '',
          `${o.patient_id?.first_name || ''} ${o.patient_id?.last_name || ''}`.trim(),
          o.items?.[0]?.item_name || '',
          o.items?.[0]?.shade || '',
          o.vendor_id?.name || '',
          o.status,
          o.cost_to_clinic || '',
        ]),
      ];
    } else if (activeModule === 'Lab Item') {
      rows = [
        ['Item Name', 'Category', 'Cost', 'Turnaround', 'Vendor'],
        ...items.map(i => [i.name, i.category, i.price, i.turnaround_time, i.preferred_vendor_id?.name || '']),
      ];
    } else {
      rows = [
        ['Lab Name', 'Contact', 'Phone', 'Email', 'Address'],
        ...vendors.map(v => [v.name, v.contact_person, v.phone, v.email, v.address]),
      ];
    }
    const csv  = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `${activeModule.replace(' ', '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function renderTable() {
    if (loading) {
      return (
        <div className="flex-1 flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-[#137fec]" size={28}/>
        </div>
      );
    }

    // ── Lab Orders ──
    if (activeModule === 'Lab Order') {
      const filtered = orders.filter(o => {
        const q = searchQuery.toLowerCase();
        const name = `${o.patient_id?.first_name || ''} ${o.patient_id?.last_name || ''}`.toLowerCase();
        return name.includes(q) || (o.items?.[0]?.item_name || '').toLowerCase().includes(q);
      });

      return (
        <table className="w-full text-left border-collapse">
          <thead className="bg-[#F7F2F2] sticky top-0 z-10 text-xs text-slate-500 uppercase">
            <tr>
              <th className="p-4">Order Date</th>
              <th className="p-4">Patient</th>
              <th className="p-4">Item</th>
              <th className="p-4">Vendor</th>
              <th className="p-4">Amount</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr><td colSpan="7" className="p-10 text-center text-slate-400">No orders found</td></tr>
            ) : filtered.map(o => (
              <tr key={o._id} className="hover:bg-slate-50 text-sm">
                <td className="p-4 text-slate-600">
                  {o.order_date ? new Date(o.order_date).toLocaleDateString('en-GB') : '—'}
                </td>
                <td className="p-4 text-[#137fec] font-medium">
                  {o.patient_id?.first_name} {o.patient_id?.last_name}
                </td>
                <td className="p-4 text-slate-900">{o.items?.[0]?.item_name}</td>
                <td className="p-4 text-slate-500">{o.vendor_id?.name || '—'}</td>
                <td className="p-4 font-medium text-slate-700">
                  {o.cost_to_clinic != null ? `₹${o.cost_to_clinic.toLocaleString()}` : '—'}
                </td>
                <td className="p-4">
                  <select
                    value={o.status}
                    onChange={e => handleStatusChange(o._id, e.target.value)}
                    className={`text-xs font-semibold px-2 py-1 rounded border cursor-pointer outline-none ${STATUS_STYLES[o.status] || STATUS_STYLES['Sent']}`}
                  >
                    {LAB_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td className="p-4 text-center">
                  <button onClick={() => handleEdit(o)} className="text-slate-400 hover:text-blue-600">
                    <Edit size={16}/>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    // ── Lab Items ──
    if (activeModule === 'Lab Item') {
      const filtered = items.filter(i =>
        i.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      return (
        <table className="w-full text-left border-collapse">
          <thead className="bg-[#F7F2F2] sticky top-0 z-10 text-xs text-slate-500 uppercase">
            <tr>
              <th className="p-4">Item Name</th>
              <th className="p-4">Category</th>
              <th className="p-4">Std Cost</th>
              <th className="p-4">Turnaround</th>
              <th className="p-4">Vendor</th>
              <th className="p-4 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr><td colSpan="6" className="p-10 text-center text-slate-400">No items in catalog</td></tr>
            ) : filtered.map(i => (
              <tr key={i._id} className="hover:bg-slate-50 text-sm">
                <td className="p-4 font-bold text-slate-800">
                  <span className="flex items-center gap-2"><Package size={16} className="text-slate-400"/>{i.name}</span>
                </td>
                <td className="p-4">
                  <span className="bg-slate-100 px-2 py-1 rounded text-slate-600 text-xs">{i.category}</span>
                </td>
                <td className="p-4 font-bold text-slate-700">₹{i.price?.toLocaleString()}</td>
                <td className="p-4 text-slate-500">{i.turnaround_time || '—'}</td>
                <td className="p-4 text-[#137fec]">{i.preferred_vendor_id?.name || '—'}</td>
                <td className="p-4 text-center">
                  <button onClick={() => handleEdit(i)} className="text-slate-400 hover:text-blue-600">
                    <Edit size={16}/>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    // ── Vendor Labs ──
    const filtered = vendors.filter(v =>
      v.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return (
      <table className="w-full text-left border-collapse">
        <thead className="bg-[#F7F2F2] sticky top-0 z-10 text-xs text-slate-500 uppercase">
          <tr>
            <th className="p-4">Vendor Name</th>
            <th className="p-4">Contact</th>
            <th className="p-4">Phone</th>
            <th className="p-4">Email</th>
            <th className="p-4 text-center">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {filtered.length === 0 ? (
            <tr><td colSpan="5" className="p-10 text-center text-slate-400">No lab vendors found</td></tr>
          ) : filtered.map(v => (
            <tr key={v._id} className="hover:bg-slate-50 text-sm">
              <td className="p-4 font-bold text-slate-800">{v.name}</td>
              <td className="p-4 text-slate-600">
                <span className="flex items-center gap-2"><User size={14}/>{v.contact_person || '—'}</span>
              </td>
              <td className="p-4 text-slate-600">{v.phone || '—'}</td>
              <td className="p-4 text-[#137fec]">{v.email || '—'}</td>
              <td className="p-4 text-center">
                <button onClick={() => handleEdit(v)} className="text-slate-400 hover:text-blue-600">
                  <Edit size={16}/>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 p-6">
      <LabOrderModal
        isOpen={modalState.type === 'order'}
        onClose={closeModals}
        order={modalState.data}
        patients={patients}
        labVendors={labVendors}
        catalogItems={items}
        onSave={handleSaveOrder}
      />
      <LabItemModal
        isOpen={modalState.type === 'item'}
        onClose={closeModals}
        item={modalState.data}
        labVendors={labVendors}
        onSave={handleSaveItem}
      />
      <LabVendorModal
        isOpen={modalState.type === 'vendor'}
        onClose={closeModals}
        vendor={modalState.data}
        onSave={handleSaveVendor}
      />

      {/* Tabs */}
      <div className="flex justify-between items-center mb-6">
        <div className="bg-slate-200/60 p-1.5 rounded-xl inline-flex">
          {['Lab Order', 'Lab Item', 'Vendor Labs'].map(tab => (
            <button
              key={tab}
              onClick={() => { setActiveModule(tab); setSearchQuery(''); }}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                activeModule === tab ? 'bg-[#137fec] text-white shadow' : 'text-slate-600 hover:bg-white/50'
              }`}
            >{tab}</button>
          ))}
        </div>
        <button onClick={exportCSV}
          className="flex items-center gap-2 bg-white border px-4 py-2.5 rounded-xl text-sm font-medium hover:border-[#137fec] text-slate-600">
          <Download size={18}/> Export CSV
        </button>
      </div>

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-2xl border shadow-sm mb-6 flex justify-between items-center">
        <h2 className="text-xl font-bold text-slate-800">
          {activeModule === 'Lab Order' ? 'Orders' : activeModule === 'Lab Item' ? 'Items Catalog' : 'Lab Directory'}
        </h2>
        <div className="flex gap-4">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-2.5 text-slate-400"/>
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border rounded-xl text-sm w-64 focus:ring-1 focus:ring-[#137fec] outline-none"
            />
          </div>
          <button onClick={handleAddNew}
            className="flex items-center gap-2 bg-[#137fec] text-white px-5 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 shadow-md">
            <Plus size={18}/>
            Add {activeModule === 'Lab Order' ? 'Order' : activeModule === 'Lab Item' ? 'Item' : 'Vendor'}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 bg-white border rounded-xl shadow-sm overflow-auto">
        {renderTable()}
      </div>
    </div>
  );
}
