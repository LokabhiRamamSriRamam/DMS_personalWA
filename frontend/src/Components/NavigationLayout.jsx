import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../Context/AuthContext';
import { useUser } from '../Context/UserContext';

const SidebarItem = ({ icon, label, to = "#", active = false, onClick }) => {
  return (
    <Link 
      to={to}
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative ${
        active 
          ? 'bg-blue-600/10 text-blue-600' 
          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400'
      }`}
    >
      {/* Active Indicator Bar */}
      {active && (
        <div className="absolute left-0 w-1 h-6 bg-blue-600 rounded-r-full" />
      )}

      <span 
        className="material-symbols-outlined flex-shrink-0 transition-transform duration-200 group-hover:scale-110" 
        style={active ? { fontVariationSettings: "'FILL' 1" } : {}}
      >
        {icon}
      </span>
      
      <span className="text-sm font-medium opacity-0 w-0 group-hover/sidebar:w-auto group-hover/sidebar:opacity-100 transition-all duration-300 whitespace-nowrap overflow-hidden delay-75">
        {label}
      </span>
    </Link>
  );
};

const ClinicInfoModal = ({ isOpen, onClose, tenant }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-[#1a2634] rounded-lg p-6 max-w-md w-full mx-4 max-h-96 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">{tenant?.name || 'Clinic'}</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="space-y-3">
          {tenant?.address && (
            <div className="flex gap-3">
              <span className="material-symbols-outlined text-slate-400 flex-shrink-0 text-sm">location_on</span>
              <p className="text-slate-600 dark:text-slate-300 text-sm">{tenant.address}</p>
            </div>
          )}
          {tenant?.city && tenant?.state && (
            <div className="flex gap-3">
              <span className="material-symbols-outlined text-slate-400 flex-shrink-0 text-sm">apartment</span>
              <p className="text-slate-600 dark:text-slate-300 text-sm">{tenant.city}, {tenant.state}{tenant.zipCode ? ` ${tenant.zipCode}` : ''}</p>
            </div>
          )}
          {tenant?.country && (
            <div className="flex gap-3">
              <span className="material-symbols-outlined text-slate-400 flex-shrink-0 text-sm">public</span>
              <p className="text-slate-600 dark:text-slate-300 text-sm">{tenant.country}</p>
            </div>
          )}
          {tenant?.phone && (
            <div className="flex gap-3">
              <span className="material-symbols-outlined text-slate-400 flex-shrink-0 text-sm">phone</span>
              <a href={`tel:${tenant.phone}`} className="text-blue-600 dark:text-blue-400 hover:underline text-sm">{tenant.phone}</a>
            </div>
          )}
          {tenant?.email && (
            <div className="flex gap-3">
              <span className="material-symbols-outlined text-slate-400 flex-shrink-0 text-sm">mail</span>
              <a href={`mailto:${tenant.email}`} className="text-blue-600 dark:text-blue-400 hover:underline text-sm truncate">{tenant.email}</a>
            </div>
          )}
          {tenant?.website && (
            <div className="flex gap-3">
              <span className="material-symbols-outlined text-slate-400 flex-shrink-0 text-sm">language</span>
              <a href={tenant.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline text-sm truncate">{tenant.website}</a>
            </div>
          )}
          {tenant?.timezone && (
            <div className="flex gap-3">
              <span className="material-symbols-outlined text-slate-400 flex-shrink-0 text-sm">schedule</span>
              <p className="text-slate-600 dark:text-slate-300 text-sm">{tenant.timezone}</p>
            </div>
          )}
          {tenant?.currency && (
            <div className="flex gap-3">
              <span className="material-symbols-outlined text-slate-400 flex-shrink-0 text-sm">currency_rupee</span>
              <p className="text-slate-600 dark:text-slate-300 text-sm">{tenant.currency}</p>
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
        >
          Close
        </button>
      </div>
    </div>
  );
};

const NavigationLayout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user: authUser, logout } = useAuth();
  const { user, tenant } = useUser();
  const [showClinicModal, setShowClinicModal] = React.useState(false);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  // Helper to check if the path matches the current location
  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#f6f7f8] dark:bg-[#101922] font-sans text-slate-900 dark:text-white">
      {/* Sidebar */}
      <aside className="group/sidebar w-20 hover:w-64 transition-[width] duration-300 ease-in-out flex-shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1a2634] hidden md:flex flex-col z-30 overflow-visible">
        <div className="flex h-full flex-col justify-between p-4 overflow-hidden">
          <div className="flex flex-col gap-6">
            {/* Clinic Info Section - Click to Open Modal */}
            <button
              onClick={() => setShowClinicModal(true)}
              className="w-full flex gap-3 items-center px-2 pt-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group/clinic"
            >
              <div className="flex-shrink-0 flex items-center justify-center rounded-lg size-10 bg-blue-600/10 text-blue-600">
                <span className="material-symbols-outlined text-3xl">dentistry</span>
              </div>
              <div className="flex-1 flex flex-col opacity-0 w-0 group-hover/sidebar:w-auto group-hover/sidebar:opacity-100 transition-all duration-300 whitespace-nowrap overflow-hidden text-left">
                <h1 className="text-slate-900 dark:text-white text-base font-bold leading-normal">{tenant?.name || 'Clinic'}</h1>
                <p className="text-slate-500 dark:text-slate-400 text-xs font-normal leading-normal">Management System</p>
              </div>
            </button>

            {/* Navigation */}
            <nav className="flex flex-col gap-2">
              <SidebarItem 
                icon="calendar_month" 
                label="Appointments" 
                to="/" 
                active={isActive('/appointments')} 
              />
              <SidebarItem 
                icon="person" 
                label="Patients" 
                to="/patients" 
                active={isActive('/patients')} 
              />
              <SidebarItem 
                icon="credit_card" 
                label="Transactions" 
                to="/transactions" 
                active={isActive('/transactions')} 
              />
              <SidebarItem 
                icon="receipt_long" 
                label="Invoices" 
                to="/invoices" 
                active={isActive('/invoices')} 
              />
              <SidebarItem 
                icon="science" 
                label="Lab" 
                to="/lab" 
                active={isActive('/lab')} 
              />
              <SidebarItem 
                icon="inventory" 
                label="Inventory" 
                to="/inventory" 
                active={isActive('/inventory')} 
              />
              <SidebarItem 
                icon="dashboard" 
                label="Insights" 
                to="/insights" 
                active={isActive('/insights')} 
              />
              {/* <SidebarItem
                icon="campaign"
                label="Promotions"
                to="/promotions"
                active={isActive('/promotions')}
              /> */}
              <SidebarItem
                icon="chat"
                label="WhatsApp"
                to="/whatsapp"
                active={isActive('/whatsapp')}
              />
              <SidebarItem
                icon="settings"
                label="Settings"
                to="/settings"
                active={isActive('/settings')}
              />
            </nav>
          </div>

          {/* User Profile */}
          <div className="flex items-center gap-3 px-3 py-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 mt-auto overflow-hidden">
            <div className="flex-shrink-0 flex items-center justify-center rounded-full size-10 border border-slate-200 dark:border-slate-700 bg-blue-100 text-blue-600 font-semibold text-sm">
              {user?.firstName?.charAt(0)?.toUpperCase() ?? '?'}
            </div>
            <div className="flex flex-col overflow-hidden opacity-0 w-0 group-hover/sidebar:w-auto group-hover/sidebar:opacity-100 transition-all duration-300 whitespace-nowrap">
              <p className="text-slate-900 dark:text-white text-sm font-medium truncate">{user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : user?.firstName ?? 'User'}</p>
              <p className="text-slate-500 dark:text-slate-400 text-xs truncate">{user?.role ?? ''}</p>
            </div>
            <button
              onClick={handleLogout}
              title="Logout"
              className="ml-auto text-slate-400 hover:text-red-500 opacity-0 group-hover/sidebar:opacity-100 transition-all duration-300"
            >
              <span className="material-symbols-outlined text-[20px]">logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Top Header */}
        {/* <header className="flex items-center justify-between h-16 px-6 bg-white dark:bg-[#1a2634] border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20">
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
        </header> */}

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 scroll-smooth">
          {children}
        </div>
      </main>

      {/* Clinic Info Modal */}
      <ClinicInfoModal isOpen={showClinicModal} onClose={() => setShowClinicModal(false)} tenant={tenant} />
    </div>
  );
};

export default NavigationLayout;