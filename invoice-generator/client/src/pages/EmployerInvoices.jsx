import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import styles from './EmployerInvoices.module.css';

const EmployerInvoices = () => {
  const navigate = useNavigate();
  const { employerId } = useParams();
  const [employer, setEmployer] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all'); // all, pending, approved, rejected
  const API_BASE_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    // Check if user is admin
    const isAdmin = localStorage.getItem('admin') === 'true';
    if (!isAdmin) {
      navigate('/admin/login');
      return;
    }

    // Fetch employer details and invoices
    const fetchData = async () => {
      try {
        const [employerResponse, invoicesResponse] = await Promise.all([
          axios.get(`${API_BASE_URL}/api/employers/${employerId}`),
          axios.get(`${API_BASE_URL}/api/employers/${employerId}/invoices`)
        ]);
        setEmployer(employerResponse.data);
        setInvoices(invoicesResponse.data);
      } catch (err) {
        setError('Failed to fetch data');
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [employerId, navigate]);

  const handleLogout = () => {
    localStorage.removeItem('admin');
    navigate('/admin/login');
  };

  const handleBack = () => {
    navigate('/admin/employers');
  };

  const handleStatusChange = async (invoiceId, newStatus) => {
    try {
      await axios.put(`http://localhost:5000/api/invoices/${invoiceId}/status`, {
        status: newStatus
      });
      // Refresh invoices
      const response = await axios.get(`http://localhost:5000/api/employers/${employerId}/invoices`);
      setInvoices(response.data);
    } catch (err) {
      setError('Failed to update invoice status');
      console.error('Error updating invoice status:', err);
    }
  };

  const filteredInvoices = invoices.filter(invoice => {
    if (filter === 'all') return true;
    return invoice.status === filter;
  });

  if (loading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  if (!employer) {
    return <div className={styles.error}>Employer not found</div>;
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <button onClick={handleBack} className={styles.backButton}>
            Back to Employers
          </button>
          <h1>{employer.name}'s Invoices</h1>
        </div>
        <div className={styles.headerRight}>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="all">All Invoices</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <button onClick={handleLogout} className={styles.logoutButton}>
            Logout
          </button>
        </div>
      </header>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.employerInfo}>
        <h2>Employer Information</h2>
        <div className={styles.infoGrid}>
          <div>
            <strong>Email:</strong> {employer.email}
          </div>
          <div>
            <strong>Department:</strong> {employer.department}
          </div>
          <div>
            <strong>Employee ID:</strong> {employer.employeeId}
          </div>
          <div>
            <strong>Date Joined:</strong> {new Date(employer.createdAt).toLocaleDateString()}
          </div>
        </div>
      </div>

      <div className={styles.invoicesList}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Tour Period</th>
              <th>Date Generated</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredInvoices.map((invoice) => (
              <tr key={invoice._id}>
                <td>{invoice.tourPeriod}</td>
                <td>{new Date(invoice.createdAt).toLocaleDateString()}</td>
                <td>
                  <span className={`${styles.status} ${styles[invoice.status]}`}>
                    {invoice.status}
                  </span>
                </td>
                <td>
                  <div className={styles.actions}>
                    <button
                      onClick={() => handleStatusChange(invoice._id, 'approved')}
                      className={styles.approveButton}
                      disabled={invoice.status === 'approved'}
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleStatusChange(invoice._id, 'rejected')}
                      className={styles.rejectButton}
                      disabled={invoice.status === 'rejected'}
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => window.open(`/api/invoices/${invoice._id}/pdf`, '_blank')}
                      className={styles.viewButton}
                    >
                      View PDF
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EmployerInvoices; 