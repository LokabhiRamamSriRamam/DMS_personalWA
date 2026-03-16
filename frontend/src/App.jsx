import './App.css';
import { createBrowserRouter, RouterProvider, Outlet } from 'react-router-dom';

// 1. Import your Layout & Components
import NavigationLayout from './components/NavigationLayout';
import GlobalTreatmentOverlay from './components/GlobalTreatmentOverlay'; // Import Overlay

// Pages
import TreatmentPage from './pages/TreatmentPage'; // Check filename capitalization (TreatmentPage vs Treatmentpage)
import InvoicesPage from './pages/InvoicePage';
import AppointmentsPage from './pages/AppointmentsPage';
import PatientsPage from './pages/PatientsPage';
import TransactionsPage from './pages/TransactionsPage';
import LabPage from './pages/LabOrdersPage';
import InventoryPage from './pages/InventoryPage';
import ReportsPage from './pages/ReportsPage';

// Context
import { TreatmentProvider } from './Context/TreatmentContext'; 

// --- ROOT COMPONENT ---
// We create this small wrapper to inject the Overlay inside the Router context
const RootAppLayout = () => {
  return (
    <NavigationLayout>
      {/* Renders the current page */}
      <Outlet /> 
      
      {/* Renders the Minimized/Maximized Treatment Window on top of any page */}
      <GlobalTreatmentOverlay /> 
    </NavigationLayout>
  );
};

// 2. Define the Router
const router = createBrowserRouter([
  {
    path: "/",
    element: <RootAppLayout />, // Use the wrapper here
    children: [
        { path: "/", element: <AppointmentsPage /> },
        { path: "treatment/:id", element: <TreatmentPage /> }, 
        { path: "invoices", element: <InvoicesPage /> },
        { path: "patients", element: <PatientsPage /> },
        { path: "transactions", element: <TransactionsPage /> },
        { path: "lab", element: <LabPage /> },
        { path: "inventory", element: <InventoryPage /> },
        { path: "insights", element: <ReportsPage /> },
        { path: "promotions", element: <div>Promotions Page</div> },
        { path: "settings", element: <div>Settings Page</div> },
      ],
  },
]);

function App() {
  return (
    // Provider wraps the Router so context is available everywhere
    <TreatmentProvider>
      <RouterProvider router={router} />
    </TreatmentProvider>
  );
}

export default App;