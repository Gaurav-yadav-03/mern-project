import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import BasicDetails from './pages/BasicDetails';
import BillDetails from './pages/BillDetails';
import Expenses from './pages/Expenses';
import TourSummary from './pages/TourSummary';
import GenerateInvoice from './pages/GenerateInvoice';
import InvoiceHistory from './pages/InvoiceHistory';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Profile from './pages/Profile';
import ProtectedRoute from './components/ProtectedRoute';
import './App.css';
import './theme.css';
import { useUser } from "@clerk/clerk-react";

function App() {
  const { user } = useUser();
  const isAdmin = user?.publicMetadata?.role === "admin";

  return (
    <Router>
      <div className="App">
        <Navbar />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/" element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          } />
          <Route path="/basic-details" element={
            <ProtectedRoute>
              <BasicDetails />
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
          <Route path="/tour-summary" element={
            <ProtectedRoute>
              <TourSummary />
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
              <Profile />
            </ProtectedRoute>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;