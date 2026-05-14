import React, { useState, useEffect } from 'react';
import { Pill, Syringe, Loader2, ChevronDown } from 'lucide-react';
import API from '../services/api';

const InventoryStocks = ({ StockBadge, SectionHeader, searchQuery, isLowStock, medicineEnabled = true, consumableEnabled = true }) => {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState({ pharmacy: [], consumables: [] });
  const [pharmacyExpanded, setPharmacyExpanded] = useState(true);
  const [consumablesExpanded, setConsumablesExpanded] = useState(true);

  // Get current month name (e.g., "Jan")
  const currentMonth = new Date().toLocaleString('default', { month: 'short' });

  useEffect(() => {
    const fetchStock = async () => {
      setLoading(true);
      try {
        const { data } = await API.get('/inventory');
        
        const pharmacy = data.filter(i => i.type === 'Pharmacy');
        const consumables = data.filter(i => i.type === 'Consumable' || i.type === 'Asset');
        
        setItems({ pharmacy, consumables });
      } catch (err) {
        console.error("Failed to load stock data", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStock();
  }, []);

  const filterData = (data) => {
    return data.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (item.manufacturer && item.manufacturer.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesStatus = isLowStock 
        ? (item.status === 'Low' || item.status === 'Critical' || item.status === 'Out of Stock') 
        : true;

      return matchesSearch && matchesStatus;
    });
  };

  const pharmacyData = filterData(items.pharmacy);
  const consumablesData = filterData(items.consumables);

  if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-slate-400"/></div>;

  return (
    <div className={`grid grid-cols-1 ${medicineEnabled && consumableEnabled ? 'lg:grid-cols-2' : ''} gap-6 h-full min-h-0`}>

      {/* Left: Pharmacy */}
      {medicineEnabled && (
      <div className="flex flex-col bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden h-full">
        <button
          onClick={() => setPharmacyExpanded(v => !v)}
          className="flex items-center justify-between w-full text-left"
        >
          <SectionHeader title="Pharmacy Stock" icon={Pill} colorClass="bg-blue-50/50" count={pharmacyData.length} />
          <ChevronDown size={16} className={`mr-3 text-slate-400 transition-transform ${pharmacyExpanded ? '' : '-rotate-90'}`} />
        </button>
        {pharmacyExpanded && (
        <div className="overflow-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 sticky top-0 z-10 text-[11px] font-bold text-slate-500 uppercase">
              <tr>
                <th className="p-3">Item Name</th>
                <th className="p-3">Category</th>
                <th className="p-3 text-right">Sold ({currentMonth})</th>
                <th className="p-3 text-right">Stock / Min</th>
                <th className="p-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {pharmacyData.map(item => (
                <tr key={item._id} className="hover:bg-slate-50">
                  <td className="p-3">
                    <div className="font-semibold text-slate-700">{item.name}</div>
                    <div className="text-xs text-slate-400">{item.manufacturer}</div>
                  </td>
                  <td className="p-3 text-slate-500 text-xs">{item.category}</td>

                  {/* Monthly Sold Count */}
                  <td className="p-3 text-right font-medium text-slate-600">
                    {item.usage_count > 0 ? item.usage_count : <span className="text-slate-300">-</span>}
                  </td>

                  {/* REVISED STOCK DISPLAY */}
                  <td className="p-3 text-right">
                    <div className="flex flex-col items-end">
                        <span className={`font-bold text-md ${item.stock_on_hand <= item.min_stock_level ? 'text-red-600' : 'text-slate-800'}`}>
                            {item.stock_on_hand}
                        </span>
                        <span className="text-[10px] text-slate-400">Min: {item.min_stock_level}</span>
                    </div>
                  </td>

                  <td className="p-3 text-center">
                    <StockBadge status={item.status} />
                  </td>
                </tr>
              ))}
              {pharmacyData.length === 0 && <tr><td colSpan="5" className="p-4 text-center text-slate-400 text-xs">No pharmacy items found.</td></tr>}
            </tbody>
          </table>
        </div>
        )}
      </div>
      )}

      {/* Right: Consumables */}
      {consumableEnabled && (
      <div className="flex flex-col bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden h-full">
        <button
          onClick={() => setConsumablesExpanded(v => !v)}
          className="flex items-center justify-between w-full text-left"
        >
          <SectionHeader title="In-Clinic Consumables" icon={Syringe} colorClass="bg-teal-50/50" count={consumablesData.length} />
          <ChevronDown size={16} className={`mr-3 text-slate-400 transition-transform ${consumablesExpanded ? '' : '-rotate-90'}`} />
        </button>
        {consumablesExpanded && (
        <div className="overflow-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 sticky top-0 z-10 text-[11px] font-bold text-slate-500 uppercase">
              <tr>
                <th className="p-3">Item Name</th>
                <th className="p-3">Category</th>
                <th className="p-3 text-right">Used ({currentMonth})</th>
                <th className="p-3 text-right">Stock / Min</th>
                <th className="p-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {consumablesData.map(item => (
                <tr key={item._id} className="hover:bg-slate-50">
                  <td className="p-3">
                    <div className="font-semibold text-slate-700">{item.name}</div>
                    <div className="text-xs text-slate-400">{item.manufacturer}</div>
                  </td>
                  <td className="p-3 text-slate-500 text-xs">{item.category}</td>

                  {/* Monthly Used Count */}
                  <td className="p-3 text-right font-medium text-slate-600">
                    {item.usage_count > 0 ? item.usage_count : <span className="text-slate-300">-</span>}
                  </td>

                  {/* REVISED STOCK DISPLAY */}
                  <td className="p-3 text-right">
                    <div className="flex flex-col items-end">
                        <span className={`font-bold text-md ${item.stock_on_hand <= item.min_stock_level ? 'text-red-600' : 'text-slate-800'}`}>
                            {item.stock_on_hand}
                        </span>
                        <span className="text-[10px] text-slate-400">Min: {item.min_stock_level}</span>
                    </div>
                  </td>

                  <td className="p-3 text-center">
                    <StockBadge status={item.status} />
                  </td>
                </tr>
              ))}
              {consumablesData.length === 0 && <tr><td colSpan="5" className="p-4 text-center text-slate-400 text-xs">No consumables found.</td></tr>}
            </tbody>
          </table>
        </div>
        )}
      </div>
      )}
    </div>
  );
};

export default InventoryStocks;