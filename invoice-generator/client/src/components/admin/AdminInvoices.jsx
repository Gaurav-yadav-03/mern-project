import React, { useState, useEffect } from 'react';
import styles from './AdminComponents.module.css';

const AdminInvoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [statusUpdate, setStatusUpdate] = useState({
    status: '',
    remarks: ''
  });

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/admin/invoices', {
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch invoices');
        }
        
        const data = await response.json();
        setInvoices(data);
      } catch (error) {
        setError('Failed to load invoices');
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchInvoices();
  }, []);

  const handleStatusChange = (e) => {
    setStatusUpdate({
      ...statusUpdate,
      [e.target.name]: e.target.value
    });
  };

  const updateInvoiceStatus = async () => {
    if (!selectedInvoice || !statusUpdate.status) return;
    
    try {
      const response = await fetch(`http://localhost:5000/api/admin/invoices/${selectedInvoice._id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(statusUpdate)
      });
      
      if (!response.ok) {
        throw new Error('Failed to update status');
      }
      
      const updatedInvoice = await response.json();
      
      // Update the invoices list
      setInvoices(invoices.map(inv => 
        inv._id === updatedInvoice._id ? updatedInvoice : inv
      ));
      
      // Reset selection and form
      setSelectedInvoice(null);
      setStatusUpdate({ status: '', remarks: '' });
      
    } catch (error) {
      setError('Failed to update invoice status');
      console.error(error);
    }
  };

  if (isLoading) return <div className={styles.loading}>Loading invoices...</div>;
  if (error) return <div className={styles.error}>{error}</div>;

  return (
    <div className={styles.componentContainer}>
      <h2>Invoice Management</h2>
      
      <div className={styles.tableContainer}>
        <table className={styles.dataTable}>
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
                    <span className={`${styles.status} ${styles[invoice.status || 'pending']}`}>
                      {invoice.status || 'Pending'}
                    </span>
                  </td>
                  <td>
                    <button 
                      className={styles.actionButton}
                      onClick={() => {
                        setSelectedInvoice(invoice);
                        setStatusUpdate({
                          status: invoice.status || '',
                          remarks: invoice.remarks || ''
                        });
                      }}
                    >
                      Update
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className={styles.noData}>No invoices found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {selectedInvoice && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h3>Update Invoice Status</h3>
            <p>Invoice #{selectedInvoice.invoiceNumber || selectedInvoice._id.substring(0, 8)}</p>
            
            <div className={styles.formGroup}>
              <label>Status</label>
              <select 
                name="status" 
                value={statusUpdate.status}
                onChange={handleStatusChange}
              >
                <option value="">Select Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="paid">Paid</option>
              </select>
            </div>
            
            <div className={styles.formGroup}>
              <label>Remarks</label>
              <textarea
                name="remarks"
                value={statusUpdate.remarks}
                onChange={handleStatusChange}
                placeholder="Add remarks or feedback"
                rows="4"
              ></textarea>
            </div>
            
            <div className={styles.modalActions}>
              <button 
                className={styles.cancelButton}
                onClick={() => setSelectedInvoice(null)}
              >
                Cancel
              </button>
              <button 
                className={styles.saveButton}
                onClick={updateInvoiceStatus}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminInvoices;