import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './AdminDashboard.module.css';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('employees');
  const [employees, setEmployees] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  
  useEffect(() => {
    // Check if user is admin
    const checkAdmin = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/auth/status', {
          credentials: 'include'
        });
        const data = await response.json();
        
        if (!data.isAuthenticated || !data.user.isAdmin) {
          navigate('/');
        } else {
          // Fetch initial data
          fetchData(activeTab);
        }
      } catch (error) {
        console.error('Admin check failed:', error);
        navigate('/');
      }
    };
    
    checkAdmin();
  }, [navigate]);
  
  useEffect(() => {
    if (activeTab) {
      fetchData(activeTab);
    }
  }, [activeTab]);
  
  // In the fetchData function
  const fetchData = async (tab) => {
    setIsLoading(true);
    setError('');
    
    try {
      let url = '';
      if (tab === 'employees') {
        url = 'http://localhost:5000/api/admin/employees';
      } else if (tab === 'invoices') {
        url = 'http://localhost:5000/api/admin/invoices';
      }
      
      console.log('Fetching from:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to fetch ${tab}`);
      }
      
      const data = await response.json();
      console.log(`${tab} data:`, data);
      
      if (tab === 'employees') {
        setEmployees(data);
      } else if (tab === 'invoices') {
        setInvoices(data);
      }
    } catch (error) {
      console.error(`Error fetching ${tab}:`, error);
      setError(`Failed to load ${tab}: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  const updateInvoiceStatus = async (invoiceId, status, remarks) => {
    try {
      const response = await fetch(`http://localhost:5000/api/admin/invoices/${invoiceId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ status, remarks })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update status');
      }
      
      // Refresh invoices
      fetchData('invoices');
    } catch (error) {
      console.error('Update error:', error);
      setError('Failed to update invoice status');
    }
  };
  
  return (
    <div className={styles.adminContainer}>
      <div className={styles.adminSidebar}>
        <h2>Admin Panel</h2>
        <ul>
          <li 
            className={activeTab === 'employees' ? styles.active : ''}
            onClick={() => setActiveTab('employees')}
          >
            Employees
          </li>
          <li 
            className={activeTab === 'invoices' ? styles.active : ''}
            onClick={() => setActiveTab('invoices')}
          >
            Invoice History
          </li>
        </ul>
      </div>
      
      <div className={styles.adminContent}>
        {isLoading ? (
          <div className={styles.loading}>Loading...</div>
        ) : error ? (
          <div className={styles.error}>{error}</div>
        ) : (
          <>
            {activeTab === 'employees' && (
              <div className={styles.employeesTable}>
                <h2>Employee Management</h2>
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Employee ID</th>
                      <th>Department</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.length > 0 ? (
                      employees.map(employee => (
                        <tr key={employee._id}>
                          <td>{employee.name}</td>
                          <td>{employee.email}</td>
                          <td>{employee.employeeId || 'Not assigned'}</td>
                          <td>{employee.department || 'Not assigned'}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4">No employees found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
            
            {activeTab === 'invoices' && (
              <div className={styles.invoicesTable}>
                <h2>Invoice Management</h2>
                <table>
                  <thead>
                    <tr>
                      <th>Invoice #</th>
                      <th>Employee</th>
                      <th>Amount</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.length > 0 ? (
                      invoices.map(invoice => (
                        <tr key={invoice._id}>
                          <td>{invoice.invoiceNumber || invoice._id.substring(0, 8)}</td>
                          <td>{invoice.userId?.name || 'Unknown'}</td>
                          <td>₹{invoice.totalAmount?.toFixed(2) || '0.00'}</td>
                          <td>{new Date(invoice.createdAt).toLocaleDateString()}</td>
                          <td>
                            <span className={styles[invoice.status || 'pending']}>
                              {invoice.status || 'Pending'}
                            </span>
                          </td>
                          <td>
                            <select 
                              value={invoice.status || 'pending'}
                              onChange={(e) => updateInvoiceStatus(invoice._id, e.target.value, invoice.remarks)}
                            >
                              <option value="pending">Pending</option>
                              <option value="approved">Approved</option>
                              <option value="rejected">Rejected</option>
                              <option value="paid">Paid</option>
                            </select>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6">No invoices found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;