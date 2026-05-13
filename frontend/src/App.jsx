import './App.css';
import { createBrowserRouter, RouterProvider, Outlet, Navigate } from 'react-router-dom';

// Layout & Overlay
import NavigationLayout from './components/NavigationLayout.jsx';
import GlobalTreatmentOverlay from './components/GlobalTreatmentOverlay.jsx';

// Pages
import TreatmentPage from './pages/Treatmentpage.jsx';
import InvoicesPage from './pages/InvoicePage.jsx';
import AppointmentsPage from './pages/AppointmentsPage.jsx';
import PatientsPage from './pages/PatientsPage.jsx';
import PatientFilesPage from './pages/PatientFilesPage.jsx';
import TransactionsPage from './pages/TransactionsPage.jsx';
import LabPage from './pages/LabOrdersPage.jsx';
import InventoryPage from './pages/InventoryPage.jsx';
import ReportsPage from './pages/ReportsPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import WhatsAppPage from './pages/WhatsAppPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';

// Context
import { TreatmentProvider } from './Context/TreatmentContext.jsx';
import { AuthProvider, useAuth } from './Context/AuthContext.jsx';
import { UserProvider } from './Context/UserContext.jsx';
import { SettingsProvider } from './Context/SettingsContext.jsx';

// Redirect to /login if not authenticated
function ProtectedRoute() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return (
    <NavigationLayout>
      <Outlet />
      <GlobalTreatmentOverlay />
    </NavigationLayout>
  );
}

// Redirect to / if user's role doesn't have access to this route
function RoleRoute({ allow, children }) {
  const { user } = useAuth();
  const role = user?.role;
  if (!allow.includes(role)) return <Navigate to="/" replace />;
  return children;
}

const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    path: '/',
    element: <ProtectedRoute />,
    children: [
      { path: '/',              element: <AppointmentsPage /> },
      { path: 'treatment/:id',  element: <TreatmentPage /> },
      { path: 'patients',       element: <PatientsPage /> },
      { path: 'files',          element: <RoleRoute allow={['Owner','Assistant','Doctor']}><PatientFilesPage /></RoleRoute> },
      { path: 'transactions',   element: <RoleRoute allow={['Owner','Assistant']}><TransactionsPage /></RoleRoute> },
      { path: 'invoices',       element: <RoleRoute allow={['Owner','Assistant']}><InvoicesPage /></RoleRoute> },
      { path: 'lab',            element: <RoleRoute allow={['Owner','Assistant','Doctor']}><LabPage /></RoleRoute> },
      { path: 'inventory',      element: <RoleRoute allow={['Owner','Assistant']}><InventoryPage /></RoleRoute> },
      { path: 'insights',       element: <RoleRoute allow={['Owner']}><ReportsPage /></RoleRoute> },
      { path: 'whatsapp',       element: <RoleRoute allow={['Owner']}><WhatsAppPage /></RoleRoute> },
      { path: 'settings',       element: <RoleRoute allow={['Owner']}><SettingsPage /></RoleRoute> },
      { path: 'promotions',     element: <div>Promotions Page</div> },
    ],
  },
]);

function App() {
  return (
    <AuthProvider>
      <UserProvider>
        <SettingsProvider>
          <TreatmentProvider>
            <RouterProvider router={router} />
          </TreatmentProvider>
        </SettingsProvider>
      </UserProvider>
    </AuthProvider>
  );
}

export default App;
