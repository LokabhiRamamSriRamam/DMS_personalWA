import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import API from '../services/api';

const InventoryConsumption = ({ visits = [], patientId, onRefresh }) => {
  const [consumables, setConsumables] = useState([]);
  const [allConsumableItems, setAllConsumableItems] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedConsumable, setSelectedConsumable] = useState(null);
  const [quantity, setQuantity] = useState('');
  const [saving, setSaving] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const today = new Date().toISOString().slice(0, 10);
  const todayVisits = visits.filter(v => new Date(v.date).toISOString().slice(0, 10) === today);
  // Use the most recent today visit for new consumable additions
  const todayVisit = todayVisits[0] || null; // visits are sorted descending, so [0] is most recent


  useEffect(() => {
    API.get('/inventory')
      .then(res => {
        const data = Array.isArray(res.data) ? res.data : [];
        const consumableItems = data.filter(i => i.type === 'Consumable' && i.consumption_unit);
        setAllConsumableItems(consumableItems);
      })
      .catch(() => {});
  }, [onRefresh]);

  useEffect(() => {
    if (todayVisits.length > 0) {
      // Aggregate consumables across ALL today's visits
      const allConsumptions = todayVisits
        .flatMap(v => v.treatments || [])
        .flatMap(t => t.consumables_used || []);

      const grouped = {};
      allConsumptions.forEach(c => {
        const key = c.inventory_item_id?.toString?.() || c.inventory_item_id;
        if (key) {
          if (!grouped[key]) {
            grouped[key] = {
              inventory_item_id: key,
              total_quantity: 0,
              item: allConsumableItems.find(i => i._id === key)
            };
          }
          grouped[key].total_quantity += c.quantity || 0;
        }
      });

      setConsumables(Object.values(grouped));
    } else {
      setConsumables([]);
    }
  }, [visits, allConsumableItems]);

  const handleAddConsumable = async () => {
    if (!selectedConsumable || !quantity || !patientId) {
      alert('Please select a consumable and enter quantity');
      return;
    }

    setSaving(true);
    try {
      const consumptionQty = Number(quantity);

      // Add consumable to visit via API endpoint (handles inventory deduction and logging)
      const response = await API.post(`/visits/patient/${patientId}/consumable`, {
        inventory_item_id: selectedConsumable,
        quantity: consumptionQty,
        visit_id: todayVisit._id
      });


      setSelectedConsumable(null);
      setQuantity('');
      setShowForm(false);

      // Refresh all data
      await API.get('/inventory').then(res => {
        const data = Array.isArray(res.data) ? res.data : [];
        const consumableItems = data.filter(i => i.type === 'Consumable' && i.consumption_unit);
        setAllConsumableItems(consumableItems);
      });

      if (typeof onRefresh === 'function') {
        await new Promise(resolve => setTimeout(resolve, 500)); // Wait a bit for state updates
        await onRefresh();
        setRefreshTrigger(prev => prev + 1); // Force re-render
      }
    } catch (err) {
      console.error('Error adding consumable:', err);
      alert('Failed to add consumption');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveConsumable = async (consumableId) => {
    if (!window.confirm('Remove this consumable from today\'s visit?')) return;

    try {
      await API.delete(`/visits/${todayVisit._id}/consumables/${consumableId}`);
      onRefresh();
    } catch (err) {
      console.error(err);
      alert('Failed to remove consumption');
    }
  };

  if (todayVisits.length === 0) {
    return (
      <div className="p-5 bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-teal-50 rounded-full flex items-center justify-center text-teal-600">
              <span className="text-lg">📦</span>
            </div>
            <h3 className="font-semibold text-lg text-slate-800">Inventory Consumption</h3>
          </div>
        </div>
        <div className="flex items-center justify-center py-8 text-slate-400 text-sm bg-slate-50 rounded-xl border border-dashed border-slate-200">
          No visit record for today. Start a visit to track inventory consumption.
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-teal-50 rounded-full flex items-center justify-center text-teal-600">
            <span className="text-lg">📦</span>
          </div>
          <h3 className="font-semibold text-lg text-slate-800">Inventory Consumption</h3>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-teal-50 text-teal-600 rounded-lg hover:bg-teal-100 transition-colors font-medium text-sm"
          >
            <Plus size={16} /> Add Consumable
          </button>
        )}
      </div>

      {/* Add form */}
      {showForm && (
        <div className="mb-4 p-4 bg-teal-50/40 rounded-xl border border-teal-100 flex flex-col gap-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Consumable Item *</label>
              <select
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-teal-600 bg-white"
                value={selectedConsumable || ''}
                onChange={e => setSelectedConsumable(e.target.value)}
              >
                <option value="">-- Select Item --</option>
                {allConsumableItems.map(item => (
                  <option key={item._id} value={item._id}>
                    {item.name} ({item.consumption_unit} per use)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Quantity Used *</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.01"
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-teal-600"
                  placeholder="e.g. 0.1"
                  value={quantity}
                  onChange={e => setQuantity(e.target.value)}
                />
                <span className="text-xs text-slate-500 whitespace-nowrap">
                  {selectedConsumable
                    ? allConsumableItems.find(i => i._id === selectedConsumable)?.consumption_unit
                    : 'unit'}
                </span>
              </div>
            </div>

            <div className="flex items-end gap-2">
              <button
                onClick={handleAddConsumable}
                disabled={saving || !selectedConsumable || !quantity}
                className="flex-1 px-4 py-2 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Adding...' : 'Add'}
              </button>
              <button
                onClick={() => {
                  setShowForm(false);
                  setSelectedConsumable(null);
                  setQuantity('');
                }}
                className="px-4 py-2 text-sm border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      {consumables.length === 0 ? (
        <div className="flex items-center justify-center py-8 text-slate-400 text-sm bg-slate-50 rounded-xl border border-dashed border-slate-200">
          No consumables recorded for today.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {consumables.map(consumption => {
            const item = consumption.item || allConsumableItems.find(i => i._id === consumption.inventory_item_id);
            return (
              <div
                key={consumption.inventory_item_id}
                className="flex items-center justify-between gap-4 px-4 py-3 bg-teal-50/50 rounded-lg border border-teal-100 group"
              >
                <div className="flex flex-col gap-1 flex-1 min-w-0">
                  <span className="font-medium text-slate-800 text-sm">{item?.name || 'Unknown Item'}</span>
                  <span className="text-xs text-slate-500">
                    Cost: ₹{item?.cost_price || 0} per unit
                  </span>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <div className="font-semibold text-teal-700">
                      {(consumption.total_quantity * (item?.consumption_unit || 1)).toFixed(2)} units
                    </div>
                    <div className="text-xs text-slate-500">
                      Stock: {item?.stock_on_hand || 0}
                    </div>
                  </div>

                  <button
                    onClick={() => handleRemoveConsumable(consumption.inventory_item_id)}
                    className="opacity-0 group-hover:opacity-100 flex items-center gap-1 px-2 py-1.5 text-red-500 hover:bg-red-50 rounded-md text-sm transition-all border border-transparent hover:border-red-200"
                  >
                    <Trash2 size={14} /> Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default InventoryConsumption;
