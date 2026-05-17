import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../Context/AuthContext.jsx';
import { useUser } from '../Context/UserContext.jsx';
import { useInventorySettings } from '../Context/SettingsContext.jsx';
import ServerStatusBanner from './ServerStatusBanner.jsx';

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

const DrawerItem = ({ icon, label, to, active, onClick }) => (
  <Link
    to={to}
    onClick={onClick}
    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
      active
        ? 'bg-blue-600/10 text-blue-600 font-semibold'
        : 'text-slate-700 hover:bg-slate-100'
    }`}
  >
    <span
      className="material-symbols-outlined text-[22px]"
      style={active ? { fontVariationSettings: "'FILL' 1" } : {}}
    >
      {icon}
    </span>
    <span className="text-sm font-medium">{label}</span>
  </Link>
);

const ClinicInfoModal = ({ isOpen, onClose, tenant }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-[#1a2634] rounded-lg p-6 max-w-md w-full mx-4 max-h-96 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">{tenant?.name || 'Clinic'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
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
          {tenant?.phone && (
            <div className="flex gap-3">
              <span className="material-symbols-outlined text-slate-400 flex-shrink-0 text-sm">phone</span>
              <a href={`tel:${tenant.phone}`} className="text-blue-600 hover:underline text-sm">{tenant.phone}</a>
            </div>
          )}
          {tenant?.email && (
            <div className="flex gap-3">
              <span className="material-symbols-outlined text-slate-400 flex-shrink-0 text-sm">mail</span>
              <a href={`mailto:${tenant.email}`} className="text-blue-600 hover:underline text-sm truncate">{tenant.email}</a>
            </div>
          )}
        </div>
        <button onClick={onClose} className="w-full mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium">
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
  const { inventorySettings } = useInventorySettings();
  const [showClinicModal, setShowClinicModal] = React.useState(false);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [showSupportPopover, setShowSupportPopover] = useState(false);
  const [copied, setCopied] = useState(false);

  function handleCopySupport() {
    navigator.clipboard.writeText('support@connectgenai.in');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const showInventoryNav =
    inventorySettings.medicineEnabled || inventorySettings.consumableEnabled;

  const role = authUser?.role;
  const isOwner     = role === 'Owner';
  const isAssistant = role === 'Assistant';
  const isDoctor    = role === 'Doctor';
  const showDoctorRoutes    = isOwner || isAssistant || isDoctor;  // Files, Lab
  const showAssistantRoutes = isOwner || isAssistant;              // + Transactions, Invoices, Inventory
  const showOwnerRoutes     = isOwner;                             // + Insights, Settings

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const closeDrawer = () => setDrawerOpen(false);

  // Bottom tab bar items — role-filtered
  const bottomTabs = [
    { icon: 'calendar_month', label: 'Today', to: '/' },
    { icon: 'person', label: 'Patients', to: '/patients' },
    ...(showAssistantRoutes ? [
      { icon: 'receipt_long', label: 'Invoices', to: '/invoices' },
      { icon: 'credit_card', label: 'Finance', to: '/transactions' },
    ] : []),
  ];

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#f6f7f8] dark:bg-[#101922] font-sans text-slate-900 dark:text-white">

      {/* ── Desktop sidebar (md+) ── */}
      <aside className="group/sidebar w-20 hover:w-64 transition-[width] duration-300 ease-in-out flex-shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1a2634] hidden md:flex flex-col z-30 overflow-visible">
        <div className="flex h-full flex-col justify-between p-4 overflow-hidden">
          <div className="flex flex-col gap-6">
            <button
              onClick={() => setShowClinicModal(true)}
              className="w-full flex gap-3 items-center px-2 pt-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group/clinic"
            >
              <div className="flex-shrink-0 flex items-center justify-center rounded-lg size-10">
                <img src="/MolarisCubicLogoSmall.png" alt="Molaris" className="size-10 object-contain" />
              </div>
              <div className="flex-1 flex flex-col opacity-0 w-0 group-hover/sidebar:w-auto group-hover/sidebar:opacity-100 transition-all duration-300 whitespace-nowrap overflow-hidden text-left">
                <h1 className="text-slate-900 dark:text-white text-base font-bold leading-normal">{tenant?.name || 'Clinic'}</h1>
                <p className="text-slate-500 dark:text-slate-400 text-xs font-normal leading-normal">Management System</p>
              </div>
            </button>

            <nav className="flex flex-col gap-2">
              <SidebarItem icon="calendar_month" label="Appointments" to="/"          active={isActive('/')} />
              <SidebarItem icon="person"         label="Patients"     to="/patients"  active={isActive('/patients')} />
              {showDoctorRoutes    && <SidebarItem icon="folder"       label="Files"        to="/files"        active={isActive('/files')} />}
              {showAssistantRoutes && <SidebarItem icon="credit_card"  label="Transactions" to="/transactions" active={isActive('/transactions')} />}
              {showAssistantRoutes && <SidebarItem icon="receipt_long" label="Invoices"     to="/invoices"     active={isActive('/invoices')} />}
              {showDoctorRoutes    && <SidebarItem icon="science"      label="Lab"          to="/lab"          active={isActive('/lab')} />}
              {showAssistantRoutes && showInventoryNav && (
                <SidebarItem icon="inventory" label="Inventory" to="/inventory" active={isActive('/inventory')} />
              )}
              {showOwnerRoutes && <SidebarItem icon="dashboard" label="Insights"  to="/insights"  active={isActive('/insights')} />}
              {showOwnerRoutes && <SidebarItem icon="chat"      label="WhatsApp"  to="/whatsapp"  active={isActive('/whatsapp')} />}
              {showOwnerRoutes && <SidebarItem icon="settings"  label="Settings"  to="/settings"  active={isActive('/settings')} />}
            </nav>
          </div>

          <div className="flex items-center gap-3 px-3 py-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 mt-auto overflow-hidden">
            <div className="flex-shrink-0 flex items-center justify-center rounded-full size-10 border border-slate-200 dark:border-slate-700 bg-blue-100 text-blue-600 font-semibold text-sm">
              {user?.firstName?.charAt(0)?.toUpperCase() ?? '?'}
            </div>
            <div className="flex flex-col overflow-hidden opacity-0 w-0 group-hover/sidebar:w-auto group-hover/sidebar:opacity-100 transition-all duration-300 whitespace-nowrap">
              <p className="text-slate-900 dark:text-white text-sm font-medium truncate">
                {user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : user?.firstName ?? 'User'}
              </p>
              <p className="text-slate-500 dark:text-slate-400 text-xs truncate">{authUser?.role ?? ''}</p>
            </div>
            <button
              onClick={handleLogout}
              title="Logout"
              className="ml-auto text-slate-400 hover:text-red-500 opacity-0 group-hover/sidebar:opacity-100 transition-all duration-300"
            >
              <span className="material-symbols-outlined text-[20px]">logout</span>
            </button>
          </div>

          {/* Support */}
          <button
            onClick={() => setShowSupportPopover(v => !v)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors overflow-hidden mt-1"
            title="Support"
          >
            <div className="flex-shrink-0 flex items-center justify-center rounded-full size-10 text-slate-400">
              <span className="material-symbols-outlined text-[20px]">help</span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-xs opacity-0 w-0 group-hover/sidebar:w-auto group-hover/sidebar:opacity-100 transition-all duration-300 whitespace-nowrap">
              Support
            </p>
          </button>
        </div>
      </aside>

      {/* Support popup — screen centered */}
      {showSupportPopover && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setShowSupportPopover(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-80 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="size-10 rounded-full bg-blue-50 flex items-center justify-center text-[#137fec]">
                <span className="material-symbols-outlined text-[22px]">help</span>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">Contact Support</p>
                <p className="text-xs text-slate-400">Responds within 6 hours</p>
              </div>
            </div>
            <p className="text-xs text-slate-500 mb-3">Mail us at:</p>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5">
              <span className="text-sm text-slate-700 flex-1">support@connectgenai.in</span>
              <button
                onClick={handleCopySupport}
                className="text-xs font-semibold text-[#137fec] hover:text-blue-700 shrink-0"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Main content ── */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-200 z-20 flex-shrink-0">
          <button
            onClick={() => setDrawerOpen(true)}
            className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <span className="material-symbols-outlined text-[22px]">menu</span>
          </button>
          <button
            onClick={() => setShowClinicModal(true)}
            className="flex items-center gap-2"
          >
            <div className="flex items-center justify-center rounded-lg size-8">
              <img src="/MolarisCubicLogoSmall.png" alt="Molaris" className="size-8 object-contain" />
            </div>
            <span className="font-bold text-slate-900 text-sm">{tenant?.name || 'Clinic'}</span>
          </button>
        </div>

        {/* Scrollable page content — extra bottom padding on mobile for the tab bar */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <ServerStatusBanner />
          <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 pb-24 md:pb-8 scroll-smooth">
            {children}
          </div>
        </div>
      </main>

      {/* ── Mobile bottom tab bar ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-30 flex safe-area-inset-bottom">
        {bottomTabs.map((tab) => {
          const active = isActive(tab.to);
          return (
            <Link
              key={tab.to}
              to={tab.to}
              className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors"
            >
              <span
                className={`material-symbols-outlined text-[24px] transition-colors ${active ? 'text-blue-600' : 'text-slate-400'}`}
                style={active ? { fontVariationSettings: "'FILL' 1" } : {}}
              >
                {tab.icon}
              </span>
              <span className={`text-[10px] font-medium transition-colors ${active ? 'text-blue-600' : 'text-slate-400'}`}>
                {tab.label}
              </span>
              {active && <span className="absolute bottom-0 w-8 h-0.5 bg-blue-600 rounded-t-full" />}
            </Link>
          );
        })}
        {/* More button */}
        <button
          onClick={() => setDrawerOpen(true)}
          className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-slate-400 transition-colors"
        >
          <span className="material-symbols-outlined text-[24px]">more_horiz</span>
          <span className="text-[10px] font-medium">More</span>
        </button>
      </nav>

      {/* ── Mobile slide-in drawer ── */}
      {drawerOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40 md:hidden"
            onClick={closeDrawer}
          />
          <div className="fixed inset-y-0 left-0 w-72 bg-white z-50 md:hidden flex flex-col shadow-2xl">
            {/* Drawer header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center rounded-xl size-10">
                  <img src="/MolarisCubicLogoSmall.png" alt="Molaris" className="size-10 object-contain" />
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-sm">{tenant?.name || 'Clinic'}</p>
                  <p className="text-xs text-slate-500">Management System</p>
                </div>
              </div>
              <button onClick={closeDrawer} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Drawer nav */}
            <div className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
              <DrawerItem icon="calendar_month" label="Appointments" to="/"          active={isActive('/')}           onClick={closeDrawer} />
              <DrawerItem icon="person"         label="Patients"     to="/patients"  active={isActive('/patients')}   onClick={closeDrawer} />
              {showDoctorRoutes    && <DrawerItem icon="folder"       label="Files"        to="/files"        active={isActive('/files')}        onClick={closeDrawer} />}
              {showAssistantRoutes && <DrawerItem icon="credit_card"  label="Transactions" to="/transactions" active={isActive('/transactions')} onClick={closeDrawer} />}
              {showAssistantRoutes && <DrawerItem icon="receipt_long" label="Invoices"     to="/invoices"     active={isActive('/invoices')}     onClick={closeDrawer} />}
              {showDoctorRoutes    && <DrawerItem icon="science"      label="Lab"          to="/lab"          active={isActive('/lab')}          onClick={closeDrawer} />}
              {showAssistantRoutes && showInventoryNav && (
                <DrawerItem icon="inventory" label="Inventory" to="/inventory" active={isActive('/inventory')} onClick={closeDrawer} />
              )}
              {showOwnerRoutes && <DrawerItem icon="dashboard" label="Insights"  to="/insights"  active={isActive('/insights')}  onClick={closeDrawer} />}
              {showOwnerRoutes && <DrawerItem icon="chat"      label="WhatsApp"  to="/whatsapp"  active={isActive('/whatsapp')}  onClick={closeDrawer} />}
              {showOwnerRoutes && <DrawerItem icon="settings"  label="Settings"  to="/settings"  active={isActive('/settings')}  onClick={closeDrawer} />}
            </div>

            {/* Support */}
            <button
              onClick={() => { setShowSupportPopover(v => !v); closeDrawer(); }}
              className="w-full flex items-center gap-3 mx-3 mb-2 px-3 py-3 rounded-lg hover:bg-slate-50 transition-colors text-left"
            >
              <span className="material-symbols-outlined text-[20px] text-slate-400">help</span>
              <p className="text-sm font-medium text-slate-700">Support</p>
            </button>

            {/* Drawer footer — user + logout */}
            <div className="border-t border-slate-100 px-4 py-4">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-blue-100 text-blue-600 font-semibold text-sm flex items-center justify-center border border-slate-200">
                  {user?.firstName?.charAt(0)?.toUpperCase() ?? '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">
                    {user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : user?.firstName ?? 'User'}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{authUser?.role ?? ''}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  title="Logout"
                >
                  <span className="material-symbols-outlined text-[20px]">logout</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <ClinicInfoModal isOpen={showClinicModal} onClose={() => setShowClinicModal(false)} tenant={tenant} />
    </div>
  );
};

export default NavigationLayout;
