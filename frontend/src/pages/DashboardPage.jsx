import React, { useState } from 'react';
import { 
  MoreVertical, Calendar, TrendingUp, Users, CreditCard, FileText, Plus,
  Clock
} from 'lucide-react';
import NavigationLayout from '../Components/NavigationLayout';

// --- Sub-Component: Stat Card ---
const StatCard = ({ icon, colorClass, title, value, trend, trendUp, subtext }) => (
  <div className="bg-white dark:bg-card-dark p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-1 relative overflow-hidden group transition-all">
    <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
      <div className={`text-6xl ${colorClass}`}>{icon}</div>
    </div>
    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">{title}</p>
    <div className="flex items-end gap-2 mt-1">
      <p className="text-3xl font-bold text-slate-900 dark:text-white">{value}</p>
      {trend && (
        <span className={`flex items-center text-xs font-semibold px-1.5 py-0.5 rounded mb-1 ${trendUp ? 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400' : 'text-slate-500 bg-slate-100 dark:bg-slate-700 dark:text-slate-300'}`}>
          {trendUp && <TrendingUp size={14} className="mr-0.5" />}
          {trend}
        </span>
      )}
    </div>
    <p className="text-xs text-slate-400 mt-2">{subtext}</p>
  </div>
);

// --- Sub-Component: Calendar Block ---
const AppointmentBlock = ({ top, height, colorClass, bgClass, time, patient, type, cancelled = false }) => (
  <div 
    className={`absolute left-1 right-1 p-2 m-0.5 rounded-lg border-l-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer group ${colorClass} ${bgClass} ${cancelled ? 'opacity-70 hover:opacity-100' : ''}`}
    style={{ top: top, height: height }}
  >
    <div className="flex justify-between items-start">
      <span className={`text-xs font-bold block ${cancelled ? 'decoration-red-500 line-through decoration-2' : ''} ${colorClass.replace('border-', 'text-').replace('500', '800')}`}>{time}</span>
      {!cancelled && <span className="size-1.5 rounded-full bg-current animate-pulse"></span>}
    </div>
    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 mt-0.5 truncate">{patient}</p>
    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{type}</p>
    {cancelled && (
      <span className="absolute bottom-2 right-2 text-[10px] font-bold text-red-600 uppercase border border-red-200 bg-red-100 px-1 rounded">Cancelled</span>
    )}
  </div>
);

const DashboardPage = () => {
  const [view, setView] = useState('list');

  // Mock Data
  const appointments = [
    { time: '09:00 AM', patient: 'John Doe', id: '#P-0023', treatment: 'Root Canal', doctor: 'Dr. Smith', status: 'In Progress', statusColor: 'green' },
    { time: '10:30 AM', patient: 'Alice Johnson', id: '#P-0156', treatment: 'Cleaning', doctor: 'Dr. Emily', status: 'Checked In', statusColor: 'blue' },
    { time: '11:15 AM', patient: 'Robert Mike', id: '#P-0189', treatment: 'Consultation', doctor: 'Dr. Smith', status: 'Waiting', statusColor: 'orange' },
    { time: '01:00 PM', patient: 'Sarah Connor', id: '#P-0201', treatment: 'Whitening', doctor: 'Dr. Brown', status: 'Confirmed', statusColor: 'slate' },
    { time: '02:30 PM', patient: 'James Wilson', id: '#P-0222', treatment: 'Extraction', doctor: 'Dr. Smith', status: 'Cancelled', statusColor: 'red' },
  ];

  // Helper styles for status badges
  const getStatusStyles = (color) => {
    const map = {
      green: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
      blue: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
      orange: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800',
      slate: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600',
      red: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
    };
    return map[color] || map.slate;
  };

  const getDotColor = (color) => {
    const map = { green: 'bg-green-500', blue: 'bg-blue-500', orange: 'bg-orange-500', slate: 'bg-slate-400', red: 'bg-red-500' };
    return map[color] || 'bg-slate-400';
  };

  return (<div className="min-h-screen bg-[#EBF2F7] font-sans">
    <NavigationLayout>
      <div className="max-w-[1200px] mx-auto flex flex-col gap-8 pb-10 font-display">
        
        {/* Title & Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Dashboard</h1>
          </div>
          <div className="flex gap-3">
            <button className="px-4 py-2.5 rounded-lg bg-primary text-white text-sm font-semibold shadow-lg shadow-primary/30 hover:bg-blue-600 transition-all flex items-center gap-2">
              <Plus size={18} />
              New Appointment
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <StatCard icon={<Calendar />} colorClass="text-primary" title="Total Appointments" value="24" trend="+5%" trendUp={true} subtext="Vs. yesterday" />
          <div className="bg-white dark:bg-card-dark p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-1 relative overflow-hidden group">
            <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <div className="text-6xl text-orange-500"><Users /></div>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Pending Check-ins</p>
            <div className="flex items-end gap-2 mt-1">
              <p className="text-3xl font-bold text-slate-900 dark:text-white">12</p>
              <span className="text-xs text-slate-400 mb-1 font-medium">/ 24 Arrived</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full mt-3 overflow-hidden">
              <div className="bg-orange-500 h-1.5 rounded-full" style={{ width: '50%' }}></div>
            </div>
          </div>
          <StatCard icon={<CreditCard />} colorClass="text-primary" title="Today's Revenue" value="$4,250" trend="+12%" trendUp={true} subtext="Target: $5,000" />
          <StatCard icon={<FileText />} colorClass="text-red-500" title="Outstanding" value="$850" trend="2 Invoices" trendUp={false} subtext="Due this week" />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          
          {/* Left Column: List/Calendar */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            
            {/* View Toggle Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="bg-slate-100 dark:bg-slate-800/70 p-1 rounded-lg flex text-sm font-medium">
                <button 
                  onClick={() => setView('list')}
                  className={`px-4 py-2 rounded-md transition-all focus:outline-none ${view === 'list' ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm font-semibold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
                >
                  Appointment List
                </button>
                <button 
                  onClick={() => setView('calendar')}
                  className={`px-4 py-2 rounded-md transition-all focus:outline-none ${view === 'calendar' ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm font-semibold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
                >
                  Calendar View
                </button>
              </div>
              
              {/* Date Filters */}
              <div className="flex bg-slate-100 dark:bg-slate-800/70 rounded-lg p-1 self-start sm:self-auto">
                <button className="px-3 py-1 text-xs font-semibold rounded-md bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm transition-all border border-slate-200 dark:border-slate-500">Today</button>
                <button className="px-3 py-1 text-xs font-medium rounded-md text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all">Tomorrow</button>
                <button className="px-3 py-1 text-xs font-medium rounded-md text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all">Custom Date</button>
              </div>
            </div>

            {/* --- CONDITIONAL CONTENT --- */}
            {view === 'list' ? (
              // 1. APPOINTMENT LIST TABLE
              <div className="bg-white dark:bg-card-dark border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden min-h-[700px] flex flex-col">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="px-6 py-3 font-semibold">Time</th>
                        <th className="px-6 py-3 font-semibold">Patient</th>
                        <th className="px-6 py-3 font-semibold">Treatment</th>
                        <th className="px-6 py-3 font-semibold">Doctor</th>
                        <th className="px-6 py-3 font-semibold">Status</th>
                        <th className="px-6 py-3 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {appointments.map((apt, index) => (
                        <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                          <td className="px-6 py-4 font-medium text-slate-900 dark:text-white whitespace-nowrap">{apt.time}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="size-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-500">
                                {apt.patient.charAt(0)}
                              </div>
                              <div className="flex flex-col">
                                <span className="font-medium text-slate-900 dark:text-white">{apt.patient}</span>
                                <span className="text-xs text-slate-500">{apt.id}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{apt.treatment}</td>
                          <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{apt.doctor}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusStyles(apt.statusColor)}`}>
                              <span className={`size-1.5 rounded-full ${getDotColor(apt.statusColor)}`}></span>
                              {apt.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button className="text-slate-400 hover:text-primary transition-colors">
                              <MoreVertical size={20} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="px-6 py-4 mt-auto border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex justify-center">
                  <button className="text-sm font-semibold text-primary hover:text-blue-700 transition-colors">View All Appointments</button>
                </div>
              </div>
            ) : (
              // 2. CALENDAR VIEW
              <div className="bg-white dark:bg-card-dark border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden flex flex-col h-[700px]">
                <div className="grid grid-cols-[60px_1fr_1fr_1fr] border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex-none z-10">
                  <div className="p-4 border-r border-slate-200 dark:border-slate-800 flex items-center justify-center">
                    <Clock className="text-slate-400" size={20} />
                  </div>
                  {['Dr. Smith', 'Dr. Emily', 'Dr. Brown'].map((dr, idx) => (
                    <div key={idx} className="p-3 text-center border-r border-slate-200 dark:border-slate-800 last:border-r-0">
                      <div className="flex flex-col items-center gap-2">
                        <div className="size-9 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs text-slate-500 font-bold">Dr</div>
                        <div>
                          <p className="font-semibold text-sm text-slate-900 dark:text-white">{dr}</p>
                          <p className="text-[10px] uppercase tracking-wide text-slate-500">{['Orthodontist', 'Hygienist', 'Surgeon'][idx]}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="overflow-y-auto flex-1 relative bg-white dark:bg-card-dark">
                  <div className="min-h-[768px] relative grid grid-cols-[60px_1fr_1fr_1fr] divide-x divide-slate-100 dark:divide-slate-800">
                    <div className="bg-slate-50/40 dark:bg-slate-800/20 text-xs text-slate-400 font-medium">
                      {['09:00', '10:00', '11:00', '12:00', '01:00', '02:00', '03:00', '04:00'].map(time => (
                        <div key={time} className="h-24 border-b border-slate-100 dark:border-slate-800 p-2 text-right">{time}</div>
                      ))}
                    </div>
                    {/* Calendar Blocks */}
                    <div className="relative">
                      <div className="absolute inset-0 flex flex-col">
                        {[...Array(8)].map((_, i) => <div key={i} className="h-24 border-b border-slate-50 dark:border-slate-800/50"></div>)}
                      </div>
                      <AppointmentBlock top="0px" height="96px" colorClass="border-green-500" bgClass="bg-green-50 dark:bg-green-900/20" time="09:00 - 10:00" patient="John Doe" type="Root Canal" />
                      <AppointmentBlock top="216px" height="72px" colorClass="border-orange-500" bgClass="bg-orange-50 dark:bg-orange-900/20" time="11:15 - 12:00" patient="Robert Mike" type="Consultation" />
                      <AppointmentBlock top="528px" height="96px" colorClass="border-red-500" bgClass="bg-red-50 dark:bg-red-900/20" time="02:30 - 03:30" patient="James Wilson" type="Extraction" cancelled={true} />
                    </div>
                    <div className="relative">
                      <div className="absolute inset-0 flex flex-col">
                        {[...Array(8)].map((_, i) => <div key={i} className="h-24 border-b border-slate-50 dark:border-slate-800/50"></div>)}
                      </div>
                      <AppointmentBlock top="144px" height="72px" colorClass="border-blue-500" bgClass="bg-blue-50 dark:bg-blue-900/20" time="10:30 - 11:15" patient="Alice Johnson" type="Cleaning" />
                      <div className="absolute top-[300px] left-0 right-0 h-24 flex items-center justify-center">
                        <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-xs text-slate-400 font-medium">Lunch Break</span>
                      </div>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-0 flex flex-col">
                        {[...Array(8)].map((_, i) => <div key={i} className="h-24 border-b border-slate-50 dark:border-slate-800/50"></div>)}
                      </div>
                      <AppointmentBlock top="384px" height="96px" colorClass="border-slate-500" bgClass="bg-slate-100 dark:bg-slate-700" time="01:00 - 02:00" patient="Sarah Connor" type="Whitening" />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar */}
          <div className="flex flex-col gap-6">
            <div className="bg-primary/5 dark:bg-card-dark p-6 rounded-xl border border-primary/20 dark:border-slate-800">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">Up Next</h3>
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-4">
                  <div className="size-16 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xl font-bold text-slate-500 ring-4 ring-white dark:ring-slate-800 shadow-md">SC</div>
                  <div>
                    <p className="text-lg font-bold text-slate-900 dark:text-white">Sarah Connor</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Whitening Procedure</p>
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-4 rounded-lg flex items-center justify-between border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                    <Clock size={18} className="text-primary" />
                    <span className="font-semibold text-sm">01:00 PM</span>
                  </div>
                  <span className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300">Room 2</span>
                </div>
                <div className="flex gap-2 mt-1">
                  <button className="flex-1 py-2 rounded-lg bg-primary text-white text-sm font-medium shadow-md shadow-primary/20 hover:bg-primary/90 transition-colors">Start Visit</button>
                  <button className="flex-1 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">Details</button>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-card-dark p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Dentists</h3>
                <button className="text-xs font-semibold text-primary">See All</button>
              </div>
              <div className="flex flex-col gap-4">
                {[
                  { name: 'Dr. Smith', role: 'Orthodontist', status: 'Available', statusColor: 'green' },
                  { name: 'Dr. Emily', role: 'Hygienist', status: 'In surgery', statusColor: 'orange' },
                  { name: 'Dr. Brown', role: 'Surgeon', status: 'Off duty', statusColor: 'slate' },
                ].map((doc, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="size-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-500">
                          {doc.name.split(' ')[1].charAt(0)}
                        </div>
                        <span className={`absolute bottom-0 right-0 size-2.5 rounded-full bg-${doc.statusColor === 'slate' ? 'slate-300' : doc.statusColor + '-500'} border-2 border-white dark:border-[#1a2634]`}></span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{doc.name}</p>
                        <p className="text-xs text-slate-500">{doc.role}</p>
                      </div>
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded bg-${doc.statusColor}-50 dark:bg-${doc.statusColor}-900/20 text-${doc.statusColor}-600`}>{doc.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </NavigationLayout>
    </div>
  );
};

export default DashboardPage;