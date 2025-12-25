import './App.css';
import { createBrowserRouter, RouterProvider, Outlet } from 'react-router-dom';

// 1. Import your Layout
import NavigationLayout from './components/NavigationLayout'; // Adjust path if needed

import TreatmentPage from './pages/Treatmentpage';
import InvoicesPage from './pages/InvoicePage';
import AppointmentsPage from './pages/AppointmentsPage';
import PatientsPage from './pages/PatientsPage';

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
      {path: "/", element: <AppointmentsPage />},
      {path: "treatment", element: <TreatmentPage />},
      {path: "invoices", element: <InvoicesPage />},
      { path: "patients", element: <PatientsPage/>},
      { path: "transactions", element: <div>Transactions Page</div> },
      { path: "lab", element: <div>Lab Page</div> },
      { path: "inventory", element: <div>Inventory Page</div> },
      { path: "reports", element: <div>Reports Page</div> },
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