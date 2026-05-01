import './App.css';
import { createBrowserRouter, RouterProvider, Outlet, Navigate } from 'react-router-dom';

// Layout & Overlay
import NavigationLayout from './Components/NavigationLayout.jsx';
import GlobalTreatmentOverlay from './Components/GlobalTreatmentOverlay.jsx';

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
