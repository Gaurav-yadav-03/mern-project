import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import BasicDetails from './pages/BasicDetails';
import TourSummary from './pages/TourSummary';
import BillDetails from './pages/BillDetails';
import Expenses from './pages/Expenses';
import GenerateInvoice from './pages/GenerateInvoice';
import InvoiceHistory from './pages/InvoiceHistory';
import Login from './pages/Login';
import './App.css';
import { AuthProvider } from './context/AuthContext.jsx';  // Updated import path
import ProtectedRoute from './components/ProtectedRoute';
import EditProfile from './pages/EditProfile';
// Import AdminDashboard
import AdminDashboard from './pages/AdminDashboard';

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="App">
          <Navbar />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Home />} />
            <Route path="/basic-details" element={<BasicDetails />} />
            <Route path="/tour-summary" element={<TourSummary />} />
            <Route path="/bill-details" element={<BillDetails />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/generate-invoice" element={<GenerateInvoice />} />
            <Route path="/invoice-history" element={<InvoiceHistory />} />
            <Route path="/profile" element={<EditProfile />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;