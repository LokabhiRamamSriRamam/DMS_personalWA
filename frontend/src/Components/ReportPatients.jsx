import React from 'react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, CartesianGrid } from 'recharts';

const ReportPatients = () => {
  const treatmentDemand = [
    { name: 'Root Canal', count: 65 },
    { name: 'Scaling', count: 45 },
    { name: 'Crowns', count: 30 },
    { name: 'Whitening', count: 20 },
    { name: 'Implants', count: 15 },
  ];

  return (
    <div className="space-y-6">
      
      {/* Top Section: Treatment Demand (Requested Feature) */}
      <div className="bg-white p-6 rounded-2xl border shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-lg text-slate-800">Treatment Demand Analysis</h3>
          <select className="border p-1 rounded text-sm"><option>This Month</option><option>Last 6 Months</option></select>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={treatmentDemand} margin={{top: 5, right: 30, left: 20, bottom: 5}}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#8884d8" radius={[4, 4, 0, 0]}>
                {treatmentDemand.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={['#137fec', '#22c55e', '#eab308', '#f97316', '#ef4444'][index % 5]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Section: Appointments & Recall */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border shadow-sm">
          <h3 className="font-bold text-slate-800 mb-4">Patient Visits Trend</h3>
          <div className="h-60">
             <ResponsiveContainer width="100%" height="100%">
               <AreaChart data={[{n:'M',v:10},{n:'T',v:15},{n:'W',v:8},{n:'T',v:20},{n:'F',v:12}]}>
                 <Area type="monotone" dataKey="v" stroke="#10b981" fill="#10b981" fillOpacity={0.1} />
               </AreaChart>
             </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b bg-slate-50"><h3 className="font-bold text-slate-800">Recalls Due</h3></div>
          <table className="w-full text-sm">
             <thead className="bg-slate-50 text-xs text-slate-500 uppercase"><tr><th className="p-3 text-left">Patient</th><th className="p-3 text-left">Reason</th><th className="p-3 text-left">Due</th></tr></thead>
             <tbody>
               <tr><td className="p-3">Ankit V.</td><td className="p-3">Scaling Check</td><td className="p-3 font-bold text-red-500">Tomorrow</td></tr>
               <tr><td className="p-3">Priya S.</td><td className="p-3">Braces Adj.</td><td className="p-3">In 3 days</td></tr>
             </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ReportPatients;