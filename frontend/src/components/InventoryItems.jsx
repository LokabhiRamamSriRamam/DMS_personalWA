import React, { useState, useEffect, useRef } from 'react';
import { Pill, Syringe, Plus, X, Edit, Trash2, Loader2, Upload, ExternalLink, CheckCircle, AlertCircle } from 'lucide-react';
import API from '../services/api';

// ─── Shared internal result/error display ─────────────────────────────────
const UploadResult = ({ result }) => (
  <div className="bg-green-50 border border-green-100 rounded-xl p-4 flex flex-col gap-2">
    <div className="flex items-center gap-2">
      <CheckCircle size={16} className="text-green-600" />
      <p className="text-sm font-bold text-green-700">Upload Complete</p>
    </div>
    <div className="grid grid-cols-3 gap-2 text-center">
      {[
        { label: 'Total Rows', val: result.total,    color: 'text-slate-700'  },
        { label: 'Inserted',   val: result.inserted, color: 'text-green-700'  },
        { label: 'Skipped',    val: result.skipped,  color: 'text-orange-600' },
      ].map(s => (
        <div key={s.label} className="bg-white rounded-lg p-2 border border-green-100">
          <p className={`text-xl font-bold ${s.color}`}>{s.val}</p>
          <p className="text-[11px] text-slate-400">{s.label}</p>
        </div>
      ))}
    </div>
    {result.skippedDetails?.length > 0 && (
      <details className="text-xs text-slate-500 mt-1">
        <summary className="cursor-pointer font-medium text-slate-600">View skipped ({result.skippedDetails.length})</summary>
        <ul className="mt-1 pl-3 list-disc">
          {result.skippedDetails.slice(0, 20).map((s, i) => (
            <li key={i}><span className="font-medium">{s.name || '(empty)'}</span> — {s.reason}</li>
          ))}
        </ul>
      </details>
    )}
  </div>
);

// ─── BULK UPLOAD — MEDICINES (Pharmacy) ────────────────────────────────────
export const BulkUploadMedicinesModal = ({ isOpen, onClose, onSuccess }) => {
  const [sheetUrl, setSheetUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState(null);
  const [error, setError]     = useState('');

  useEffect(() => { if (isOpen) { setSheetUrl(''); setResult(null); setError(''); } }, [isOpen]);

  const handleUpload = async () => {
    if (!sheetUrl.trim()) { setError('Please enter a Google Sheets URL.'); return; }
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await API.post('/inventory/bulk-upload-medicines', { sheetUrl });
      setResult(res.data);
      if (res.data.inserted > 0 && onSuccess) onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed. Please try again.');
    } finally { setLoading(false); }
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#137fec]/10 rounded-lg"><Upload size={18} className="text-[#137fec]" /></div>
            <div>
              <h3 className="font-bold text-slate-800">Bulk Upload Medicines</h3>
              <p className="text-xs text-slate-500">Import Pharmacy items from Google Sheets</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-red-500 transition-colors"><X size={20} /></button>
        </div>

        <div className="p-6 flex flex-col gap-5">
          {/* Format */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
            <p className="text-xs font-bold text-blue-700 uppercase mb-2">Required Column Headers</p>
            <div className="overflow-x-auto">
              <table className="text-[11px] w-full border-collapse">
                <thead>
                  <tr className="bg-blue-100">
                    {['Name', 'Composition', 'Manufacturer', 'Category', 'Cost Price', 'Selling Price'].map(h => (
                      <th key={h} className="px-2 py-1.5 text-left font-bold text-blue-800 border border-blue-200 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-white">
                    {['Amoxicillin 500mg', 'Amoxicillin', 'Cipla', 'Antibiotic', '12', '20'].map((v, i) => (
                      <td key={i} className="px-2 py-1 text-slate-500 italic border border-blue-100 whitespace-nowrap">{v}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-blue-600 mt-2">⚠️ Sheet must be <strong>"Anyone with the link can view"</strong>. Duplicates are auto-skipped.</p>
          </div>

          {/* URL */}
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
                className="flex-1 py-2.5 rounded-xl bg-[#137fec] hover:bg-blue-700 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-60">
                {loading ? <><Loader2 size={16} className="animate-spin" /> Importing...</> : <><Upload size={16} /> Upload Medicines</>}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── BULK UPLOAD — CONSUMABLES ─────────────────────────────────────────────
export const BulkUploadConsumablesModal = ({ isOpen, onClose, onSuccess }) => {
  const [sheetUrl, setSheetUrl] = useState('');
  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState(null);
  const [error, setError]       = useState('');

  useEffect(() => { if (isOpen) { setSheetUrl(''); setResult(null); setError(''); } }, [isOpen]);

  const handleUpload = async () => {
    if (!sheetUrl.trim()) { setError('Please enter a Google Sheets URL.'); return; }
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await API.post('/inventory/bulk-upload-consumables', { sheetUrl });
      setResult(res.data);
      if (res.data.inserted > 0 && onSuccess) onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed. Please try again.');
    } finally { setLoading(false); }
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden flex flex-col shadow-2xl">
        {/* Header — teal theme */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-teal-50 to-emerald-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-600/10 rounded-lg"><Upload size={18} className="text-teal-600" /></div>
            <div>
              <h3 className="font-bold text-slate-800">Bulk Upload Consumables</h3>
              <p className="text-xs text-slate-500">Import Consumable items from Google Sheets</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-red-500 transition-colors"><X size={20} /></button>
        </div>

        <div className="p-6 flex flex-col gap-5">
          {/* Format */}
          <div className="bg-teal-50 border border-teal-100 rounded-xl p-4">
            <p className="text-xs font-bold text-teal-700 uppercase mb-2">Required Column Headers</p>
            <div className="overflow-x-auto">
              <table className="text-[11px] w-full border-collapse">
                <thead>
                  <tr className="bg-teal-100">
                    {['Name', 'Category', 'Cost Price', 'Min Consumption'].map(h => (
                      <th key={h} className="px-2 py-1.5 text-left font-bold text-teal-800 border border-teal-200 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-white">
                    {['Dental Gloves (S)', 'Protective Gear', '3', '2'].map((v, i) => (
                      <td key={i} className="px-2 py-1 text-slate-500 italic border border-teal-100 whitespace-nowrap">{v}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-teal-600 mt-2">⚠️ Sheet must be <strong>"Anyone with the link can view"</strong>. <strong>Min Consumption</strong> = units used per treatment. Duplicates are auto-skipped.</p>
          </div>

          {/* URL */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase">Google Sheets URL</label>
            <input type="url" placeholder="https://docs.google.com/spreadsheets/d/..." value={sheetUrl}
              onChange={e => setSheetUrl(e.target.value)}
              className="w-full border border-slate-300 p-2.5 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
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
                className="flex-1 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-60">
                {loading ? <><Loader2 size={16} className="animate-spin" /> Importing...</> : <><Upload size={16} /> Upload Consumables</>}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- ADD/EDIT ITEM MODAL ---
export const AddItemModal = ({ isOpen, onClose, editItem, onSave }) => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('Pharmacy'); 
  
  const [formData, setFormData] = useState({
    name: '', company: '', content: '', category: '',
    costPrice: '', sellingPrice: '',
    currentStock: '',
    minStock: '',
    consumptionUnit: ''
  });

  useEffect(() => {
    if (isOpen) {
      if (editItem) {
        setActiveTab(editItem.type);
        setFormData({
          name: editItem.name || '',
          company: editItem.manufacturer || '',
          content: editItem.composition || '',
          category: editItem.category || '',
          costPrice: editItem.cost_price || '',
          sellingPrice: editItem.selling_price || '',
          currentStock: editItem.stock_on_hand || 0,
          minStock: editItem.min_stock_level || '',
          consumptionUnit: editItem.consumption_unit || ''
        });
      } else {
        setFormData({ name: '', company: '', content: '', category: '', costPrice: '', sellingPrice: '', currentStock: '', minStock: '', consumptionUnit: '' });
        setActiveTab('Pharmacy');
      }
    }
  }, [isOpen, editItem]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
        const payload = {
            name: formData.name,
            type: activeTab,
            category: formData.category,
            manufacturer: formData.company,
            composition: formData.content,
            cost_price: Number(formData.costPrice),
            selling_price: activeTab === 'Pharmacy' ? Number(formData.sellingPrice) : 0,
            min_stock_level: Number(formData.minStock),
            stock_on_hand: Number(formData.currentStock)
        };

        if (activeTab === 'Consumable' && formData.consumptionUnit) {
            payload.consumption_unit = Number(formData.consumptionUnit);
        }

        if (editItem) {
            await API.put(`/inventory/${editItem._id}`, payload);
        } else {
            await API.post('/inventory', payload);
        }

        if (typeof onSave === 'function') onSave();
        onClose();
    } catch (err) {
        console.error(err);
        alert("Failed to save item");
    } finally {
        setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={(e) => e.stopPropagation()}>
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden flex flex-col shadow-2xl">
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
          <h3 className="font-bold text-lg text-slate-800">{editItem ? 'Edit Item' : 'Add New Item'}</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-red-500 transition-colors"><X size={20}/></button>
        </div>
        <div className="p-6">
          {!editItem && (
              <div className="flex p-1 bg-slate-100 rounded-xl mb-5">
                {['Pharmacy', 'Consumable'].map(tab => (
                  <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === tab ? (tab === 'Pharmacy' ? 'bg-white text-[#137fec] shadow-sm' : 'bg-white text-teal-600 shadow-sm') : 'text-slate-500 hover:text-slate-700'}`}>
                    {tab === 'Pharmacy' ? <Pill size={16} /> : <Syringe size={16} />} {tab}
                  </button>
                ))}
              </div>
          )}
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Item Name</label>
              <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border border-slate-300 p-2.5 rounded-xl text-sm focus:ring-2 focus:ring-[#137fec] outline-none" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Brand / Company</label>
              <input type="text" value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} className="w-full border border-slate-300 p-2.5 rounded-xl text-sm focus:ring-2 focus:ring-[#137fec] outline-none" />
            </div>
            {activeTab === 'Pharmacy' && (
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Salt / Composition</label>
                <input type="text" value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} className="w-full border border-slate-300 p-2.5 rounded-xl text-sm focus:ring-2 focus:ring-[#137fec] outline-none" />
              </div>
            )}

            {activeTab === 'Consumable' && (
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block text-teal-600">Min Consumption per Treatment</label>
                <input type="number" step="0.01" placeholder="e.g., 0.1" value={formData.consumptionUnit} onChange={e => setFormData({...formData, consumptionUnit: e.target.value})} className="w-full border border-teal-200 bg-teal-50 p-2.5 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
               <div className="col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Category</label>
                  <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full border border-slate-300 p-2.5 rounded-xl text-sm focus:ring-2 focus:ring-[#137fec] outline-none bg-white">
                    <option value="">Select...</option>
                    {activeTab === 'Pharmacy' ? (<><option>Antibiotic</option><option>Painkiller</option><option>Supplement</option></>) : (<><option>Protective Gear</option><option>Sterilization</option></>)}
                  </select>
               </div>
            </div>
            
            {/* PRICING ROW */}
            <div className={`grid ${activeTab === 'Pharmacy' ? 'grid-cols-3' : 'grid-cols-2'} gap-3`}>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block text-blue-600">Cost Price</label>
                <input type="number" required value={formData.costPrice} onChange={e => setFormData({...formData, costPrice: e.target.value})} placeholder="Buy @" className="w-full border border-blue-200 bg-blue-50 p-2.5 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              
              {activeTab === 'Pharmacy' && (
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block text-green-600">Selling Price</label>
                    <input type="number" value={formData.sellingPrice} onChange={e => setFormData({...formData, sellingPrice: e.target.value})} placeholder="Sell @" className="w-full border border-green-200 bg-green-50 p-2.5 rounded-xl text-sm focus:ring-2 focus:ring-green-500 outline-none" />
                </div>
              )}
            </div>

            {/* STOCK ROW - NEW */}
            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
               <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Current Stock</label>
                  <input type="number" value={formData.currentStock} onChange={e => setFormData({...formData, currentStock: e.target.value})} placeholder="Qty" className="w-full border border-slate-300 p-2.5 rounded-xl text-sm focus:ring-2 focus:ring-slate-500 outline-none" />
               </div>
               <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block text-orange-600">Min Alert Level</label>
                  <input type="number" value={formData.minStock} onChange={e => setFormData({...formData, minStock: e.target.value})} placeholder="Alert @" className="w-full border border-orange-200 bg-white p-2.5 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 outline-none" />
               </div>
            </div>

            <button disabled={loading} type="submit" className={`w-full py-3 rounded-xl font-bold text-white shadow-lg mt-2 transition-colors ${activeTab === 'Pharmacy' ? 'bg-[#137fec] hover:bg-blue-700' : 'bg-teal-600 hover:bg-teal-700'} ${loading ? 'opacity-70' : ''}`}>
              {loading ? 'Saving...' : (editItem ? 'Update Item' : `Save ${activeTab} Item`)}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

// --- MAIN COMPONENT ---
const InventoryItems = ({ SectionHeader, medicineEnabled = true, consumableEnabled = true }) => {
  const [items, setItems] = useState({ pharmacy: [], consumables: [] });
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen]             = useState(false);
  const [editingItem, setEditingItem]             = useState(null);
  const [isBulkMedOpen, setIsBulkMedOpen]         = useState(false);
  const [isBulkConOpen, setIsBulkConOpen]         = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const contextMenuRef = useRef(null);

  const fetchInventory = async () => {
    setLoading(true);
    try {
        const { data } = await API.get('/inventory');
        const pharmacy = data.filter(i => i.type === 'Pharmacy');
        const consumables = data.filter(i => i.type === 'Consumable' || i.type === 'Asset');
        setItems({ pharmacy, consumables });
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { fetchInventory(); }, []);

  useEffect(() => {
    const handleClick = (e) => { if (contextMenu) setContextMenu(null); };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [contextMenu]);

  const handleContextMenu = (e, item) => {
    e.preventDefault(); 
    setContextMenu({ x: e.pageX, y: e.pageY, item: item });
  };

  const handleEdit = () => {
    if (contextMenu) {
      setEditingItem(contextMenu.item);
      setIsModalOpen(true);
      setContextMenu(null);
    }
  };

  const handleDelete = async () => {
    if (contextMenu && window.confirm(`Delete "${contextMenu.item.name}"?`)) {
        try { await API.delete(`/inventory/${contextMenu.item._id}`); fetchInventory(); } 
        catch(err) { console.error(err); }
    }
    setContextMenu(null);
  };

  const SECTIONS = [
    medicineEnabled && { type: 'pharmacy', t: 'Pharmacy Items', i: Pill, d: items.pharmacy, c: 'bg-blue-50/50' },
    consumableEnabled && { type: 'consumable', t: 'Consumable Items', i: Syringe, d: items.consumables, c: 'bg-teal-50/50' }
  ].filter(Boolean);

  if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-slate-400"/></div>;

  return (
    <>
      <div className="h-full flex flex-col relative" onClick={() => setContextMenu(null)}>
        <div className={`grid grid-cols-1 ${SECTIONS.length > 1 ? 'lg:grid-cols-2' : ''} gap-6 flex-1 min-h-0`}>
          {SECTIONS.map((sec, idx) => (
            <div key={idx} className="flex flex-col bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden h-full">
              {/* Section header with Bulk Upload button for pharmacy */}
              <div className={`flex items-center justify-between p-3 border-b border-slate-200 ${sec.c}`}>
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-white/60 rounded-lg shadow-sm">
                    <sec.i size={16} className="text-slate-700" />
                  </div>
                  <h3 className="font-bold text-slate-800 text-sm">{sec.t}</h3>
                </div>
                <div className="flex items-center gap-2">
                  {sec.type === 'pharmacy' && (
                    <button
                      onClick={() => setIsBulkMedOpen(true)}
                      className="flex items-center gap-1.5 px-2.5 py-1 bg-[#137fec] hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold shadow-sm transition-colors"
                    >
                      <Upload size={12} /> Bulk Upload
                    </button>
                  )}
                  {sec.type === 'consumable' && (
                    <button
                      onClick={() => setIsBulkConOpen(true)}
                      className="flex items-center gap-1.5 px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-[11px] font-bold shadow-sm transition-colors"
                    >
                      <Upload size={12} /> Bulk Upload
                    </button>
                  )}
                  <span className="bg-white/50 px-2 py-0.5 rounded text-xs font-semibold text-slate-600">{sec.d.length} Items</span>
                </div>
              </div>
              <div className="overflow-auto flex-1">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 sticky top-0 z-10 text-[11px] font-bold text-slate-500 uppercase">
                    <tr>
                      <th className="p-3">Name & Company</th>
                      <th className="p-3">Category</th>
                      {sec.type === 'consumable' && <th className="p-3 text-center text-teal-600">Unit</th>}
                      <th className="p-3 text-right text-blue-600">Cost</th>
                      {sec.type === 'pharmacy' && <th className="p-3 text-right text-green-600">SP</th>}
                      <th className="p-3 text-right">Stock / Min</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {sec.d.map((item, i) => (
                      <tr key={item._id} onContextMenu={(e) => handleContextMenu(e, item)} className="hover:bg-slate-50 cursor-context-menu transition-colors select-none">
                        <td className="p-3">
                          <div className="font-bold text-slate-700">{item.name}</div>
                          <div className="text-xs text-slate-500">{item.manufacturer}</div>
                        </td>
                        <td className="p-3"><span className="bg-slate-100 px-2 py-1 rounded text-xs border border-slate-200">{item.category}</span></td>
                        {sec.type === 'consumable' && <td className="p-3 text-center"><span className="bg-teal-100 px-2 py-1 rounded text-xs border border-teal-200 text-teal-700 font-medium">{item.consumption_unit ? `${item.consumption_unit}` : '-'}</span></td>}
                        <td className="p-3 text-right font-medium text-slate-600">₹{item.cost_price || 0}</td>
                        {sec.type === 'pharmacy' && <td className="p-3 text-right font-medium text-green-700">₹{item.selling_price || 0}</td>}

                        <td className="p-3 text-right">
                          <div className="flex flex-col items-end">
                              <span className={`font-bold text-md ${item.stock_on_hand <= item.min_stock_level ? 'text-red-600' : 'text-slate-800'}`}>
                                  {item.stock_on_hand}
                              </span>
                              <span className="text-[10px] text-slate-400">Min: {item.min_stock_level}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
        {contextMenu && (
          <div ref={contextMenuRef} className="fixed bg-white border border-slate-200 shadow-xl rounded-lg py-1 w-40 z-50 animate-in fade-in zoom-in-95 duration-100" style={{ top: contextMenu.y, left: contextMenu.x }} onClick={(e) => e.stopPropagation()}>
            <button onClick={handleEdit} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"><Edit size={14} /> Edit Item</button>
            <div className="h-px bg-slate-100 my-1"></div>
            <button onClick={handleDelete} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"><Trash2 size={14} /> Delete</button>
          </div>
        )}
      </div>
      <AddItemModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} editItem={editingItem} onSave={fetchInventory} />
      <BulkUploadMedicinesModal
        isOpen={isBulkMedOpen}
        onClose={() => setIsBulkMedOpen(false)}
        onSuccess={fetchInventory}
      />
      <BulkUploadConsumablesModal
        isOpen={isBulkConOpen}
        onClose={() => setIsBulkConOpen(false)}
        onSuccess={fetchInventory}
      />
    </>
  );
};

export default InventoryItems;