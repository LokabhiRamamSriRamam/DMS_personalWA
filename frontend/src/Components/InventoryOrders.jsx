import React, { useState } from 'react';
import { Pill, Syringe, Plus, X } from 'lucide-react';

const MOCK_ORDERS = {
  pharmacy: [{ id: 301, date: '24 Dec 2025', vendor: 'MedPlus Distrib', items: 'Amoxicillin, Pan D', cost: 12000, status: 'Received' }],
  consumables: [{ id: 401, date: '20 Dec 2025', vendor: 'Dental Depot', items: 'Gloves, Masks', cost: 2500, status: 'Pending' }]
};

// --- CREATE ORDER MODAL (Exported) ---
export const CreateOrderModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg text-slate-800">Create Purchase Order</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-red-500 transition-colors">
            <X size={20}/>
          </button>
        </div>
        
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); onClose(); }}>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Order Date</label>
            <input type="date" className="w-full border border-slate-300 p-2.5 rounded-xl text-sm focus:ring-2 focus:ring-[#137fec] outline-none" defaultValue={new Date().toISOString().split('T')[0]} />
          </div>
          
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Vendor</label>
            <select className="w-full border border-slate-300 p-2.5 rounded-xl text-sm focus:ring-2 focus:ring-[#137fec] outline-none bg-white">
              <option>Select Vendor...</option>
              <option>Dental Depot</option>
              <option>MedPlus Distributors</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Items Required</label>
            <textarea placeholder="List items here..." className="w-full border border-slate-300 p-2.5 rounded-xl text-sm focus:ring-2 focus:ring-[#137fec] outline-none h-24 resize-none"></textarea>
          </div>

          <button type="submit" className="w-full bg-[#137fec] hover:bg-blue-700 text-white py-3 rounded-xl font-bold shadow-lg transition-colors">
            Create Order
          </button>
        </form>
      </div>
    </div>
  );
};

const InventoryOrders = ({ SectionHeader }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <div className="h-full flex flex-col">
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
          {[ 
            { t: 'Pharmacy Orders', i: Pill, d: MOCK_ORDERS.pharmacy, c: 'bg-blue-50/50' }, 
            { t: 'Consumable Orders', i: Syringe, d: MOCK_ORDERS.consumables, c: 'bg-teal-50/50' } 
          ].map((sec, idx) => (
            <div key={idx} className="flex flex-col bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden h-full">
              <SectionHeader title={sec.t} icon={sec.i} colorClass={sec.c} count={sec.d.length} />
              <div className="overflow-auto flex-1">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 sticky top-0 z-10 text-[11px] font-bold text-slate-500 uppercase">
                      <tr>
                        <th className="p-3">Date</th>
                        <th className="p-3">Vendor</th>
                        <th className="p-3 text-right">Cost</th>
                        <th className="p-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                        {sec.d.map(o => (
                            <tr key={o.id} className="hover:bg-slate-50">
                                <td className="p-3 text-slate-600">{o.date}</td>
                                <td className="p-3 font-medium text-slate-700">{o.vendor}</td>
                                <td className="p-3 text-right font-bold text-slate-700">₹{o.cost.toLocaleString()}</td>
                                <td className="p-3 text-center">
                                  <span className={`px-2 py-0.5 rounded text-xs font-bold border ${o.status === 'Received' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-orange-100 text-orange-700 border-orange-200'}`}>
                                    {o.status}
                                  </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Modal used internally for standalone testing */}
      <CreateOrderModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
};

export default InventoryOrders;