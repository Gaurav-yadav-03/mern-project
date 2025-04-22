import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import styles from './InvoiceHistory.module.css';
import Button from '../components/Button';
import Card from '../components/Card';
import Table from '../components/Table';
import Modal from '../components/Modal';
import { useAuth } from '../context/AuthContext';

const InvoiceHistory = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'desc' });

  useEffect(() => {
    // Only fetch invoices if the user is authenticated
    if (isAuthenticated && !authLoading) {
      fetchInvoices();
    } else if (!authLoading && !isAuthenticated) {
      // If not authenticated and not still loading auth status, redirect to login
      navigate('/login');
    }
  }, [isAuthenticated, authLoading, navigate]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      
      // Add user ID to query params to fetch only user's invoices
      const userId = user?._id;
      if (!userId) {
        setError('User information not available');
        setLoading(false);
        return;
      }
      
      // Update the endpoint to fetch only user's invoices
      const response = await axios.get(`http://localhost:5000/invoice/user/${userId}`, {
        withCredentials: true
      });
      
      setInvoices(response.data);
      setError(null);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      let errorMessage = 'Failed to fetch invoices. ';
      
      if (error.response) {
        errorMessage += error.response.data?.error || `Server returned ${error.response.status}`;
      } else if (error.request) {
        errorMessage += 'No response received from server.';
      } else {
        errorMessage += error.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleViewInvoice = (invoice) => {
    console.log('View clicked for invoice:', invoice);
    setSelectedInvoice(invoice);
    setShowModal(true);
  };

  const handleDeleteClick = (invoice) => {
    console.log('Delete clicked for invoice:', invoice);
    setInvoiceToDelete(invoice);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!invoiceToDelete || !invoiceToDelete._id) {
      setError('Invalid invoice data. Please try again.');
      return;
    }

    try {
      setLoading(true);
      console.log('Attempting to delete invoice with ID:', invoiceToDelete._id);
      
      const response = await axios.delete(`http://localhost:5000/invoice/${invoiceToDelete._id}`, {
        headers: {
          'Content-Type': 'application/json'
        },
        withCredentials: true
      });
      
      if (response.status === 200) {
        console.log('Delete successful:', response.data);
        await fetchInvoices(); // Refresh the list from server
        setShowDeleteModal(false);
        setInvoiceToDelete(null);
        setError(null);
      }
    } catch (err) {
      console.error('Error deleting invoice:', {
        id: invoiceToDelete._id,
        error: err,
        response: err.response,
        status: err.response?.status
      });
      
      let errorMessage = 'Failed to delete invoice. ';
      
      if (err.response) {
        if (err.response.status === 404) {
          errorMessage += 'Invoice not found. The page will refresh to show current data.';
          // Refresh the list to ensure we have current data
          await fetchInvoices();
        } else {
          errorMessage += err.response.data?.message || 'Server error occurred.';
        }
      } else if (err.request) {
        errorMessage += 'No response from server. Please check your connection.';
      } else {
        errorMessage += 'An unexpected error occurred.';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setInvoiceToDelete(null);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedInvoice(null);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    
    const sortedInvoices = [...invoices].sort((a, b) => {
      if (key === 'createdAt' || key === 'totalAmount') {
        return direction === 'asc' 
          ? (a[key] || 0) - (b[key] || 0)
          : (b[key] || 0) - (a[key] || 0);
      } else if (key.includes('.')) {
        // Handle nested properties like 'employee.employeeName'
        const parts = key.split('.');
        const aValue = parts.reduce((obj, part) => obj?.[part] ?? '', a);
        const bValue = parts.reduce((obj, part) => obj?.[part] ?? '', b);
        
        return direction === 'asc'
          ? (aValue || '').localeCompare(bValue || '')
          : (bValue || '').localeCompare(aValue || '');
      } else {
        return direction === 'asc'
          ? (a[key] || '').localeCompare(b[key] || '')
          : (b[key] || '').localeCompare(a[key] || '');
      }
    });
    
    setInvoices(sortedInvoices);
  };

  const filteredInvoices = invoices.filter(invoice => 
    (invoice.employee?.employeeName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (invoice.employee?.department?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (invoice.invoiceNumber?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  const handleDownloadPdf = async (invoiceData) => {
    try {
      setLoading(true);
      console.log('Generating PDF for:', invoiceData._id);
      
      // Send only the invoice ID for the server to fetch the complete data
      const response = await axios.post(
        'http://localhost:5000/direct-generate-pdf',
        { _id: invoiceData._id }, // Send only the ID to trigger database lookup
        {
          responseType: 'blob',
          headers: {
            'Accept': 'application/pdf',
            'Content-Type': 'application/json'
          },
          withCredentials: true
        }
      );
      
      if (response.headers['content-type']?.includes('application/pdf')) {
        console.log('PDF received, creating download link');
        // Create a URL for the blob
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        
        // Create a download link
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `invoice-${invoiceData.invoiceNumber || invoiceData._id}.pdf`);
        document.body.appendChild(link);
        
        // Trigger download
        link.click();
        
        // Cleanup
        link.remove();
        window.URL.revokeObjectURL(url);
        
        console.log('Download initiated');
        setError(null);
      } else {
        setError('Failed to generate PDF. Server returned non-PDF response.');
      }
    } catch (err) {
      console.error('Error downloading PDF:', err);
      setError('Failed to download PDF: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  // Skip if still loading authentication or user not authenticated
  if (authLoading) {
    return (
      <div className={styles.container}>
        <Card padding="large" shadow="medium">
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
            <p>Checking authentication...</p>
          </div>
        </Card>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // This will be redirected by the useEffect
  }

  if (loading && invoices.length === 0) {
    return (
      <div className={styles.container}>
        <Card padding="large" shadow="medium">
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
            <p>Loading invoice history...</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Card padding="large" shadow="medium">
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <h1>Invoice History</h1>
            <div className={styles.searchBar}>
              <input
                type="text"
                placeholder="Search invoices..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={styles.searchInput}
              />
            </div>
          </div>
          <Button
            variant="primary"
            onClick={() => navigate('/basic-details')}
            icon="➕"
            iconPosition="left"
          >
            Create New Invoice
          </Button>
        </div>
        
        {error && (
          <div className={styles.error}>
            <p>{error}</p>
            <Button variant="outline" onClick={fetchInvoices}>
              Retry
            </Button>
          </div>
        )}
        
        {filteredInvoices.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No invoices found. {searchTerm ? 'Try adjusting your search.' : 'Create your first invoice to see it here.'}</p>
            {!searchTerm && (
              <Button
                variant="primary"
                onClick={() => navigate('/basic-details')}
                icon="➕"
                iconPosition="left"
              >
                Create Invoice
              </Button>
            )}
          </div>
        ) : (
          <div className={styles.invoiceList}>
            <Table striped hover bordered>
              <Table.Head>
                <Table.Row>
                  <Table.Cell onClick={() => handleSort('createdAt')} className={styles.sortable}>
                    Date {sortConfig.key === 'createdAt' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </Table.Cell>
                  <Table.Cell onClick={() => handleSort('employee.employeeName')} className={styles.sortable}>
                    Employee {sortConfig.key === 'employee.employeeName' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </Table.Cell>
                  <Table.Cell onClick={() => handleSort('employee.department')} className={styles.sortable}>
                    Department {sortConfig.key === 'employee.department' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </Table.Cell>
                  <Table.Cell onClick={() => handleSort('employee.tourPeriod')} className={styles.sortable}>
                    Tour Period {sortConfig.key === 'employee.tourPeriod' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </Table.Cell>
                  <Table.Cell onClick={() => handleSort('totalAmount')} className={styles.sortable}>
                    Amount {sortConfig.key === 'totalAmount' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </Table.Cell>
                  <Table.Cell onClick={() => handleSort('status')} className={styles.sortable}>
                    Status {sortConfig.key === 'status' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </Table.Cell>
                  <Table.Cell>Actions</Table.Cell>
                </Table.Row>
              </Table.Head>
              <Table.Body>
                {filteredInvoices.map((invoice) => (
                  <Table.Row key={invoice._id}>
                    <Table.Cell>{formatDate(invoice.createdAt)}</Table.Cell>
                    <Table.Cell>{invoice.employee?.employeeName || 'N/A'}</Table.Cell>
                    <Table.Cell>{invoice.employee?.department || 'N/A'}</Table.Cell>
                    <Table.Cell>{invoice.employee?.tourPeriod || 'N/A'}</Table.Cell>
                    <Table.Cell>₹{invoice.totalAmount ? Number(invoice.totalAmount).toLocaleString('en-IN') : 'N/A'}</Table.Cell>
                    <Table.Cell>{invoice.status || 'pending'}</Table.Cell>
                    <Table.Cell>
                      <div className={styles.actions}>
                        <Button
                          variant="icon"
                          onClick={() => handleViewInvoice(invoice)}
                          title="View Invoice"
                          aria-label="View Invoice"
                        >
                          👁️
                        </Button>
                        <Button
                          variant="icon"
                          onClick={() => handleDeleteClick(invoice)}
                          title="Delete Invoice"
                          aria-label="Delete Invoice"
                        >
                          🗑️
                        </Button>
                      </div>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          </div>
        )}
      </Card>
      
      {/* Invoice Details Modal */}
      <Modal
        isOpen={showModal && selectedInvoice !== null}
        onClose={handleCloseModal}
        title="Invoice Details"
      >
        <div className={styles.invoiceDetails}>
          {selectedInvoice && (
            <>
              <h2>Invoice #{selectedInvoice.invoiceNumber || selectedInvoice._id.substring(0, 8)}</h2>
              
              <div className={styles.detailSection}>
                <h3>Employee Details</h3>
                <p><strong>Name:</strong> {selectedInvoice.employee?.employeeName || 'N/A'}</p>
                <p><strong>Department:</strong> {selectedInvoice.employee?.department || 'N/A'}</p>
                <p><strong>Tour Period:</strong> {selectedInvoice.employee?.tourPeriod || 'N/A'}</p>
              </div>
              
              <div className={styles.detailSection}>
                <h3>Tour Summary</h3>
                {selectedInvoice.tourSummary?.tourDetails && selectedInvoice.tourSummary.tourDetails.length > 0 ? (
                  <table className={styles.detailTable}>
                    <thead>
                      <tr>
                        <th>From Date</th>
                        <th>To Date</th>
                        <th>From</th>
                        <th>To</th>
                        <th>Mode</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedInvoice.tourSummary.tourDetails.map((detail, index) => (
                        <tr key={index}>
                          <td>{detail.fromDate || 'N/A'}</td>
                          <td>{detail.toDate || 'N/A'}</td>
                          <td>{detail.from || 'N/A'}</td>
                          <td>{detail.to || 'N/A'}</td>
                          <td>{detail.modeOfTravel || 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p>No tour details available</p>
                )}
              </div>
              
              <div className={styles.detailSection}>
                <h3>Bill Details</h3>
                {selectedInvoice.bills && selectedInvoice.bills.length > 0 ? (
                  <table className={styles.detailTable}>
                    <thead>
                      <tr>
                        <th>Bill No</th>
                        <th>Date</th>
                        <th>Name</th>
                        <th>Place</th>
                        <th>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedInvoice.bills.map((bill, index) => (
                        <tr key={index}>
                          <td>{bill.billNo || 'N/A'}</td>
                          <td>{bill.billDate || 'N/A'}</td>
                          <td>{bill.name || 'N/A'}</td>
                          <td>{bill.place || 'N/A'}</td>
                          <td>₹{bill.amount ? Number(bill.amount).toLocaleString('en-IN') : 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p>No bill details available</p>
                )}
              </div>
              
              <div className={styles.detailSection}>
                <h3>Expense Details</h3>
                {selectedInvoice.expenses && selectedInvoice.expenses.length > 0 ? (
                  <table className={styles.detailTable}>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Mode</th>
                        <th>From</th>
                        <th>To</th>
                        <th>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedInvoice.expenses.map((expense, index) => (
                        <tr key={index}>
                          <td>{expense.date || 'N/A'}</td>
                          <td>{expense.modeOfTravel || 'N/A'}</td>
                          <td>{expense.from || 'N/A'}</td>
                          <td>{expense.to || 'N/A'}</td>
                          <td>₹{expense.amount ? Number(expense.amount).toLocaleString('en-IN') : 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p>No expense details available</p>
                )}
              </div>

              <div className={styles.detailSection}>
                <h3>Summary</h3>
                <p><strong>Total Bill Amount:</strong> ₹{selectedInvoice.totalBillAmount ? Number(selectedInvoice.totalBillAmount).toLocaleString('en-IN') : '0'}</p>
                <p><strong>Total Expenses:</strong> ₹{selectedInvoice.totalExpenses ? Number(selectedInvoice.totalExpenses).toLocaleString('en-IN') : '0'}</p>
                <p><strong>Daily Allowance:</strong> ₹{selectedInvoice.dailyAllowance?.daAmount ? Number(selectedInvoice.dailyAllowance.daAmount).toLocaleString('en-IN') : '0'}</p>
                <p><strong>Grand Total:</strong> ₹{selectedInvoice.totalAmount ? Number(selectedInvoice.totalAmount).toLocaleString('en-IN') : '0'}</p>
              </div>
              
              <div className={styles.detailSection}>
                <h3>Status</h3>
                <p className={styles[`status-${selectedInvoice.status || 'pending'}`]}>
                  {selectedInvoice.status || 'Pending'}
                </p>
                {selectedInvoice.remarks && (
                  <p><strong>Remarks:</strong> {selectedInvoice.remarks}</p>
                )}
              </div>

              <div className={styles.modalActions}>
                <Button variant="outline" onClick={handleCloseModal}>Close</Button>
                <Button 
                  variant="primary" 
                  onClick={() => handleDownloadPdf(selectedInvoice)}
                  disabled={loading}
                >
                  {loading ? 'Generating...' : 'Download PDF'}
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal && invoiceToDelete !== null}
        onClose={handleDeleteCancel}
        title="Delete Invoice"
        size="small"
      >
        <div className={styles.deleteConfirmation}>
          {invoiceToDelete && (
            <>
              <p>Are you sure you want to delete this invoice?</p>
              <p><strong>Employee:</strong> {invoiceToDelete.employee?.employeeName || 'N/A'}</p>
              <p><strong>Date:</strong> {formatDate(invoiceToDelete.createdAt)}</p>
              <div className={styles.deleteActions}>
                <Button
                  variant="outline"
                  onClick={handleDeleteCancel}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  onClick={handleDeleteConfirm}
                  disabled={loading}
                >
                  {loading ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default InvoiceHistory;