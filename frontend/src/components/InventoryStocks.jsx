import React, { useState, useEffect } from 'react';
import { Pill, Syringe, Loader2, ChevronDown } from 'lucide-react';
import API from '../services/api';

const InventoryStocks = ({ StockBadge, SectionHeader, searchQuery, isLowStock, medicineEnabled = true, consumableEnabled = true, statusFilter, brandFilter, categoryPharmacyFilter, categoryConsumableFilter }) => {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState({ pharmacy: [], consumables: [] });
  // Default collapsed on mobile (false); user can expand
  const [pharmacyExpanded, setPharmacyExpanded] = useState(false);
  const [consumablesExpanded, setConsumablesExpanded] = useState(false);
  const [localCategoryPharmacyFilter, setLocalCategoryPharmacyFilter] = useState('');
  const [localCategoryConsumableFilter, setLocalCategoryConsumableFilter] = useState('');

  const currentMonth = new Date().toLocaleString('default', { month: 'short' });

  useEffect(() => {
    const fetchStock = async () => {
      setLoading(true);
      try {
        const { data } = await API.get('/inventory');
        const pharmacy   = data.filter(i => i.type === 'Pharmacy');
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

  const filterData = (data, localCategoryFilter) => data.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (item.manufacturer && item.manufacturer.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = isLowStock
      ? (item.status === 'Low' || item.status === 'Critical' || item.status === 'Out of Stock')
      : true;
    const matchesStatusFilter = !statusFilter || item.status === statusFilter;
    const matchesBrandFilter = !brandFilter || item.manufacturer === brandFilter;
    const matchesCategoryFilter = !localCategoryFilter || item.category === localCategoryFilter;
    return matchesSearch && matchesStatus && matchesStatusFilter && matchesBrandFilter && matchesCategoryFilter;
  });

  const pharmacyData   = filterData(items.pharmacy, localCategoryPharmacyFilter);
  const consumablesData = filterData(items.consumables, localCategoryConsumableFilter);

  // Get unique categories for each type
  const pharmacyCategories = [...new Set(items.pharmacy.map(i => i.category).filter(Boolean))].sort();
  const consumableCategories = [...new Set(items.consumables.map(i => i.category).filter(Boolean))].sort();

  if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-slate-400"/></div>;

  // Reusable section renderer
  const Section = ({ title, icon: Icon, colorClass, data, expanded, setExpanded, usageLabel, categories, categoryFilter, onCategoryChange }) => (
    <div className="flex flex-col bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <div className="flex items-center justify-between w-full">
        <button
          onClick={() => setExpanded(v => !v)}
          className="flex items-center justify-between w-full text-left flex-1"
        >
          <SectionHeader title={title} icon={Icon} colorClass={colorClass} count={data.length} />
          <ChevronDown size={16} className={`mr-3 text-slate-400 transition-transform ${expanded ? '' : '-rotate-90'}`} />
        </button>
        {categories && categories.length > 0 && (
          <select
            value={categoryFilter}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="mr-3 px-2 py-1 border border-slate-300 rounded text-xs outline-none focus:border-[#137fec] focus:ring-1 focus:ring-[#137fec] bg-white"
            onClick={(e) => e.stopPropagation()}
          >
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        )}
      </div>
      {expanded && (
        <>
          {/* Mobile cards */}
          <div className="sm:hidden divide-y divide-slate-100">
            {data.length === 0
              ? <p className="p-4 text-center text-xs text-slate-400">No items found.</p>
              : data.map(item => (
                <div key={item._id} className="p-3 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-700 truncate">{item.name}</p>
                    <p className="text-xs text-slate-400">{item.manufacturer} · {item.category}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {usageLabel}: <span className="font-medium">{item.usage_count > 0 ? item.usage_count : '—'}</span>
                      &nbsp;· Stock: <span className={`font-bold ${item.stock_on_hand <= item.min_stock_level ? 'text-red-600' : 'text-slate-800'}`}>{item.stock_on_hand}</span>
                      <span className="text-slate-400"> / min {item.min_stock_level}</span>
                    </p>
                  </div>
                  <StockBadge status={item.status} />
                </div>
              ))
            }
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block overflow-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 sticky top-0 z-10 text-[11px] font-bold text-slate-500 uppercase">
                <tr>
                  <th className="p-3">Item Name</th>
                  <th className="p-3">Category</th>
                  <th className="p-3 text-right">{usageLabel} ({currentMonth})</th>
                  <th className="p-3 text-right">Stock / Min</th>
                  <th className="p-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {data.map(item => (
                  <tr key={item._id} className="hover:bg-slate-50">
                    <td className="p-3">
                      <div className="font-semibold text-slate-700">{item.name}</div>
                      <div className="text-xs text-slate-400">{item.manufacturer}</div>
                    </td>
                    <td className="p-3 text-slate-500 text-xs">{item.category}</td>
                    <td className="p-3 text-right font-medium text-slate-600">
                      {item.usage_count > 0 ? item.usage_count : <span className="text-slate-300">-</span>}
                    </td>
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
                {data.length === 0 && <tr><td colSpan="5" className="p-4 text-center text-slate-400 text-xs">No items found.</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile: natural vertical stack, parent page scrolls */}
      <div className="sm:hidden flex flex-col gap-4">
        {medicineEnabled && (
          <Section
            title="Pharmacy Stock"
            icon={Pill}
            colorClass="bg-blue-50/50"
            data={pharmacyData}
            expanded={pharmacyExpanded}
            setExpanded={setPharmacyExpanded}
            usageLabel="Sold"
            categories={[]}
            categoryFilter=""
            onCategoryChange={() => {}}
          />
        )}
        {consumableEnabled && (
          <Section
            title="In-Clinic Consumables"
            icon={Syringe}
            colorClass="bg-teal-50/50"
            data={consumablesData}
            expanded={consumablesExpanded}
            setExpanded={setConsumablesExpanded}
            usageLabel="Used"
            categories={[]}
            categoryFilter=""
            onCategoryChange={() => {}}
          />
        )}
      </div>

      {/* Desktop: constrained side-by-side grid */}
      <div className={`hidden sm:grid grid-cols-1 ${medicineEnabled && consumableEnabled ? 'lg:grid-cols-2' : ''} gap-6 h-full min-h-0`}>
        {medicineEnabled && (
          <div className="flex flex-col bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden h-full">
            <div className="flex items-center justify-between p-3 border-b border-slate-200 bg-blue-50/50">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-white/60 rounded-lg shadow-sm">
                  <Pill size={16} className="text-slate-700" />
                </div>
                <h3 className="font-bold text-slate-800 text-sm">Pharmacy Stock</h3>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={localCategoryPharmacyFilter}
                  onChange={(e) => setLocalCategoryPharmacyFilter(e.target.value)}
                  className="px-2 py-1 border border-slate-300 rounded text-xs outline-none focus:border-[#137fec] focus:ring-1 focus:ring-[#137fec] bg-white"
                >
                  <option value="">All Categories</option>
                  {pharmacyCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <span className="bg-white/50 px-2 py-0.5 rounded text-xs font-semibold text-slate-600">{pharmacyData.length} Items</span>
              </div>
            </div>
            <div className="overflow-auto flex-1">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 sticky top-0 z-10 text-[11px] font-bold text-slate-500 uppercase">
                  <tr>
                    <th className="p-3">Item Name</th><th className="p-3">Category</th>
                    <th className="p-3 text-right">Sold ({currentMonth})</th>
                    <th className="p-3 text-right">Stock / Min</th><th className="p-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {pharmacyData.map(item => (
                    <tr key={item._id} className="hover:bg-slate-50">
                      <td className="p-3"><div className="font-semibold text-slate-700">{item.name}</div><div className="text-xs text-slate-400">{item.manufacturer}</div></td>
                      <td className="p-3 text-slate-500 text-xs">{item.category}</td>
                      <td className="p-3 text-right font-medium text-slate-600">{item.usage_count > 0 ? item.usage_count : <span className="text-slate-300">-</span>}</td>
                      <td className="p-3 text-right">
                        <div className="flex flex-col items-end">
                          <span className={`font-bold text-md ${item.stock_on_hand <= item.min_stock_level ? 'text-red-600' : 'text-slate-800'}`}>{item.stock_on_hand}</span>
                          <span className="text-[10px] text-slate-400">Min: {item.min_stock_level}</span>
                        </div>
                      </td>
                      <td className="p-3 text-center"><StockBadge status={item.status} /></td>
                    </tr>
                  ))}
                  {pharmacyData.length === 0 && <tr><td colSpan="5" className="p-4 text-center text-slate-400 text-xs">No pharmacy items found.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {consumableEnabled && (
          <div className="flex flex-col bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden h-full">
            <div className="flex items-center justify-between p-3 border-b border-slate-200 bg-teal-50/50">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-white/60 rounded-lg shadow-sm">
                  <Syringe size={16} className="text-slate-700" />
                </div>
                <h3 className="font-bold text-slate-800 text-sm">In-Clinic Consumables</h3>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={localCategoryConsumableFilter}
                  onChange={(e) => setLocalCategoryConsumableFilter(e.target.value)}
                  className="px-2 py-1 border border-slate-300 rounded text-xs outline-none focus:border-[#137fec] focus:ring-1 focus:ring-[#137fec] bg-white"
                >
                  <option value="">All Categories</option>
                  {consumableCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <span className="bg-white/50 px-2 py-0.5 rounded text-xs font-semibold text-slate-600">{consumablesData.length} Items</span>
              </div>
            </div>
            <div className="overflow-auto flex-1">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 sticky top-0 z-10 text-[11px] font-bold text-slate-500 uppercase">
                  <tr>
                    <th className="p-3">Item Name</th><th className="p-3">Category</th>
                    <th className="p-3 text-right">Used ({currentMonth})</th>
                    <th className="p-3 text-right">Stock / Min</th><th className="p-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {consumablesData.map(item => (
                    <tr key={item._id} className="hover:bg-slate-50">
                      <td className="p-3"><div className="font-semibold text-slate-700">{item.name}</div><div className="text-xs text-slate-400">{item.manufacturer}</div></td>
                      <td className="p-3 text-slate-500 text-xs">{item.category}</td>
                      <td className="p-3 text-right font-medium text-slate-600">{item.usage_count > 0 ? item.usage_count : <span className="text-slate-300">-</span>}</td>
                      <td className="p-3 text-right">
                        <div className="flex flex-col items-end">
                          <span className={`font-bold text-md ${item.stock_on_hand <= item.min_stock_level ? 'text-red-600' : 'text-slate-800'}`}>{item.stock_on_hand}</span>
                          <span className="text-[10px] text-slate-400">Min: {item.min_stock_level}</span>
                        </div>
                      </td>
                      <td className="p-3 text-center"><StockBadge status={item.status} /></td>
                    </tr>
                  ))}
                  {consumablesData.length === 0 && <tr><td colSpan="5" className="p-4 text-center text-slate-400 text-xs">No consumables found.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default InventoryStocks;
