import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const ReportClinical = () => {
  const doctorPerformance = [
    { name: 'Dr. Sarah', patients: 120, revenue: 45000 },
    { name: 'Dr. Rajesh', patients: 98, revenue: 38000 },
    { name: 'Dr. Emily', patients: 86, revenue: 32000 },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Doctor Revenue Chart */}
        <div className="bg-white p-6 rounded-2xl border shadow-sm h-80">
          <h3 className="font-bold text-slate-800 mb-4">Revenue by Doctor</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={doctorPerformance} layout="vertical">
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" width={100} axisLine={false} tickLine={false} />
              <Tooltip cursor={{fill: 'transparent'}} />
              <Bar dataKey="revenue" fill="#137fec" radius={[0, 4, 4, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Lab Status Table */}
        <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b bg-slate-50"><h3 className="font-bold text-slate-800">Active Lab Works</h3></div>
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50"><tr><th className="p-3">Patient</th><th className="p-3">Lab</th><th className="p-3">Status</th></tr></thead>
            <tbody>
              <tr><td className="p-3">Rahul K.</td><td className="p-3">City Lab</td><td className="p-3 text-orange-600 font-medium">Sent</td></tr>
              <tr><td className="p-3">Sneha G.</td><td className="p-3">Dental Depot</td><td className="p-3 text-green-600 font-medium">Received</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ReportClinical;