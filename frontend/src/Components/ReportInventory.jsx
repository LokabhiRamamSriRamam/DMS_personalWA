import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { Loader2, AlertTriangle } from 'lucide-react';
import API from '../services/api';

const STATUS_STYLES = {
  Good:          'bg-green-100 text-green-700',
  Low:           'bg-yellow-100 text-yellow-700',
  Critical:      'bg-orange-100 text-orange-700',
  'Out of Stock':'bg-red-100 text-red-700',
};

const COLORS = ['#137fec', '#22c55e', '#eab308', '#f97316', '#ef4444', '#8b5cf6'];

export default function ReportInventory({ from, to }) {
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [selectedId, setSelected] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError('');
    API.get(`/analytics?section=medicine&from=${from}&to=${to}`)
      .then(r => {
        setData(r.data);
        if (r.data?.items?.length > 0 && !selectedId) {
          setSelected(r.data.items[0]._id);
        }
      })
      .catch(e => setError(e.response?.data?.error || e.message))
      .finally(() => setLoading(false));
  }, [from, to]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={32} className="animate-spin text-[#137fec]" />
    </div>
  );

  if (error) return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700 text-sm">{error}</div>
  );

  const items    = data?.items    || [];
  const consumed = data?.consumed || [];
  const lowStock = data?.low_stock || [];
  const itemLogs = data?.item_logs || {};

  const selectedItem = items.find(i => i._id === selectedId);
  const selectedLogs = selectedId ? (itemLogs[selectedId] || []) : [];

  // Compute total consumed in period for selected item
  const totalConsumed = selectedLogs.reduce((s, l) => s + l.used, 0);

  return (
    <div className="space-y-6">
      {/* Low stock alert */}
      {lowStock.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle size={18} className="text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-amber-700">
            <strong>{lowStock.length}</strong> item{lowStock.length !== 1 ? 's' : ''} need restocking:&nbsp;
            {lowStock.slice(0, 5).map(i => i.name).join(', ')}{lowStock.length > 5 ? '…' : ''}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Item list */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col max-h-[520px]">
          <div className="p-4 border-b bg-slate-50 flex-shrink-0">
            <h3 className="font-bold text-slate-800">Select Item</h3>
            <p className="text-xs text-slate-400 mt-0.5">{items.length} items total</p>
          </div>
          <div className="overflow-y-auto flex-1">
            {items.length > 0 ? items.map(item => (
              <div
                key={item._id}
                onClick={() => setSelected(item._id)}
                className={`p-4 border-b cursor-pointer transition-colors ${
                  selectedId === item._id ? 'bg-blue-50 border-l-4 border-l-[#137fec]' : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <h4 className="font-semibold text-slate-800 text-sm truncate">{item.name}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Stock: {item.stock_on_hand} units</p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold flex-shrink-0 ${STATUS_STYLES[item.status] || 'bg-slate-100 text-slate-600'}`}>
                    {item.status}
                  </span>
                </div>
              </div>
            )) : (
              <p className="p-6 text-sm text-slate-400 text-center">No inventory items.</p>
            )}
          </div>
        </div>

        {/* Right: consumption charts */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {selectedItem ? (
            <>
              {/* Consumption trend */}
              <div className="bg-white p-6 rounded-2xl border shadow-sm">
                <h3 className="font-bold text-slate-800 mb-1">Consumption Trend</h3>
                <p className="text-sm text-slate-500 mb-5">
                  Daily usage for: <span className="font-semibold text-[#137fec]">{selectedItem.name}</span>
                </p>
                {selectedLogs.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={selectedLogs}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="used" stroke="#137fec" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 8 }} name="Used" />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-slate-400 text-sm text-center py-12">No usage logs for this item in the selected period.</p>
                )}
              </div>

              {/* KPI cards */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl border shadow-sm">
                  <p className="text-xs text-slate-500 font-bold uppercase">Current Stock</p>
                  <p className="text-2xl font-bold text-slate-800 mt-1">{selectedItem.stock_on_hand}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border shadow-sm">
                  <p className="text-xs text-slate-500 font-bold uppercase">Consumed (Period)</p>
                  <p className="text-2xl font-bold text-slate-800 mt-1">{totalConsumed}</p>
                </div>
                <div className={`bg-white p-4 rounded-xl border shadow-sm`}>
                  <p className="text-xs text-slate-500 font-bold uppercase">Status</p>
                  <p className={`text-lg font-bold mt-1 ${selectedItem.status === 'Good' ? 'text-green-600' : selectedItem.status === 'Low' ? 'text-yellow-600' : 'text-red-600'}`}>
                    {selectedItem.status}
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-2xl border shadow-sm flex items-center justify-center h-64">
              <p className="text-slate-400 text-sm">Select an item from the list.</p>
            </div>
          )}
        </div>
      </div>

      {/* Top consumed items bar chart */}
      {consumed.length > 0 && (
        <div className="bg-white p-6 rounded-2xl border shadow-sm">
          <h3 className="font-bold text-slate-800 mb-6">Top Consumed Items (Period)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={consumed} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
              <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
              <YAxis dataKey="name" type="category" width={160} axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="total" radius={[0, 4, 4, 0]} barSize={18} name="Units Used">
                {consumed.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
