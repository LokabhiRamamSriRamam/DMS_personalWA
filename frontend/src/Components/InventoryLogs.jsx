import React, { useState } from 'react';
import { ArrowUpRight, ArrowDownLeft, X, Save } from 'lucide-react';

const MOCK_LOGS = [
  { id: 1, type: 'Deduction', reason: 'Order #ORD-992 - Avtansh', itemId: 101, itemName: 'Amoxicillin 500mg', qty: 10, remaining: 540, date: '26 Dec, 10:30 AM' },
  { id: 2, type: 'Addition', reason: 'Purchase - Invoice #INV-202', itemId: 101, itemName: 'Amoxicillin 500mg', qty: 500, remaining: 1040, date: '25 Dec, 04:00 PM' },
];

// --- ADD LOG MODAL (Exported) ---
export const AddLogModal = ({ isOpen, onClose }) => {
  const [logType, setLogType] = useState('Deduction'); // 'Addition' or 'Deduction'
  
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

        <form className="p-6 space-y-4" onSubmit={(e) => { e.preventDefault(); onClose(); }}>
          
          {/* Transaction Type Toggle */}
          <div className="flex p-1 bg-slate-100 rounded-xl">
            <button 
              type="button"
              onClick={() => setLogType('Addition')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-semibold rounded-lg transition-all ${
                logType === 'Addition' ? 'bg-white text-green-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <ArrowDownLeft size={16} /> Stock In
            </button>
            <button 
              type="button"
              onClick={() => setLogType('Deduction')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-semibold rounded-lg transition-all ${
                logType === 'Deduction' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <ArrowUpRight size={16} /> Stock Out
            </button>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Select Item</label>
            <select className="w-full border border-slate-300 p-2.5 rounded-xl text-sm focus:ring-2 focus:ring-[#137fec] outline-none bg-white">
              <option value="">Select Item to Adjust...</option>
              <option value="101">Amoxicillin 500mg</option>
              <option value="201">Latex Gloves (M)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Quantity</label>
              <input type="number" placeholder="0" className="w-full border border-slate-300 p-2.5 rounded-xl text-sm focus:ring-2 focus:ring-[#137fec] outline-none" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Date</label>
              <input type="date" className="w-full border border-slate-300 p-2.5 rounded-xl text-sm focus:ring-2 focus:ring-[#137fec] outline-none" defaultValue={new Date().toISOString().split('T')[0]} />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Reason / Note</label>
            <textarea rows="2" placeholder="e.g. Broken during transport, Expired..." className="w-full border border-slate-300 p-2.5 rounded-xl text-sm focus:ring-2 focus:ring-[#137fec] outline-none resize-none"></textarea>
          </div>

          <button type="submit" className={`w-full py-3 rounded-xl font-bold text-white shadow-lg flex items-center justify-center gap-2 transition-colors ${logType === 'Addition' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>
            <Save size={18} /> Save Adjustment
          </button>

        </form>
      </div>
    </div>
  );
};

// --- MAIN LOGS COMPONENT ---
const InventoryLogs = () => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden h-full flex flex-col">
      <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
        <h3 className="font-bold text-slate-700">Inventory Transactions</h3>
        <div className="text-xs text-slate-500">Last 30 days</div>
      </div>
      <div className="overflow-auto flex-1">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 sticky top-0 z-10 text-xs font-semibold text-slate-500 uppercase">
            <tr>
              <th className="p-4 w-16">S.No</th>
              <th className="p-4">Reason / Order Details</th>
              <th className="p-4">Item Details</th>
              <th className="p-4 text-center">Type</th>
              <th className="p-4 text-right">Qty</th>
              <th className="p-4 text-right">Rem. Stock</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {MOCK_LOGS.map((log, index) => (
              <tr key={log.id} className="hover:bg-slate-50 text-sm">
                <td className="p-4 text-slate-400">{index + 1}</td>
                <td className="p-4">
                  <div className="font-medium text-slate-800">{log.reason}</div>
                  <div className="text-xs text-slate-400">{log.date}</div>
                </td>
                <td className="p-4">
                  <div className="text-slate-700 font-medium">{log.itemName}</div>
                  <div className="text-xs text-slate-400 font-mono">ID: #{log.itemId}</div>
                </td>
                <td className="p-4 text-center">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold border ${log.type === 'Addition' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                    {log.type === 'Addition' ? <ArrowDownLeft size={12}/> : <ArrowUpRight size={12}/>}
                    {log.type}
                  </span>
                </td>
                <td className={`p-4 text-right font-bold ${log.type === 'Addition' ? 'text-green-600' : 'text-red-600'}`}>
                  {log.type === 'Addition' ? '+' : '-'}{log.qty}
                </td>
                <td className="p-4 text-right font-mono text-slate-600 bg-slate-50/50">{log.remaining}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InventoryLogs;