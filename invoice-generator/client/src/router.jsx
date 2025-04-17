import { createBrowserRouter } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import BasicDetails from './pages/BasicDetails';
import TourSummary from './pages/TourSummary';
import BillDetails from './pages/BillDetails';
import Expenses from './pages/Expenses';
import GenerateInvoice from './pages/GenerateInvoice';
import InvoiceHistory from './pages/InvoiceHistory';
import EditProfile from './pages/EditProfile';
import AdminDashboard from './pages/AdminDashboard';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Home />
  },
  {
    path: '/login',
    element: <Login />
  },
  {
    path: '/basic-details',
    element: <BasicDetails />
  },
  {
    path: '/tour-summary',
    element: <TourSummary />
  },
  {
    path: '/bill-details',
    element: <BillDetails />
  },
  {
    path: '/expenses',
    element: <Expenses />
  },
  {
    path: '/generate-invoice',
    element: <GenerateInvoice />
  },
  {
    path: '/invoice-history',
    element: <InvoiceHistory />
  },
  {
    path: '/profile',
    element: <EditProfile />
  },
  {
    path: '/admin',
    element: <AdminDashboard />
  }
], {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true
  }
});

export default router;