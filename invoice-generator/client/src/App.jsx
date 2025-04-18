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
import './theme.css';
import { AuthProvider } from './context/AuthContext';
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
            
            {/* Protected Routes - Require Authentication */}
            <Route path="/basic-details" element={
              <ProtectedRoute>
                <BasicDetails />
              </ProtectedRoute>
            } />
            <Route path="/tour-summary" element={
              <ProtectedRoute>
                <TourSummary />
              </ProtectedRoute>
            } />
            <Route path="/bill-details" element={
              <ProtectedRoute>
                <BillDetails />
              </ProtectedRoute>
            } />
            <Route path="/expenses" element={
              <ProtectedRoute>
                <Expenses />
              </ProtectedRoute>
            } />
            <Route path="/generate-invoice" element={
              <ProtectedRoute>
                <GenerateInvoice />
              </ProtectedRoute>
            } />
            <Route path="/invoice-history" element={
              <ProtectedRoute>
                <InvoiceHistory />
              </ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute>
                <EditProfile />
              </ProtectedRoute>
            } />
            {/* Admin Dashboard */}
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute adminRequired={true}>
                  <AdminDashboard />
                </ProtectedRoute>
              } 
            />
            
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;