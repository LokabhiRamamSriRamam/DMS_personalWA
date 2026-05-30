import { useState, useEffect, useRef } from 'react';
import { Search, Download, Plus, Edit, X, Package, User, Loader2, Upload, CheckCircle, AlertCircle, SlidersHorizontal } from 'lucide-react';
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
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b bg-slate-50">
          <h3 className="text-lg sm:text-xl font-bold text-slate-800">{order ? 'Edit Lab Order' : 'New Lab Order'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-red-50 hover:text-red-500 rounded-full"><X size={20}/></button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto">
          <form id="lab-order-form" onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
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

            <div className="sm:col-span-2 space-y-1">
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
          {/* Stack on mobile, side-by-side on sm+ */}
          <div className="grid grid-cols-1 xs:grid-cols-2 gap-4">
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

// ─── Shared Upload Result ─────────────────────────────────────────────────────
function UploadResult({ result }) {
  return (
    <div className="bg-green-50 border border-green-100 rounded-xl p-4 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <CheckCircle size={16} className="text-green-600" />
        <p className="text-sm font-bold text-green-700">Upload Complete</p>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        {[['Total Rows', result.total, 'text-slate-700'], ['Inserted', result.inserted, 'text-green-700'], ['Skipped', result.skipped, 'text-orange-600']].map(([label, val, color]) => (
          <div key={label} className="bg-white rounded-lg p-2 border border-green-100">
            <p className={`text-xl font-bold ${color}`}>{val}</p>
            <p className="text-[11px] text-slate-400">{label}</p>
          </div>
        ))}
      </div>
      {result.errors?.length > 0 && (
        <details className="text-xs text-slate-500 mt-1" open>
          <summary className="cursor-pointer font-medium text-slate-600">
            View skipped rows ({result.errors.length}) — row numbers match your sheet (header = row 1)
          </summary>
          <div className="mt-2 border border-amber-200 rounded-lg overflow-hidden max-h-44 overflow-y-auto">
            <table className="w-full text-[11px]">
              <thead className="bg-amber-50 sticky top-0">
                <tr>
                  <th className="px-2 py-1 text-left font-semibold text-slate-600">Row</th>
                  <th className="px-2 py-1 text-left font-semibold text-slate-600">Column</th>
                  <th className="px-2 py-1 text-left font-semibold text-slate-600">Value</th>
                  <th className="px-2 py-1 text-left font-semibold text-slate-600">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-100">
                {result.errors.slice(0, 50).map((e, i) => (
                  <tr key={i}>
                    <td className="px-2 py-1 font-mono text-slate-700">{e.row}</td>
                    <td className="px-2 py-1 text-slate-600">{e.column || '—'}</td>
                    <td className="px-2 py-1 text-slate-500 max-w-[120px] truncate" title={e.value}>{e.value || <span className="italic text-slate-400">(empty)</span>}</td>
                    <td className="px-2 py-1 text-red-600">{e.error}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </div>
  );
}

// ─── Bulk Upload Lab Items Modal ──────────────────────────────────────────────
function BulkUploadLabItemsModal({ isOpen, onClose, onSuccess }) {
  const [sheetUrl, setSheetUrl] = useState('');
  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState(null);
  const [error, setError]       = useState('');

  useEffect(() => { if (isOpen) { setSheetUrl(''); setResult(null); setError(''); } }, [isOpen]);

  async function handleUpload() {
    if (!sheetUrl.trim()) { setError('Please enter a Google Sheets URL.'); return; }
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await api.post('/labs/bulk-upload-items', { sheetUrl });
      setResult(res.data);
      if (res.data.inserted > 0 && onSuccess) onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed. Please try again.');
    } finally { setLoading(false); }
  }

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden flex flex-col shadow-2xl">
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#137fec]/10 rounded-lg"><Upload size={18} className="text-[#137fec]" /></div>
            <div>
              <h3 className="font-bold text-slate-800">Bulk Upload Lab Items</h3>
              <p className="text-xs text-slate-500">Import catalog items from Google Sheets</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-red-500 transition-colors"><X size={20} /></button>
        </div>
        <div className="p-6 flex flex-col gap-5">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
            <p className="text-xs font-bold text-blue-700 uppercase mb-2">Required Column Headers</p>
            <div className="overflow-x-auto">
              <table className="text-[11px] w-full border-collapse">
                <thead>
                  <tr className="bg-blue-100">
                    {['Name', 'Category', 'Cost', 'Turnaround'].map(h => (
                      <th key={h} className="px-2 py-1.5 text-left font-bold text-blue-800 border border-blue-200 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-white">
                    {['Zirconia Crown', 'Crown & Bridge', '3500', '4 Days'].map((v, i) => (
                      <td key={i} className="px-2 py-1 text-slate-500 italic border border-blue-100 whitespace-nowrap">{v}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-blue-600 mt-2">⚠️ Sheet must be <strong>"Anyone with the link can view"</strong>. Duplicates are auto-skipped.</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase">Google Sheets URL</label>
            <input type="url" placeholder="https://docs.google.com/spreadsheets/d/..." value={sheetUrl}
              onChange={e => setSheetUrl(e.target.value)}
              className="w-full border border-slate-300 p-2.5 rounded-xl text-sm focus:ring-2 focus:ring-[#137fec] outline-none" />
          </div>
          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-lg p-3">
              <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
          {result && <UploadResult result={result} />}
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors">
              {result ? 'Done' : 'Cancel'}
            </button>
            {!result && (
              <button onClick={handleUpload} disabled={loading}
                className="flex-1 py-2.5 rounded-xl bg-[#137fec] hover:bg-blue-700 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 disabled:opacity-60">
                {loading ? <><Loader2 size={16} className="animate-spin" /> Importing...</> : <><Upload size={16} /> Upload Items</>}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Bulk Upload Lab Vendors Modal ────────────────────────────────────────────
function BulkUploadLabVendorsModal({ isOpen, onClose, onSuccess }) {
  const [sheetUrl, setSheetUrl] = useState('');
  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState(null);
  const [error, setError]       = useState('');

  useEffect(() => { if (isOpen) { setSheetUrl(''); setResult(null); setError(''); } }, [isOpen]);

  async function handleUpload() {
    if (!sheetUrl.trim()) { setError('Please enter a Google Sheets URL.'); return; }
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await api.post('/labs/bulk-upload-vendors', { sheetUrl });
      setResult(res.data);
      if (res.data.inserted > 0 && onSuccess) onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed. Please try again.');
    } finally { setLoading(false); }
  }

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden flex flex-col shadow-2xl">
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-purple-50 to-violet-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 rounded-lg"><Upload size={18} className="text-purple-600" /></div>
            <div>
              <h3 className="font-bold text-slate-800">Bulk Upload Lab Vendors</h3>
              <p className="text-xs text-slate-500">Import lab directory from Google Sheets</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-red-500 transition-colors"><X size={20} /></button>
        </div>
        <div className="p-6 flex flex-col gap-5">
          <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
            <p className="text-xs font-bold text-purple-700 uppercase mb-2">Required Column Headers</p>
            <div className="overflow-x-auto">
              <table className="text-[11px] w-full border-collapse">
                <thead>
                  <tr className="bg-purple-100">
                    {['Name', 'Contact Person', 'Phone', 'Email', 'Address'].map(h => (
                      <th key={h} className="px-2 py-1.5 text-left font-bold text-purple-800 border border-purple-200 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-white">
                    {['City Dental Lab', 'Ramesh Kumar', '9876543210', 'lab@city.com', 'Delhi'].map((v, i) => (
                      <td key={i} className="px-2 py-1 text-slate-500 italic border border-purple-100 whitespace-nowrap">{v}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-purple-600 mt-2">⚠️ Sheet must be <strong>"Anyone with the link can view"</strong>. Duplicates are auto-skipped.</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase">Google Sheets URL</label>
            <input type="url" placeholder="https://docs.google.com/spreadsheets/d/..." value={sheetUrl}
              onChange={e => setSheetUrl(e.target.value)}
              className="w-full border border-slate-300 p-2.5 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
          </div>
          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-lg p-3">
              <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
          {result && <UploadResult result={result} />}
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors">
              {result ? 'Done' : 'Cancel'}
            </button>
            {!result && (
              <button onClick={handleUpload} disabled={loading}
                className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 disabled:opacity-60">
                {loading ? <><Loader2 size={16} className="animate-spin" /> Importing...</> : <><Upload size={16} /> Upload Vendors</>}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Mobile card renderers ────────────────────────────────────────────────────
function OrderCards({ orders, onEdit, onStatusChange }) {
  if (orders.length === 0) return <p className="text-center py-10 text-slate-400">No orders found</p>;
  return (
    <div className="space-y-3 p-3">
      {orders.map(o => (
        <div key={o._id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="min-w-0">
              <p className="font-semibold text-slate-800 truncate">{o.items?.[0]?.item_name || '—'}</p>
              <p className="text-sm text-[#137fec]">{o.patient_id?.first_name} {o.patient_id?.last_name}</p>
            </div>
            <button onClick={() => onEdit(o)} className="flex-shrink-0 p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50">
              <Edit size={15}/>
            </button>
          </div>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="text-xs text-slate-500 space-y-0.5">
              <p>{o.vendor_id?.name || '—'}</p>
              <p>{o.order_date ? new Date(o.order_date).toLocaleDateString('en-GB') : '—'}</p>
              {o.cost_to_clinic != null && <p className="font-semibold text-slate-700">₹{o.cost_to_clinic.toLocaleString()}</p>}
            </div>
            <select
              value={o.status}
              onChange={e => onStatusChange(o._id, e.target.value)}
              className={`text-xs font-semibold px-2 py-1 rounded border cursor-pointer outline-none ${STATUS_STYLES[o.status] || STATUS_STYLES['Sent']}`}
            >
              {LAB_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      ))}
    </div>
  );
}

function ItemCards({ items, onEdit }) {
  if (items.length === 0) return <p className="text-center py-10 text-slate-400">No items in catalog</p>;
  return (
    <div className="space-y-3 p-3">
      {items.map(i => (
        <div key={i._id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Package size={14} className="text-slate-400 flex-shrink-0"/>
              <p className="font-semibold text-slate-800 truncate">{i.name}</p>
            </div>
            <div className="mt-1 flex gap-2 flex-wrap text-xs">
              <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600">{i.category}</span>
              <span className="font-bold text-slate-700">₹{i.price?.toLocaleString()}</span>
              {i.turnaround_time && <span className="text-slate-500">{i.turnaround_time}</span>}
            </div>
            {i.preferred_vendor_id?.name && <p className="text-xs text-[#137fec] mt-1">{i.preferred_vendor_id.name}</p>}
          </div>
          <button onClick={() => onEdit(i)} className="flex-shrink-0 p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50"><Edit size={15}/></button>
        </div>
      ))}
    </div>
  );
}

function VendorCards({ vendors, onEdit }) {
  if (vendors.length === 0) return <p className="text-center py-10 text-slate-400">No lab vendors found</p>;
  return (
    <div className="space-y-3 p-3">
      {vendors.map(v => (
        <div key={v._id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-slate-800">{v.name}</p>
            <div className="mt-1 text-xs text-slate-500 space-y-0.5">
              {v.contact_person && <p className="flex items-center gap-1"><User size={11}/>{v.contact_person}</p>}
              {v.phone && <p>{v.phone}</p>}
              {v.email && <p className="text-[#137fec] truncate">{v.email}</p>}
            </div>
          </div>
          <button onClick={() => onEdit(v)} className="flex-shrink-0 p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50"><Edit size={15}/></button>
        </div>
      ))}
    </div>
  );
}

// ─── Multiselect Dropdown ─────────────────────────────────────────────────────
function MultiSelectDropdown({ label, options, selected, onChange, placeholder = 'Select...' }) {
  const [open, setOpen]       = useState(false);
  const [search, setSearch]   = useState('');
  const containerRef          = useRef(null);

  useEffect(() => {
    function handleOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const filtered = options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()));

  function toggle(value) {
    onChange(selected.includes(value) ? selected.filter(v => v !== value) : [...selected, value]);
  }

  function clearAll(e) {
    e.stopPropagation();
    onChange([]);
  }

  const displayText = selected.length === 0
    ? placeholder
    : selected.length === 1
      ? options.find(o => o.value === selected[0])?.label || placeholder
      : `${selected.length} selected`;

  return (
    <div ref={containerRef} className="relative">
      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{label}</p>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border text-sm transition-all ${
          open ? 'border-[#137fec] ring-1 ring-[#137fec]/20' : 'border-slate-200 hover:border-[#137fec]'
        } bg-white`}
      >
        <span className={selected.length > 0 ? 'text-slate-800 font-medium' : 'text-slate-400'}>{displayText}</span>
        <div className="flex items-center gap-1 shrink-0">
          {selected.length > 0 && (
            <span
              onClick={clearAll}
              className="w-4 h-4 rounded-full bg-slate-200 hover:bg-red-100 hover:text-red-500 text-slate-500 flex items-center justify-center text-[10px] font-bold cursor-pointer transition-colors"
            >✕</span>
          )}
          <svg className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
          </svg>
        </div>
      </button>

      {open && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
          {/* Search within dropdown */}
          {options.length > 5 && (
            <div className="p-2 border-b border-slate-100">
              <input
                autoFocus
                type="text"
                placeholder="Search..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-[#137fec]"
              />
            </div>
          )}
          <div className="max-h-48 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-3 py-3 text-sm text-slate-400 text-center">No results</p>
            ) : filtered.map(opt => (
              <label
                key={opt.value}
                className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-blue-50 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(opt.value)}
                  onChange={() => toggle(opt.value)}
                  className="w-4 h-4 accent-[#137fec] cursor-pointer shrink-0"
                />
                <span className={`text-sm ${selected.includes(opt.value) ? 'text-[#137fec] font-medium' : 'text-slate-700'}`}>
                  {opt.label}
                </span>
              </label>
            ))}
          </div>
          {selected.length > 0 && (
            <div className="px-3 py-2 border-t border-slate-100 bg-slate-50 text-xs text-slate-500">
              {selected.length} of {options.length} selected
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Filter Modal ─────────────────────────────────────────────────────────────
function FilterModal({ isOpen, onClose, vendors, items, onApply, activeFilters }) {
  const [selectedVendors,  setSelectedVendors]  = useState(activeFilters.vendors  || []);
  const [selectedItems,    setSelectedItems]    = useState(activeFilters.items    || []);
  const [selectedStatuses, setSelectedStatuses] = useState(activeFilters.statuses || []);

  useEffect(() => {
    if (isOpen) {
      setSelectedVendors(activeFilters.vendors   || []);
      setSelectedItems(activeFilters.items       || []);
      setSelectedStatuses(activeFilters.statuses || []);
    }
  }, [isOpen, activeFilters]);

  if (!isOpen) return null;

  function toggleStatus(value) {
    setSelectedStatuses(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]);
  }

  function handleApply() {
    onApply({ vendors: selectedVendors, items: selectedItems, statuses: selectedStatuses });
    onClose();
  }

  function handleClear() {
    setSelectedVendors([]);
    setSelectedItems([]);
    setSelectedStatuses([]);
  }

  const activeCount = selectedVendors.length + selectedItems.length + selectedStatuses.length;

  const vendorOptions = vendors.map(v => ({ value: v._id, label: v.name }));
  const itemOptions   = [...new Set(items.map(i => i.name))].sort().map(n => ({ value: n, label: n }));

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b bg-slate-50 rounded-t-2xl sm:rounded-t-2xl">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={18} className="text-[#137fec]" />
            <h3 className="text-base font-bold text-slate-800">Filter Orders</h3>
            {activeCount > 0 && (
              <span className="text-xs font-semibold bg-[#137fec] text-white px-2 py-0.5 rounded-full">{activeCount}</span>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-red-50 hover:text-red-500 rounded-full transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-5 space-y-6">
          {/* Status */}
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Status</p>
            <div className="flex flex-wrap gap-2">
              {LAB_STATUSES.map(s => (
                <button
                  key={s}
                  onClick={() => toggleStatus(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    selectedStatuses.includes(s)
                      ? 'bg-[#137fec] text-white border-[#137fec]'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-[#137fec] hover:text-[#137fec]'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Vendor — multiselect dropdown */}
          <MultiSelectDropdown
            label="Lab Vendor"
            options={vendorOptions}
            selected={selectedVendors}
            onChange={setSelectedVendors}
            placeholder={vendors.length === 0 ? 'No vendors available' : 'All vendors'}
          />

          {/* Item — multiselect dropdown */}
          <MultiSelectDropdown
            label="Item"
            options={itemOptions}
            selected={selectedItems}
            onChange={setSelectedItems}
            placeholder={itemOptions.length === 0 ? 'No items in catalog' : 'All items'}
          />
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-slate-50 flex gap-3 rounded-b-2xl">
          <button
            onClick={handleClear}
            disabled={activeCount === 0}
            className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-600 font-semibold text-sm hover:bg-slate-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Clear All
          </button>
          <button
            onClick={handleApply}
            className="flex-1 py-2.5 rounded-xl bg-[#137fec] hover:bg-blue-700 text-white font-bold text-sm shadow-md transition-colors"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function LabOrdersPage() {
  const [activeModule, setActiveModule] = useState('Lab Order');
  const [modalState, setModalState]     = useState({ type: null, data: null });
  const [searchQuery, setSearchQuery]   = useState('');
  const [bulkItemsOpen, setBulkItemsOpen]     = useState(false);
  const [bulkVendorsOpen, setBulkVendorsOpen] = useState(false);
  const [filterOpen, setFilterOpen]               = useState(false);
  const [activeFilters, setActiveFilters]         = useState({ vendors: [], items: [], statuses: [] });
  const [selectedItemCategories, setSelectedItemCategories] = useState([]);

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

  // Filtered data for current tab
  const filteredOrders = orders.filter(o => {
    const q = searchQuery.toLowerCase();
    const name = `${o.patient_id?.first_name || ''} ${o.patient_id?.last_name || ''}`.toLowerCase();
    if (!name.includes(q) && !(o.items?.[0]?.item_name || '').toLowerCase().includes(q)) return false;

    if (activeFilters.statuses.length > 0 && !activeFilters.statuses.includes(o.status)) return false;
    if (activeFilters.vendors.length  > 0 && !activeFilters.vendors.includes(o.vendor_id?._id || o.vendor_id)) return false;
    if (activeFilters.items.length    > 0 && !activeFilters.items.includes(o.items?.[0]?.item_name)) return false;

    return true;
  });

  const totalActiveFilters = activeFilters.vendors.length + activeFilters.items.length + activeFilters.statuses.length;
  const filteredItems = items.filter(i => {
    if (!i.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (selectedItemCategories.length > 0 && !selectedItemCategories.includes(i.category)) return false;
    return true;
  });
  const filteredVendors = vendors.filter(v => v.name.toLowerCase().includes(searchQuery.toLowerCase()));

  function renderDesktopTable() {
    if (loading) return (
      <div className="flex-1 flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-[#137fec]" size={28}/>
      </div>
    );

    if (activeModule === 'Lab Order') {
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
            {filteredOrders.length === 0 ? (
              <tr><td colSpan="7" className="p-10 text-center text-slate-400">No orders found</td></tr>
            ) : filteredOrders.map(o => (
              <tr key={o._id} className="hover:bg-slate-50 text-sm">
                <td className="p-4 text-slate-600">{o.order_date ? new Date(o.order_date).toLocaleDateString('en-GB') : '—'}</td>
                <td className="p-4 text-[#137fec] font-medium">{o.patient_id?.first_name} {o.patient_id?.last_name}</td>
                <td className="p-4 text-slate-900">{o.items?.[0]?.item_name}</td>
                <td className="p-4 text-slate-500">{o.vendor_id?.name || '—'}</td>
                <td className="p-4 font-medium text-slate-700">{o.cost_to_clinic != null ? `₹${o.cost_to_clinic.toLocaleString()}` : '—'}</td>
                <td className="p-4">
                  <select value={o.status} onChange={e => handleStatusChange(o._id, e.target.value)}
                    className={`text-xs font-semibold px-2 py-1 rounded border cursor-pointer outline-none ${STATUS_STYLES[o.status] || STATUS_STYLES['Sent']}`}>
                    {LAB_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td className="p-4 text-center">
                  <button onClick={() => handleEdit(o)} className="text-slate-400 hover:text-blue-600"><Edit size={16}/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    if (activeModule === 'Lab Item') {
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
            {filteredItems.length === 0 ? (
              <tr><td colSpan="6" className="p-10 text-center text-slate-400">No items in catalog</td></tr>
            ) : filteredItems.map(i => (
              <tr key={i._id} className="hover:bg-slate-50 text-sm">
                <td className="p-4 font-bold text-slate-800"><span className="flex items-center gap-2"><Package size={16} className="text-slate-400"/>{i.name}</span></td>
                <td className="p-4"><span className="bg-slate-100 px-2 py-1 rounded text-slate-600 text-xs">{i.category}</span></td>
                <td className="p-4 font-bold text-slate-700">₹{i.price?.toLocaleString()}</td>
                <td className="p-4 text-slate-500">{i.turnaround_time || '—'}</td>
                <td className="p-4 text-[#137fec]">{i.preferred_vendor_id?.name || '—'}</td>
                <td className="p-4 text-center"><button onClick={() => handleEdit(i)} className="text-slate-400 hover:text-blue-600"><Edit size={16}/></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

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
          {filteredVendors.length === 0 ? (
            <tr><td colSpan="5" className="p-10 text-center text-slate-400">No lab vendors found</td></tr>
          ) : filteredVendors.map(v => (
            <tr key={v._id} className="hover:bg-slate-50 text-sm">
              <td className="p-4 font-bold text-slate-800">{v.name}</td>
              <td className="p-4 text-slate-600"><span className="flex items-center gap-2"><User size={14}/>{v.contact_person || '—'}</span></td>
              <td className="p-4 text-slate-600">{v.phone || '—'}</td>
              <td className="p-4 text-[#137fec]">{v.email || '—'}</td>
              <td className="p-4 text-center"><button onClick={() => handleEdit(v)} className="text-slate-400 hover:text-blue-600"><Edit size={16}/></button></td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  function renderMobileCards() {
    if (loading) return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-[#137fec]" size={28}/>
      </div>
    );
    if (activeModule === 'Lab Order') return <OrderCards orders={filteredOrders} onEdit={handleEdit} onStatusChange={handleStatusChange}/>;
    if (activeModule === 'Lab Item')  return <ItemCards  items={filteredItems}   onEdit={handleEdit}/>;
    return <VendorCards vendors={filteredVendors} onEdit={handleEdit}/>;
  }

  const addLabel = activeModule === 'Lab Order' ? 'Order' : activeModule === 'Lab Item' ? 'Item' : 'Vendor';

  return (
    <div className="flex flex-col h-full bg-slate-50 p-3 sm:p-6">
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
      <BulkUploadLabItemsModal
        isOpen={bulkItemsOpen}
        onClose={() => setBulkItemsOpen(false)}
        onSuccess={fetchAll}
      />
      <BulkUploadLabVendorsModal
        isOpen={bulkVendorsOpen}
        onClose={() => setBulkVendorsOpen(false)}
        onSuccess={fetchAll}
      />
      <FilterModal
        isOpen={filterOpen}
        onClose={() => setFilterOpen(false)}
        vendors={labVendors}
        items={items}
        onApply={setActiveFilters}
        activeFilters={activeFilters}
      />

      {/* Top bar: tabs + export */}
      <div className="flex flex-wrap items-center gap-2 mb-4 sm:mb-6">
        <div className="bg-slate-200/60 p-1 sm:p-1.5 rounded-xl inline-flex flex-shrink-0">
          {['Lab Order', 'Lab Item', 'Vendor Labs'].map(tab => (
            <button
              key={tab}
              onClick={() => { setActiveModule(tab); setSearchQuery(''); if (tab !== 'Lab Order') setActiveFilters({ vendors: [], items: [], statuses: [] }); if (tab !== 'Lab Item') setSelectedItemCategories([]); }}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all whitespace-nowrap ${
                activeModule === tab ? 'bg-[#137fec] text-white shadow' : 'text-slate-600 hover:bg-white/50'
              }`}
            >{tab}</button>
          ))}
        </div>
        <button onClick={exportCSV}
          className="ml-auto flex items-center gap-1.5 bg-white border px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-medium hover:border-[#137fec] text-slate-600 flex-shrink-0">
          <Download size={16}/> <span className="hidden xs:inline">Export CSV</span><span className="xs:hidden">Export</span>
        </button>
      </div>

      {/* Toolbar */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border shadow-sm mb-4 sm:mb-6">
        <div className="flex flex-col xs:flex-row xs:items-center gap-3">
          <h2 className="text-base sm:text-xl font-bold text-slate-800 flex-shrink-0">
            {activeModule === 'Lab Order' ? 'Orders' : activeModule === 'Lab Item' ? 'Items Catalog' : 'Lab Directory'}
          </h2>
          <div className="flex items-center gap-2 xs:ml-auto flex-wrap">
            {/* Search */}
            <div className="relative flex-1 xs:flex-none">
              <Search size={16} className="absolute left-3 top-2.5 text-slate-400"/>
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 py-2 border rounded-xl text-sm w-full xs:w-48 sm:w-64 focus:ring-1 focus:ring-[#137fec] outline-none"
              />
            </div>

            {/* Filter button — only shown for Lab Orders */}
            {activeModule === 'Lab Order' && (
              <button
                onClick={() => setFilterOpen(true)}
                className={`relative flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-all ${
                  totalActiveFilters > 0
                    ? 'bg-[#137fec] text-white border-[#137fec] shadow-md'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-[#137fec] hover:text-[#137fec]'
                }`}
              >
                <SlidersHorizontal size={15} />
                <span className="hidden xs:inline">Filters</span>
                {totalActiveFilters > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {totalActiveFilters}
                  </span>
                )}
              </button>
            )}

            {/* Category filter — only shown for Lab Items */}
            {activeModule === 'Lab Item' && (
              <MultiSelectDropdown
                label=""
                options={ITEM_CATEGORIES.map(c => ({ value: c, label: c }))}
                selected={selectedItemCategories}
                onChange={setSelectedItemCategories}
                placeholder="All categories"
              />
            )}

            {/* Bulk Upload */}
            {activeModule === 'Lab Item' && (
              <button onClick={() => setBulkItemsOpen(true)}
                className="flex items-center gap-1.5 bg-[#137fec] text-white px-3 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 shadow-md transition-all whitespace-nowrap">
                <Upload size={14}/> <span className="hidden sm:inline">Bulk Upload</span>
              </button>
            )}
            {activeModule === 'Vendor Labs' && (
              <button onClick={() => setBulkVendorsOpen(true)}
                className="flex items-center gap-1.5 bg-purple-600 text-white px-3 py-2 rounded-xl text-sm font-medium hover:bg-purple-700 shadow-md transition-all whitespace-nowrap">
                <Upload size={14}/> <span className="hidden sm:inline">Bulk Upload</span>
              </button>
            )}

            <button onClick={handleAddNew}
              className="flex items-center gap-1.5 bg-[#137fec] text-white px-3 sm:px-5 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 shadow-md whitespace-nowrap">
              <Plus size={16}/> Add {addLabel}
            </button>
          </div>
        </div>
      </div>

      {/* Table (desktop) / Cards (mobile) */}
      <div className="flex-1 bg-white border rounded-xl shadow-sm overflow-auto">
        {/* Mobile cards */}
        <div className="sm:hidden">
          {renderMobileCards()}
        </div>
        {/* Desktop table */}
        <div className="hidden sm:block h-full overflow-auto">
          {renderDesktopTable()}
        </div>
      </div>
    </div>
  );
}
