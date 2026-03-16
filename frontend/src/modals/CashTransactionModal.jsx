import React, { useState, useEffect } from 'react';
import { X, DollarSign, TrendingUp, TrendingDown, User, FileText } from 'lucide-react';
import API from '../services/api';

const CashTransactionModal = ({ isOpen, onClose, onSave }) => {
  const [type, setType] = useState('Expense'); // Default: Cash Out (Expense)
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    amount: '',
    category: '',
    payment_method: 'Cash',
    party_name: '', // For "Payee" or "Payer"
    notes: '',
    date: new Date().toISOString().split('T')[0]
  });

  // Reset form when opening
  useEffect(() => {
    if (isOpen) {
      setType('Expense');
      setFormData({
        amount: '',
        category: '',
        payment_method: 'Cash',
        party_name: '',
        notes: '',
        date: new Date().toISOString().split('T')[0]
      });
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Payload matching models/Transaction.js
      const payload = {
        type: type, // 'Income' or 'Expense'
        category: formData.category,
        amount: parseFloat(formData.amount),
        payment_method: formData.payment_method,
        date: formData.date,
        party_name: formData.party_name,
        notes: formData.notes
      };

      const res = await API.post('/transactions', payload);
      
      if (onSave) onSave(res.data);
      onClose();
    } catch (err) {
      console.error("Transaction failed", err);
      alert("Failed to save transaction.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-lg text-slate-800">Record Transaction</h3>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 text-slate-500 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
          
          {/* Toggle Type */}
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setType('Expense')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${type === 'Expense' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <TrendingDown size={18} /> Cash Out
            </button>
            <button
              type="button"
              onClick={() => setType('Income')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${type === 'Income' ? 'bg-white text-green-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <TrendingUp size={18} /> Cash In
            </button>
          </div>

          {/* Amount Input */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Amount</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-3 text-slate-400" size={20} />
              <input 
                type="number" 
                required
                min="0"
                step="0.01"
                placeholder="0.00" 
                className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl text-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#137fec]"
                value={formData.amount}
                onChange={e => setFormData({...formData, amount: e.target.value})}
              />
            </div>
          </div>

          {/* Category & Payment Mode */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Category</label>
              <select 
                className="w-full p-2.5 border border-slate-300 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-[#137fec]"
                value={formData.category}
                onChange={e => setFormData({...formData, category: e.target.value})}
                required
              >
                <option value="">Select...</option>
                {type === 'Expense' ? (
                  <>
                    <option>Inventory Purchase</option>
                    <option>Lab Bill</option>
                    <option>Utility/Rent</option>
                    <option>Salary/Staff</option>
                    <option>Petty Cash</option>
                  </>
                ) : (
                  <>
                    <option>Treatment Income</option>
                    <option>Consultation</option>
                    <option>Pharmacy Sales</option>
                    <option>Other Deposit</option>
                  </>
                )}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Payment Mode</label>
              <select 
                className="w-full p-2.5 border border-slate-300 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-[#137fec]"
                value={formData.payment_method}
                onChange={e => setFormData({...formData, payment_method: e.target.value})}
              >
                <option>Cash</option>
                <option>UPI</option>
                <option>Card</option>
                <option>Bank Transfer</option>
                <option>Cheque</option>
              </select>
            </div>
          </div>

          {/* Party Name (Vendor or Patient Name) */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">{type === 'Expense' ? 'Payee (Vendor/Staff)' : 'Payer (Patient/Other)'}</label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder={type === 'Expense' ? "e.g. Dental Depot" : "e.g. John Doe"}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#137fec]"
                value={formData.party_name}
                onChange={e => setFormData({...formData, party_name: e.target.value})}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Notes / Description</label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 text-slate-400" size={18} />
              <textarea 
                rows="2" 
                placeholder="Optional details..."
                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#137fec] resize-none"
                value={formData.notes}
                onChange={e => setFormData({...formData, notes: e.target.value})}
              ></textarea>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className={`w-full py-3 rounded-xl font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2 ${type === 'Income' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'} ${loading ? 'opacity-70' : ''}`}
          >
            {loading ? 'Processing...' : `Confirm ${type}`}
          </button>

        </form>
      </div>
    </div>
  );
};

export default CashTransactionModal;