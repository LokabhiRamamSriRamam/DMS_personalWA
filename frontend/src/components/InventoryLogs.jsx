import React, { useState, useEffect } from 'react';
import { ArrowUpRight, ArrowDownLeft, X, Save, Loader2 } from 'lucide-react';
import API from '../services/api';

// --- ADD LOG MODAL (Exported) ---
export const AddLogModal = ({ isOpen, onClose, onSave }) => {
  const [logType, setLogType] = useState('Stock In'); // Backend expects 'Stock In' / 'Stock Out'
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    itemId: '',
    qty: '',
    date: new Date().toISOString().split('T')[0],
    reason: '',
    notes: ''
  });

  // Fetch Items for Dropdown when modal opens
  useEffect(() => {
    if (isOpen) {
      API.get('/inventory')
        .then(res => setItems(res.data))
        .catch(err => console.error("Failed to load items", err));
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if(!formData.itemId || !formData.qty) return alert("Please fill required fields");

    setLoading(true);
    try {
        const payload = {
            item_id: formData.itemId,
            type: logType, // 'Stock In' or 'Stock Out'
            qty: Number(formData.qty),
            reason: 'Adjustment', // Hardcoded or add specific reasons if needed
            notes: formData.notes,
            date: formData.date
        };

        await API.post('/inventory/adjust', payload);
        onSave(); // Refresh logs
        onClose();
        // Reset Form
        setFormData({ itemId: '', qty: '', date: new Date().toISOString().split('T')[0], reason: '', notes: '' });
    } catch (err) {
        alert("Failed to adjust stock");
        console.error(err);
    } finally {
        setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden flex flex-col shadow-2xl">
        
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
          <h3 className="font-bold text-lg text-slate-800">Manual Stock Adjustment</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-red-500 transition-colors">
            <X size={20}/>
          </button>
        </div>

        <form className="p-6 space-y-4" onSubmit={handleSubmit}>
          
          {/* Transaction Type Toggle */}
          <div className="flex p-1 bg-slate-100 rounded-xl">
            <button 
              type="button"
              onClick={() => setLogType('Stock In')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-semibold rounded-lg transition-all ${
                logType === 'Stock In' ? 'bg-white text-green-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <ArrowDownLeft size={16} /> Stock In
            </button>
            <button 
              type="button"
              onClick={() => setLogType('Stock Out')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-semibold rounded-lg transition-all ${
                logType === 'Stock Out' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <ArrowUpRight size={16} /> Stock Out
            </button>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Select Item</label>
            <select 
                value={formData.itemId} 
                onChange={e => setFormData({...formData, itemId: e.target.value})}
                className="w-full border border-slate-300 p-2.5 rounded-xl text-sm focus:ring-2 focus:ring-[#137fec] outline-none bg-white"
            >
              <option value="">Select Item to Adjust...</option>
              {items.map(item => (
                  <option key={item._id} value={item._id}>
                      {item.name} (Curr: {item.stock_on_hand} {item.unit})
                  </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Quantity</label>
              <input 
                type="number" 
                value={formData.qty}
                onChange={e => setFormData({...formData, qty: e.target.value})}
                placeholder="0" 
                className="w-full border border-slate-300 p-2.5 rounded-xl text-sm focus:ring-2 focus:ring-[#137fec] outline-none" 
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Date</label>
              <input 
                type="date" 
                value={formData.date}
                onChange={e => setFormData({...formData, date: e.target.value})}
                className="w-full border border-slate-300 p-2.5 rounded-xl text-sm focus:ring-2 focus:ring-[#137fec] outline-none" 
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Reason / Note</label>
            <textarea 
                value={formData.notes}
                onChange={e => setFormData({...formData, notes: e.target.value})}
                rows="2" 
                placeholder="e.g. Broken during transport, Expired..." 
                className="w-full border border-slate-300 p-2.5 rounded-xl text-sm focus:ring-2 focus:ring-[#137fec] outline-none resize-none"
            ></textarea>
          </div>

          <button disabled={loading} type="submit" className={`w-full py-3 rounded-xl font-bold text-white shadow-lg flex items-center justify-center gap-2 transition-colors ${logType === 'Stock In' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'} ${loading ? 'opacity-70' : ''}`}>
            {loading ? <Loader2 className="animate-spin" size={18}/> : <Save size={18} />} 
            {loading ? 'Saving...' : 'Save Adjustment'}
          </button>

        </form>
      </div>
    </div>
  );
};

// --- MAIN LOGS COMPONENT ---
const InventoryLogs = ({ medicineEnabled = true, consumableEnabled = true, searchQuery = '', logTypeFilter = '', logCategoryFilter = '' }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    try {
        const { data } = await API.get('/inventory/logs');
        setLogs(data);
    } catch (err) {
        console.error("Failed to load logs", err);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // Filter logs to hide rows whose item type is disabled.
  // Rows whose item_id is missing/null are kept (cannot determine type).
  const visibleLogs = logs.filter(log => {
    const itemType = log.item_id?.type;
    const categoryEnabled = !itemType ||
                          (itemType === 'Pharmacy' ? medicineEnabled : true) ||
                          ((itemType === 'Consumable' || itemType === 'Asset') ? consumableEnabled : true);
    const matchesSearch = log.item_id?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          log.reason.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          log.notes?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLogType = !logTypeFilter || log.type === logTypeFilter;
    const matchesCategory = !logCategoryFilter || itemType === logCategoryFilter;
    return categoryEnabled && matchesSearch && matchesLogType && matchesCategory;
  });

  // Expose refresh function to parent via ref if needed, 
  // but for now, we rely on the parent page re-mounting or using a global context.
  // Alternatively, we can export a context or pass a refresh trigger.
  // *To make the Add Button work, we need to pass a callback to the parent page.*

  const TypeBadge = ({ type }) => (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold border ${type === 'Stock In' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
      {type === 'Stock In' ? <ArrowDownLeft size={11}/> : <ArrowUpRight size={11}/>}
      {type}
    </span>
  );

  if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-slate-400"/></div>;

  return (
    <>
      {/* ── Mobile: cards ── */}
      <div className="sm:hidden flex flex-col gap-0 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-3 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
          <h3 className="font-bold text-slate-700 text-sm">Inventory Transactions</h3>
          <button onClick={fetchLogs} className="text-xs text-blue-600 hover:underline">Refresh</button>
        </div>
        <div className="divide-y divide-slate-100">
          {visibleLogs.length === 0
            ? <p className="p-4 text-center text-xs text-slate-400">No transactions found.</p>
            : visibleLogs.map(log => (
              <div key={log._id} className="p-3 flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-semibold text-slate-700 truncate">{log.item_id?.name || 'Unknown Item'}</p>
                    <TypeBadge type={log.type} />
                  </div>
                  <p className="text-xs text-slate-500">{log.reason}{log.notes ? ` · ${log.notes}` : ''}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{log.item_id?.type} · {new Date(log.date).toLocaleDateString()}</p>
                </div>
                <p className={`font-bold flex-shrink-0 ${log.type === 'Stock In' ? 'text-green-600' : 'text-red-600'}`}>
                  {log.type === 'Stock In' ? '+' : '-'}{log.quantity}
                </p>
              </div>
            ))
          }
        </div>
      </div>

      {/* ── Desktop: table ── */}
      <div className="hidden sm:flex flex-col bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden h-full">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
          <h3 className="font-bold text-slate-700">Inventory Transactions</h3>
          <button onClick={fetchLogs} className="text-xs text-blue-600 hover:underline">Refresh</button>
        </div>
        <div className="overflow-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 sticky top-0 z-10 text-xs font-semibold text-slate-500 uppercase">
              <tr>
                <th className="p-4 w-16">S.No</th>
                <th className="p-4">Reason / Notes</th>
                <th className="p-4">Item Details</th>
                <th className="p-4 text-center">Type</th>
                <th className="p-4 text-right">Qty</th>
                <th className="p-4 text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleLogs.map((log, index) => (
                <tr key={log._id} className="hover:bg-slate-50 text-sm">
                  <td className="p-4 text-slate-400">{index + 1}</td>
                  <td className="p-4">
                    <div className="font-medium text-slate-800">{log.reason}</div>
                    <div className="text-xs text-slate-500 italic">{log.notes || '-'}</div>
                  </td>
                  <td className="p-4">
                    <div className="text-slate-700 font-medium">{log.item_id?.name || 'Unknown Item'}</div>
                    <div className="text-xs text-slate-400 font-mono">Category: {log.item_id?.type}</div>
                  </td>
                  <td className="p-4 text-center"><TypeBadge type={log.type} /></td>
                  <td className={`p-4 text-right font-bold ${log.type === 'Stock In' ? 'text-green-600' : 'text-red-600'}`}>
                    {log.type === 'Stock In' ? '+' : '-'}{log.quantity}
                  </td>
                  <td className="p-4 text-right font-mono text-slate-600">{new Date(log.date).toLocaleDateString()}</td>
                </tr>
              ))}
              {logs.length === 0 && <tr><td colSpan="6" className="p-6 text-center text-slate-400">No transactions found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default InventoryLogs;