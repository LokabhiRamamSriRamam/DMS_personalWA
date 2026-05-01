import './App.css';
import { createBrowserRouter, RouterProvider, Outlet, Navigate } from 'react-router-dom';

// Layout & Overlay
import NavigationLayout from './components/NavigationLayout';
import GlobalTreatmentOverlay from './components/GlobalTreatmentOverlay';

// Pages
import TreatmentPage from './pages/TreatmentPage';
import InvoicesPage from './pages/InvoicePage';
import AppointmentsPage from './pages/AppointmentsPage';
import PatientsPage from './pages/PatientsPage';
import PatientFilesPage from './pages/PatientFilesPage';
import TransactionsPage from './pages/TransactionsPage';
import LabPage from './pages/LabOrdersPage';
import InventoryPage from './pages/InventoryPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import WhatsAppPage from './pages/WhatsAppPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

// Context
import { TreatmentProvider } from './Context/TreatmentContext';
import { AuthProvider, useAuth } from './Context/AuthContext';
import { UserProvider } from './Context/UserContext';

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
      { path: '/', element: <AppointmentsPage /> },
      { path: 'treatment/:id', element: <TreatmentPage /> },
      { path: 'invoices', element: <InvoicesPage /> },
      { path: 'patients', element: <PatientsPage /> },
      { path: 'files', element: <PatientFilesPage /> },
      { path: 'transactions', element: <TransactionsPage /> },
      { path: 'lab', element: <LabPage /> },
      { path: 'inventory', element: <InventoryPage /> },
      { path: 'insights', element: <ReportsPage /> },
      { path: 'promotions', element: <div>Promotions Page</div> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'whatsapp', element: <WhatsAppPage /> },
    ],
  },
]);

function App() {
  return (
    <AuthProvider>
      <UserProvider>
        <TreatmentProvider>
          <RouterProvider router={router} />
        </TreatmentProvider>
      </UserProvider>
    </AuthProvider>
  );
}

export default App;
