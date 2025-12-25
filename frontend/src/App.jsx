import './App.css';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import DashboardPage from './pages/DashboardPage';
import TreatmentPage from './pages/Treatmentpage';



const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <div>
        <div >
          <DashboardPage />
        </div>
      </div>
    ),
  },
  {
    path: "/treatment",
    element: (
      <div>
        <div >
          <TreatmentPage />
        </div>
      </div>
    ),
  },
]);

function App() {
  return (
    <>
      <RouterProvider router={router} />
      <h1>Jai Sri Ganesh</h1>
    </>
  );
}

export default App;
