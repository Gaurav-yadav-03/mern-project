import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import styles from './InvoiceHistory.module.css';
import Button from '../components/Button';
import Card from '../components/Card';
import Table from '../components/Table';
import Modal from '../components/Modal';

const InvoiceHistory = () => {
  const navigate = useNavigate();
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
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const response = await axios.get('http://localhost:5000/invoice/all');
      setInvoices(response.data);
      setError(null);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      setError('Failed to fetch invoices. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleViewInvoice = async (id) => {
    try {
      setLoading(true);
      const response = await axios.get(`http://localhost:5000/invoice/${id}`);
      setSelectedInvoice(response.data);
      setShowModal(true);
      setError(null);
    } catch (err) {
      console.error('Error fetching invoice details:', err);
      setError('Failed to load invoice details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = async (invoice) => {
    try {
      // Verify the invoice still exists before showing delete modal
      const response = await axios.get(`http://localhost:5000/invoice/${invoice._id}`);
      if (response.data) {
        setInvoiceToDelete(invoice);
        setShowDeleteModal(true);
        setError(null);
      }
    } catch (err) {
      if (err.response?.status === 404) {
        setError('This invoice no longer exists. The list will refresh.');
        await fetchInvoices(); // Refresh the list
      } else {
        setError('Failed to verify invoice. Please try again.');
      }
    }
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
        }
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
      if (key === 'createdAt' || key === 'grandTotal') {
        return direction === 'asc' 
          ? new Date(a[key]) - new Date(b[key])
          : new Date(b[key]) - new Date(a[key]);
      }
      return direction === 'asc'
        ? a[key].localeCompare(b[key])
        : b[key].localeCompare(a[key]);
    });
    
    setInvoices(sortedInvoices);
  };

  const filteredInvoices = invoices.filter(invoice => 
    (invoice.employeeName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (invoice.department?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (invoice.tourPeriod?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

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
                  <Table.Cell onClick={() => handleSort('employeeName')} className={styles.sortable}>
                    Employee {sortConfig.key === 'employeeName' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </Table.Cell>
                  <Table.Cell onClick={() => handleSort('department')} className={styles.sortable}>
                    Department {sortConfig.key === 'department' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </Table.Cell>
                  <Table.Cell onClick={() => handleSort('tourPeriod')} className={styles.sortable}>
                    Tour Period {sortConfig.key === 'tourPeriod' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </Table.Cell>
                  <Table.Cell onClick={() => handleSort('grandTotal')} className={styles.sortable}>
                    Amount {sortConfig.key === 'grandTotal' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </Table.Cell>
                  <Table.Cell>Actions</Table.Cell>
                </Table.Row>
              </Table.Head>
              <Table.Body>
                {filteredInvoices.map((invoice) => (
                  <Table.Row key={invoice._id}>
                    <Table.Cell>{formatDate(invoice.createdAt)}</Table.Cell>
                    <Table.Cell>{invoice.employeeName}</Table.Cell>
                    <Table.Cell>{invoice.department}</Table.Cell>
                    <Table.Cell>{invoice.tourPeriod}</Table.Cell>
                    <Table.Cell>Rs. {(invoice.grandTotal || 0).toLocaleString('en-IN')}</Table.Cell>
                    <Table.Cell className={styles.actions}>
                      <Button
                        variant="outline"
                        size="small"
                        onClick={() => handleViewInvoice(invoice._id)}
                      >
                        View
                      </Button>
                      <Button
                        variant="danger"
                        size="small"
                        onClick={() => handleDeleteClick(invoice)}
                      >
                        Delete
                      </Button>
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
        isOpen={showModal}
        onClose={handleCloseModal}
        title="Invoice Details"
        size="large"
      >
        {selectedInvoice && (
          <>
            <div className={styles.section}>
              <h3>Employee Details</h3>
              <div className={styles.detailsGrid}>
                <div>
                  <label>Name:</label>
                  <span>{selectedInvoice.employeeName}</span>
                </div>
                <div>
                  <label>Department:</label>
                  <span>{selectedInvoice.department}</span>
                </div>
                <div>
                  <label>Tour Period:</label>
                  <span>{selectedInvoice.tourPeriod}</span>
                </div>
              </div>
            </div>
            
            <div className={styles.section}>
              <h3>Tour Summary</h3>
              {selectedInvoice.tourSummary?.forEach((detail) => (
                <Card key={detail.id} padding="medium" shadow="small" className={styles.tourDetail}>
                  <div className={styles.detailsGrid}>
                    <div>
                      <label>From Date:</label>
                      <span>{detail.fromDate || 'N/A'}</span>
                    </div>
                    <div>
                      <label>To Date:</label>
                      <span>{detail.toDate || 'N/A'}</span>
                    </div>
                    <div>
                      <label>Mode:</label>
                      <span>{detail.modeOfTravel || 'N/A'}</span>
                    </div>
                    <div>
                      <label>From:</label>
                      <span>{detail.from || 'N/A'}</span>
                    </div>
                    <div>
                      <label>To:</label>
                      <span>{detail.to || 'N/A'}</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
            
            <div className={styles.section}>
              <h3>Bill Details</h3>
              <Table striped hover bordered>
                <Table.Head>
                  <Table.Row>
                    <Table.Cell>Hotel/Restaurant</Table.Cell>
                    <Table.Cell>Place</Table.Cell>
                    <Table.Cell>Bill No</Table.Cell>
                    <Table.Cell>Date</Table.Cell>
                    <Table.Cell>Amount</Table.Cell>
                  </Table.Row>
                </Table.Head>
                <Table.Body>
                  {selectedInvoice.bills?.map((bill, index) => (
                    <Table.Row key={index}>
                      <Table.Cell>{bill.name || 'N/A'}</Table.Cell>
                      <Table.Cell>{bill.place || 'N/A'}</Table.Cell>
                      <Table.Cell>{bill.billNo || 'N/A'}</Table.Cell>
                      <Table.Cell>{bill.billDate || 'N/A'}</Table.Cell>
                      <Table.Cell>Rs. {(Number(bill.amount) || 0).toLocaleString('en-IN')}</Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table>
              <div className={styles.total}>
                <strong>Total Bill Amount:</strong>
                <span>Rs. {(Number(selectedInvoice.totalBillAmount) || 0).toLocaleString('en-IN')}</span>
              </div>
            </div>
            
            {selectedInvoice.conveniences && selectedInvoice.conveniences.length > 0 && (
              <div className={styles.section}>
                <h3>Convenience Charges</h3>
                <Table striped hover bordered>
                  <Table.Head>
                    <Table.Row>
                      <Table.Cell>Date</Table.Cell>
                      <Table.Cell>Place</Table.Cell>
                      <Table.Cell>From</Table.Cell>
                      <Table.Cell>To</Table.Cell>
                      <Table.Cell>Mode</Table.Cell>
                      <Table.Cell>Amount</Table.Cell>
                    </Table.Row>
                  </Table.Head>
                  <Table.Body>
                    {selectedInvoice.conveniences.map((convenience, index) => (
                      <Table.Row key={index}>
                        <Table.Cell>{convenience.date}</Table.Cell>
                        <Table.Cell>{convenience.place}</Table.Cell>
                        <Table.Cell>{convenience.from}</Table.Cell>
                        <Table.Cell>{convenience.to}</Table.Cell>
                        <Table.Cell>{convenience.mode}</Table.Cell>
                        <Table.Cell>Rs. {(Number(convenience.amount) || 0).toLocaleString('en-IN')}</Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table>
                <div className={styles.total}>
                  <strong>Total Convenience Amount:</strong>
                  <span>Rs. {(Number(selectedInvoice.totalConvenienceAmount) || 0).toLocaleString('en-IN')}</span>
                </div>
              </div>
            )}
            
            <div className={styles.section}>
              <div className={styles.grandTotal}>
                <strong>Grand Total:</strong>
                <span>Rs. {(Number(selectedInvoice.grandTotal) || 0).toLocaleString('en-IN')}</span>
              </div>
            </div>
          </>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={handleDeleteCancel}
        title="Delete Invoice"
        size="small"
      >
        <div className={styles.deleteConfirmation}>
          <p>Are you sure you want to delete this invoice?</p>
          <p><strong>Employee:</strong> {invoiceToDelete?.employeeName}</p>
          <p><strong>Date:</strong> {invoiceToDelete && formatDate(invoiceToDelete.createdAt)}</p>
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
        </div>
      </Modal>
    </div>
  );
};

export default InvoiceHistory;