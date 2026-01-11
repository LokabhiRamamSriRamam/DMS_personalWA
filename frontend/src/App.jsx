import './App.css';
import { createBrowserRouter, RouterProvider, Outlet } from 'react-router-dom';

// 1. Import your Layout
import NavigationLayout from './components/NavigationLayout';
import TreatmentPage from './pages/Treatmentpage';
import InvoicesPage from './pages/InvoicePage';
import AppointmentsPage from './pages/AppointmentsPage';
import PatientsPage from './pages/PatientsPage';
import TransactionsPage from './pages/TransactionsPage';
import LabPage from './pages/LabOrdersPage';
import InventoryPage from './pages/InventoryPage';

// 2. Define the Router with a "Parent" layout
const router = createBrowserRouter([
  {
    path: "/",
    // This element wraps ALL child routes. 
    // The <Outlet /> renders the specific page (Dashboard, Invoice, etc.) inside the layout.
    element: (
      <NavigationLayout>
        <Outlet /> 
      </NavigationLayout>
    ),
    children: [
        { path: "/", element: <AppointmentsPage /> },
        { path: "treatment/:id", element: <TreatmentPage /> }, 
        { path: "invoices", element: <InvoicesPage /> },
        { path: "patients", element: <PatientsPage /> },
        { path: "transactions", element: <TransactionsPage /> },
        { path: "lab", element: <LabPage /> },
        { path: "inventory", element: <InventoryPage /> },
        { path: "insights", element: <div>Insights Page</div> },
        { path: "promotions", element: <div>Promotions Page</div> },
        { path: "settings", element: <div>Settings Page</div> },
      ],
  },
]);

function App() {
  return (
    <>
      <RouterProvider router={router} />
    </>
  );
}

export default App;