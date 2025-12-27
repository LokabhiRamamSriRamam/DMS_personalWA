import React, { useState } from 'react';
import { ArrowRight, Plus, X, User, Phone, Briefcase } from 'lucide-react';

const MOCK_VENDORS = [
  { id: 1, name: 'MedPlus Distributors', type: 'Pharmacy', contact: 'Mr. Verma', phone: '9876543210', email: 'orders@medplus.com' },
  { id: 2, name: 'Dental Depot', type: 'Consumables', contact: 'Rajesh', phone: '9988776655', email: 'supply@dentaldepot.in' },
];

// --- ADD VENDOR MODAL (Exported) ---
export const AddVendorModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden flex flex-col shadow-2xl">
        
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
          <h3 className="font-bold text-lg text-slate-800">Add New Vendor</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-red-500 transition-colors">
            <X size={20}/>
          </button>
        </div>

        <form className="p-6 space-y-4" onSubmit={(e) => { e.preventDefault(); onClose(); }}>
          
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Vendor / Company Name</label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-400"><Briefcase size={16}/></span>
              <input type="text" placeholder="e.g. City Surgical Supply" className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-[#137fec] outline-none" />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Supply Type</label>
            <select className="w-full border border-slate-300 p-2.5 rounded-xl text-sm focus:ring-2 focus:ring-[#137fec] outline-none bg-white">
              <option value="">Select Type...</option>
              <option>Pharmacy Only</option>
              <option>Consumables Only</option>
              <option>Both (General)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Contact Person</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400"><User size={16}/></span>
                <input type="text" placeholder="Name" className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-[#137fec] outline-none" />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Phone Number</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400"><Phone size={16}/></span>
                <input type="tel" placeholder="9876..." className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-[#137fec] outline-none" />
              </div>
            </div>
          </div>

          <button type="submit" className="w-full py-3 rounded-xl font-bold text-white shadow-lg bg-[#137fec] hover:bg-blue-700 transition-colors mt-2">
            Save Vendor
          </button>

        </form>
      </div>
    </div>
  );
};

const InventoryVendors = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <div className="h-full flex flex-col">
        
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex-1 min-h-0">
          <div className="overflow-auto h-full">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#F7F2F2] sticky top-0 z-10 text-xs font-semibold text-slate-500 uppercase">
                <tr>
                  <th className="p-4">Vendor Name</th>
                  <th className="p-4">Supply Type</th>
                  <th className="p-4">Contact</th>
                  <th className="p-4">Phone</th>
                  <th className="p-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {MOCK_VENDORS.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50 text-sm">
                    <td className="p-4 font-bold text-slate-800">{v.name}</td>
                    <td className="p-4"><span className="px-2 py-1 rounded text-xs font-medium bg-slate-100 border border-slate-200">{v.type}</span></td>
                    <td className="p-4 text-slate-600 flex items-center gap-2"><User size={14} className="text-slate-400"/> {v.contact}</td>
                    <td className="p-4 text-slate-600 font-mono">{v.phone}</td>
                    <td className="p-4 text-center"><button className="text-slate-400 hover:text-blue-600"><ArrowRight size={18} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Internal modal usage for standalone testing */}
      <AddVendorModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
};

export default InventoryVendors;