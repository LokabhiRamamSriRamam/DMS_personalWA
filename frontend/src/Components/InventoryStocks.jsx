import React from 'react';
import { Pill, Syringe } from 'lucide-react';

const MOCK_STOCK = {
  pharmacy: [
    { id: 101, name: 'Amoxicillin 500mg', company: 'Sun Pharma', category: 'Antibiotic', sold: 450, stock: 550, unit: 'Tabs', status: 'Good' },
    { id: 102, name: 'Combiflam', company: 'Sanofi', category: 'Painkiller', sold: 480, stock: 20, unit: 'Tabs', status: 'Low' },
  ],
  consumables: [
    { id: 201, name: 'Latex Gloves (M)', company: 'SafeHand', category: 'Protective', consumed: 45, stock: 5, unit: 'Box', status: 'Critical' },
    { id: 202, name: 'Lidocaine Injection', company: 'Neon', category: 'Anesthetic', consumed: 20, stock: 80, unit: 'Vials', status: 'Good' },
  ]
};

const InventoryStocks = ({ StockBadge, SectionHeader, searchQuery, isLowStock = false }) => {
  
  // Helper to filter data based on Search AND Low Stock toggle
  const filterData = (data) => {
    return data.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      // If isLowStock is true, only show Low or Critical items
      const matchesStatus = isLowStock ? (item.status === 'Low' || item.status === 'Critical') : true;
      return matchesSearch && matchesStatus;
    });
  };

  const pharmacyData = filterData(MOCK_STOCK.pharmacy);
  const consumablesData = filterData(MOCK_STOCK.consumables);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full min-h-0">
      
      {/* Left: Pharmacy */}
      <div className="flex flex-col bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden h-full">
        <SectionHeader title="Pharmacy Stock" icon={Pill} colorClass="bg-blue-50/50" count={pharmacyData.length} />
        <div className="overflow-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 sticky top-0 z-10 text-[11px] font-bold text-slate-500 uppercase">
              <tr><th className="p-3">Item Name</th><th className="p-3">Category</th><th className="p-3 text-right">Sold</th><th className="p-3 text-right">Stock</th><th className="p-3 text-center">Status</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {pharmacyData.map(item => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="p-3"><div className="font-semibold text-slate-700">{item.name}</div><div className="text-xs text-slate-400">{item.company}</div></td>
                  <td className="p-3 text-slate-500 text-xs">{item.category}</td>
                  <td className="p-3 text-right text-slate-500">{item.sold}</td>
                  <td className="p-3 text-right font-bold text-slate-800">{item.stock} <span className="text-[10px] text-slate-400 font-normal">{item.unit}</span></td>
                  <td className="p-3 text-center"><StockBadge status={item.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Right: Consumables */}
      <div className="flex flex-col bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden h-full">
        <SectionHeader title="In-Clinic Consumables" icon={Syringe} colorClass="bg-teal-50/50" count={consumablesData.length} />
        <div className="overflow-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 sticky top-0 z-10 text-[11px] font-bold text-slate-500 uppercase">
              <tr><th className="p-3">Item Name</th><th className="p-3">Category</th><th className="p-3 text-right">Used</th><th className="p-3 text-right">Stock</th><th className="p-3 text-center">Status</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {consumablesData.map(item => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="p-3"><div className="font-semibold text-slate-700">{item.name}</div><div className="text-xs text-slate-400">{item.company}</div></td>
                  <td className="p-3 text-slate-500 text-xs">{item.category}</td>
                  <td className="p-3 text-right text-slate-500">{item.consumed}</td>
                  <td className="p-3 text-right font-bold text-slate-800">{item.stock} <span className="text-[10px] text-slate-400 font-normal">{item.unit}</span></td>
                  <td className="p-3 text-center"><StockBadge status={item.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default InventoryStocks;