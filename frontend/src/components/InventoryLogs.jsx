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
const InventoryLogs = ({ medicineEnabled = true, consumableEnabled = true }) => {
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
    if (!itemType) return true;
    if (itemType === 'Pharmacy') return medicineEnabled;
    if (itemType === 'Consumable' || itemType === 'Asset') return consumableEnabled;
    return true;
  });

  // Expose refresh function to parent via ref if needed, 
  // but for now, we rely on the parent page re-mounting or using a global context.
  // Alternatively, we can export a context or pass a refresh trigger.
  // *To make the Add Button work, we need to pass a callback to the parent page.*

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden h-full flex flex-col">
      <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
        <h3 className="font-bold text-slate-700">Inventory Transactions</h3>
        <button onClick={fetchLogs} className="text-xs text-blue-600 hover:underline">Refresh</button>
      </div>
      
      <div className="overflow-auto flex-1">
        {loading ? (
            <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-slate-400"/></div>
        ) : (
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
                    <td className="p-4 text-center">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold border ${log.type === 'Stock In' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                        {log.type === 'Stock In' ? <ArrowDownLeft size={12}/> : <ArrowUpRight size={12}/>}
                        {log.type}
                    </span>
                    </td>
                    <td className={`p-4 text-right font-bold ${log.type === 'Stock In' ? 'text-green-600' : 'text-red-600'}`}>
                    {log.type === 'Stock In' ? '+' : '-'}{log.quantity}
                    </td>
                    <td className="p-4 text-right font-mono text-slate-600">
                        {new Date(log.date).toLocaleDateString()}
                    </td>
                </tr>
                ))}
                {logs.length === 0 && (
                    <tr><td colSpan="6" className="p-6 text-center text-slate-400">No transactions found.</td></tr>
                )}
            </tbody>
            </table>
        )}
      </div>
    </div>
  );
};

export default InventoryLogs;