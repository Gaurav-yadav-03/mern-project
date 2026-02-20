import { createBrowserRouter, Navigate } from 'react-router-dom';
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
import AdminInvoices from './components/admin/AdminInvoices';
import AdminEmployees from './components/admin/AdminEmployees';
import { useUser } from "@clerk/clerk-react";
import Layout from './components/Layout';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { path: '', element: <Home /> },
      { path: 'login', element: <Login /> },
      { path: 'basic-details', element: <BasicDetails /> },
      { path: 'tour-summary', element: <TourSummary /> },
      { path: 'bill-details', element: <BillDetails /> },
      { path: 'expenses', element: <Expenses /> },
      { path: 'generate-invoice', element: <GenerateInvoice /> },
      { path: 'invoice-history', element: <InvoiceHistory /> },
      { path: 'profile', element: <EditProfile /> },
      { path: 'admin/dashboard', element: (
        <AdminRoute>
          <AdminDashboard />
        </AdminRoute>
      ) },
      { path: 'admin/invoices', element: (
        <AdminRoute>
          <AdminInvoices />
        </AdminRoute>
      ) },
      { path: 'admin/employees', element: (
        <AdminRoute>
          <AdminEmployees />
        </AdminRoute>
      ) },
      { path: 'admin', element: <Navigate to="/admin/dashboard" replace /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ]
  }
], {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true
  }
});

function AdminRoute({ children }) {
  const { isSignedIn, user } = useUser();
  const isAdmin = user && (user.emailAddresses?.[0]?.emailAddress === 'admin@gmail.com' || user.publicMetadata?.role === 'admin');
  if (!isSignedIn) return <Navigate to="/login" />;
  if (!isAdmin) return <Navigate to="/home" />;
  return children;
}

export default router;