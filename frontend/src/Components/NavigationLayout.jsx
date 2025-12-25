import React from 'react';

const SidebarItem = ({ icon, label, href = "#", active = false }) => {
  return (
    <a 
      href={href} 
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group ${
        active 
          ? 'bg-blue-600/10 text-blue-600' 
          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
      }`}
    >
      <span 
        className="material-symbols-outlined flex-shrink-0" 
        style={active ? { fontVariationSettings: "'FILL' 1" } : {}}
      >
        {icon}
      </span>
      <span className="text-sm font-medium opacity-0 w-0 group-hover/sidebar:w-auto group-hover/sidebar:opacity-100 transition-all duration-300 whitespace-nowrap overflow-hidden delay-75">
        {label}
      </span>
    </a>
  );
};

const NavigationLayout = ({ children }) => {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#f6f7f8] dark:bg-[#101922] font-sans text-slate-900 dark:text-white">
      {/* Sidebar */}
      <aside className="group/sidebar w-20 hover:w-64 transition-[width] duration-300 ease-in-out flex-shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1a2634] hidden md:flex flex-col z-30 overflow-visible">
        <div className="flex h-full flex-col justify-between p-4 overflow-hidden">
          <div className="flex flex-col gap-6">
            {/* Logo */}
            <div className="flex gap-3 items-center px-2 pt-2">
              <div className="flex-shrink-0 flex items-center justify-center rounded-lg size-10 bg-blue-600/10 text-blue-600">
                <span className="material-symbols-outlined text-3xl">dentistry</span>
              </div>
              <div className="flex flex-col opacity-0 w-0 group-hover/sidebar:w-auto group-hover/sidebar:opacity-100 transition-all duration-300 whitespace-nowrap overflow-hidden">
                <h1 className="text-slate-900 dark:text-white text-base font-bold leading-normal">Smile Clinic</h1>
                <p className="text-slate-500 dark:text-slate-400 text-xs font-normal leading-normal">Management System</p>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex flex-col gap-2">
              <SidebarItem icon="dashboard" label="Dashboard" active={true} />
              <SidebarItem icon="calendar_month" label="Appointments" />
              <SidebarItem icon="person" label="Patients" />
              <SidebarItem icon="credit_card" label="Billing" />
              <SidebarItem icon="lab_profile" label="Lab Results" />
              <SidebarItem icon="settings" label="Settings" />
            </nav>
          </div>

          {/* User Profile */}
          <div className="flex items-center gap-3 px-3 py-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 mt-auto overflow-hidden">
            <div 
              className="flex-shrink-0 bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 border border-slate-200 dark:border-slate-700" 
              style={{ backgroundImage: 'url("https://randomuser.me/api/portraits/women/44.jpg")' }} // Placeholder image
            ></div>
            <div className="flex flex-col overflow-hidden opacity-0 w-0 group-hover/sidebar:w-auto group-hover/sidebar:opacity-100 transition-all duration-300 whitespace-nowrap">
              <p className="text-slate-900 dark:text-white text-sm font-medium truncate">Dr. Sarah Smith</p>
              <p className="text-slate-500 dark:text-slate-400 text-xs truncate">Main Orthodontist</p>
            </div>
            <button className="ml-auto text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-300">
              <span className="material-symbols-outlined text-[20px]">logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Top Header */}
        <header className="flex items-center justify-between h-16 px-6 bg-white dark:bg-[#1a2634] border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20">
          <div className="flex items-center gap-4 w-full max-w-lg">
            <label className="relative flex items-center w-full group">
              <span className="absolute left-3 text-slate-400 material-symbols-outlined text-[20px]">search</span>
              <input 
                className="w-full bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white placeholder-slate-400 border-none rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-blue-600/50 transition-all outline-none" 
                placeholder="Search patients, appointments, or treatments..." 
                type="text" 
              />
            </label>
          </div>
          <div className="flex items-center gap-3 ml-4">
            <button className="flex items-center justify-center size-10 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors relative">
              <span className="material-symbols-outlined text-[24px]">notifications</span>
              <span className="absolute top-2 right-2 size-2.5 bg-red-500 rounded-full border-2 border-white dark:border-[#1a2634]"></span>
            </button>
            <button className="flex items-center justify-center size-10 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors">
              <span className="material-symbols-outlined text-[24px]">help</span>
            </button>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 scroll-smooth">
          {children}
        </div>
      </main>
    </div>
  );
};

export default NavigationLayout;