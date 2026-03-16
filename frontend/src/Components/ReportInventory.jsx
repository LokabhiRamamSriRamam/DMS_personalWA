import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const ReportInventory = () => {
  const [selectedItem, setSelectedItem] = useState(101);

  // Mock Consumption Data per Item
  const consumptionData = {
    101: [ // Amoxicillin
      { date: 'Jan 01', used: 10 }, { date: 'Jan 05', used: 25 }, { date: 'Jan 10', used: 15 },
      { date: 'Jan 15', used: 30 }, { date: 'Jan 20', used: 40 }, { date: 'Jan 25', used: 20 },
    ],
    201: [ // Gloves
      { date: 'Jan 01', used: 50 }, { date: 'Jan 05', used: 60 }, { date: 'Jan 10', used: 45 },
      { date: 'Jan 15', used: 80 }, { date: 'Jan 20', used: 55 }, { date: 'Jan 25', used: 90 },
    ]
  };

  const inventoryList = [
    { id: 101, name: 'Amoxicillin 500mg', stock: 540, unit: 'Tabs', status: 'Good' },
    { id: 201, name: 'Latex Gloves (M)', stock: 20, unit: 'Box', status: 'Low' },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-140px)]">
      
      {/* Left: Item List (Selectable) */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b bg-slate-50"><h3 className="font-bold text-slate-800">Select Item to View Usage</h3></div>
        <div className="overflow-y-auto flex-1">
          {inventoryList.map(item => (
            <div 
              key={item.id} 
              onClick={() => setSelectedItem(item.id)}
              className={`p-4 border-b cursor-pointer transition-colors ${selectedItem === item.id ? 'bg-blue-50 border-l-4 border-l-[#137fec]' : 'hover:bg-slate-50'}`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">{item.name}</h4>
                  <p className="text-xs text-slate-500 mt-1">Stock: {item.stock} {item.unit}</p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${item.status === 'Low' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                  {item.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right: Consumption Chart for Selected Item */}
      <div className="lg:col-span-2 flex flex-col gap-6">
        <div className="bg-white p-6 rounded-2xl border shadow-sm flex-1">
          <h3 className="font-bold text-slate-800 mb-2">Consumption Trend</h3>
          <p className="text-sm text-slate-500 mb-6">Showing daily usage for: <span className="font-bold text-[#137fec]">{inventoryList.find(i=>i.id===selectedItem)?.name}</span></p>
          
          <div className="h-64 lg:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={consumptionData[selectedItem] || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="used" stroke="#137fec" strokeWidth={3} dot={{r:4}} activeDot={{r:8}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Small Stat Cards below chart */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-xl border shadow-sm">
            <p className="text-xs text-slate-500 uppercase font-bold">Total Consumed (Month)</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">140 <span className="text-sm font-normal text-slate-400">units</span></p>
          </div>
          <div className="bg-white p-4 rounded-xl border shadow-sm">
            <p className="text-xs text-slate-500 uppercase font-bold">Projected Runout</p>
            <p className="text-2xl font-bold text-red-600 mt-1">12 Days</p>
          </div>
        </div>
      </div>

    </div>
  );
};

export default ReportInventory;