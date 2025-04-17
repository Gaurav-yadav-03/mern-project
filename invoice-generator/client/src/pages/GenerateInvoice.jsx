import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import styles from './GenerateInvoice.module.css';
import { useAuth } from '../context/AuthContext';

const GenerateInvoice = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [invoiceData, setInvoiceData] = useState(null);
  const { user } = useAuth();
  const [validationErrors, setValidationErrors] = useState([]);

  useEffect(() => {
    const savedData = localStorage.getItem('invoiceData');
    if (!savedData) {
      navigate('/');
      return;
    }

    try {
      const data = JSON.parse(savedData);
      console.log('Loaded invoice data:', data);
      setInvoiceData(data);
    } catch (err) {
      console.error('Error parsing invoice data:', err);
      setError('Error loading invoice data');
    }
  }, [navigate]);

  const handleBack = () => {
    navigate('/expenses');
  };

  const handleGenerateInvoice = async () => {
    try {
      setLoading(true);
      setError(null);
      setValidationErrors([]);

      // Get invoice data from localStorage
      const invoiceData = JSON.parse(localStorage.getItem('invoiceData'));
      if (!invoiceData) {
        throw new Error('No invoice data found');
      }

      // Log the exact structure of each required field
      console.log('=== Invoice Data Debug ===');
      console.log('Employee:', {
        employeeName: invoiceData.employee?.employeeName,
        department: invoiceData.employee?.department,
        tourPeriod: invoiceData.employee?.tourPeriod
      });
      console.log('Tour Summary:', {
        hasDetails: Boolean(invoiceData.tourSummary?.tourDetails),
        detailsLength: invoiceData.tourSummary?.tourDetails?.length,
        details: invoiceData.tourSummary?.tourDetails
      });
      console.log('Bills:', {
        count: invoiceData.bills?.length,
        isArray: Array.isArray(invoiceData.bills),
        data: invoiceData.bills
      });
      console.log('Expenses:', {
        count: invoiceData.expenses?.length,
        isArray: Array.isArray(invoiceData.expenses),
        data: invoiceData.expenses
      });
      console.log('Daily Allowance:', invoiceData.dailyAllowance);
      console.log('========================');

      try {
        // First validate the data
        const validationResponse = await axios.post(
          'http://localhost:5000/generate-invoice/validate',
          invoiceData,
          {
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );

        console.log('Validation response:', validationResponse.data);

        if (validationResponse.data.message === 'Data validation successful') {
          // If validation passes, generate the PDF
          try {
            console.log('Sending request for PDF generation...');
            const response = await axios.post(
              'http://localhost:5000/direct-generate-pdf',
              invoiceData,
              {
                responseType: 'blob',
                headers: {
                  'Accept': 'application/pdf',
                  'Content-Type': 'application/json'
                },
                withCredentials: true
              }
            );

            console.log('Response received, content type:', response.headers['content-type']);
            
            // Check if the response is a PDF
            if (response.headers['content-type']?.includes('application/pdf')) {
              console.log('PDF received, creating download link');
              // Create a URL for the blob
              const blob = new Blob([response.data], { type: 'application/pdf' });
              const url = window.URL.createObjectURL(blob);
              
              // Create a download link
              const link = document.createElement('a');
              link.href = url;
              link.setAttribute('download', 'invoice.pdf');
              document.body.appendChild(link);
              
              // Trigger download
              console.log('Triggering download');
              link.click();
              
              // Cleanup
              link.remove();
              window.URL.revokeObjectURL(url);
              
              console.log('Download initiated');

              // Clear the stored data after successful generation
              localStorage.removeItem('invoiceData');
              localStorage.removeItem('bills');
              localStorage.removeItem('expenses');
              localStorage.removeItem('conveniences');
              localStorage.removeItem('dailyAllowance');
              localStorage.removeItem('totalBillAmount');
              localStorage.removeItem('totalConvenienceAmount');

              setLoading(false);
              // Navigate to invoice history
              navigate('/invoice-history');
            } else {
              // If not a PDF, it's an error response
              const reader = new FileReader();
              reader.onload = async () => {
                try {
                  const errorData = JSON.parse(reader.result);
                  console.error('Server Error Details:', errorData);
                  setError(errorData.details || errorData.error || 'Failed to generate invoice');
                } catch (e) {
                  console.error('Error parsing error response:', e);
                  setError('Failed to generate invoice: Unknown error');
                }
                setLoading(false);
              };
              reader.onerror = () => {
                console.error('Error reading error response');
                setError('Failed to generate invoice: Could not read error response');
                setLoading(false);
              };
              reader.readAsText(response.data);
            }
          } catch (generateError) {
            console.error('=== Invoice Generation Error ===');
            console.error('Error:', generateError.message);
            if (generateError.response?.data instanceof Blob) {
              const reader = new FileReader();
              reader.onload = async () => {
                try {
                  const errorData = JSON.parse(reader.result);
                  console.error('Server Error Details:', errorData);
                  setError(errorData.details || errorData.error || 'Failed to generate invoice');
                } catch (e) {
                  setError('Failed to generate invoice: ' + generateError.message);
                }
                setLoading(false);
              };
              reader.onerror = () => {
                setError('Failed to generate invoice: ' + generateError.message);
                setLoading(false);
              };
              reader.readAsText(generateError.response.data);
            } else {
              setError('Failed to generate invoice: ' + generateError.message);
              setLoading(false);
            }
          }
        }
      } catch (validationError) {
        console.error('=== Validation Error Details ===');
        console.error('Error:', validationError.message);
        console.error('Status:', validationError.response?.status);
        console.error('Response Data:', validationError.response?.data);
        
        if (validationError.response?.data) {
          if (validationError.response.data.validationErrors) {
            setValidationErrors(validationError.response.data.validationErrors);
          } else if (validationError.response.data.details) {
            const details = validationError.response.data.details;
            const errorArray = details.split('; ');
            setValidationErrors(errorArray);
          } else {
            setError('Server validation failed: ' + JSON.stringify(validationError.response.data));
          }
        } else {
          setError('Failed to validate invoice data');
        }
        setLoading(false);
      }
    } catch (error) {
      console.error('General Error:', error);
      setError(error.message || 'Failed to generate invoice');
      setLoading(false);
    }
  };
  

  if (!invoiceData) {
    return <div>Loading...</div>;
  }

  return (
    <div className={styles.container}>
      <h1>Generate Invoice</h1>

      {error && <div className={styles.error}>{error}</div>}
      
      {validationErrors.length > 0 && (
        <div className={styles.validationErrors}>
          <h3>Please fix the following issues:</h3>
          <ul>
            {validationErrors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      <div className={styles.preview}>
        <h2>Invoice Preview</h2>

        <div className={styles.section}>
          <h3>Employee Details</h3>
          <p>Name: {invoiceData.employee?.employeeName || 'N/A'}</p>
          <p>Department: {invoiceData.employee?.department || 'N/A'}</p>
          <p>Tour Period: {invoiceData.employee?.tourPeriod || 'N/A'}</p>

          {invoiceData.employee?.agendaItems?.length > 0 && (
            <div className={styles.agendaItems}>
              <h4>Agenda Items</h4>
              {invoiceData.employee.agendaItems.map((item, index) => (
                <div key={index} className={styles.agendaItem}>
                  <p>From: {item.fromDate || 'N/A'} To: {item.toDate || 'N/A'}</p>
                  <p>Action Taken: {item.actionTaken || 'N/A'}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={styles.section}>
          <h3>Tour Summary</h3>
          {invoiceData.tourSummary?.tourDetails?.map((detail, index) => (
            <div key={index} className={styles.tourDetail}>
              <p>From Date: {detail.fromDate || 'N/A'}</p>
              <p>To Date: {detail.toDate || 'N/A'}</p>
              <p>Mode: {detail.modeOfTravel || 'N/A'}</p>
              <p>From: {detail.from || 'N/A'}</p>
              <p>To: {detail.to || 'N/A'}</p>
            </div>
          ))}
        </div>

        <div className={styles.section}>
          <h3>Bill Details</h3>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Hotel/Restaurant</th>
                <th>Place</th>
                <th>Bill No</th>
                <th>Date</th>
                <th>Amount</th>
                <th>File</th>
              </tr>
            </thead>
            <tbody>
              {invoiceData.bills?.map((bill, index) => (
                <tr key={index}>
                  <td>{bill.name || 'N/A'}</td>
                  <td>{bill.place || 'N/A'}</td>
                  <td>{bill.billNo || 'N/A'}</td>
                  <td>{bill.billDate || 'N/A'}</td>
                  <td>₹{Number(bill.amount).toLocaleString('en-IN')}</td>
                  <td>
                    {bill.fileUrl ? (
                      <a href={bill.fileUrl} target="_blank" rel="noopener noreferrer">View</a>
                    ) : 'No file'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className={styles.total}>Total Bill Amount: ₹{Number(invoiceData.totalBillAmount || 0).toLocaleString('en-IN')}</p>
        </div>

        <div className={styles.section}>
          <h3>Expense Details</h3>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Mode</th>
                <th>From</th>
                <th>To</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {invoiceData.expenses?.map((expense, index) => (
                <tr key={index}>
                  <td>{expense.date || 'N/A'}</td>
                  <td>{expense.modeOfTravel || 'N/A'} {expense.class ? `(${expense.class})` : ''}</td>
                  <td>{expense.from || 'N/A'}</td>
                  <td>{expense.to || 'N/A'}</td>
                  <td>{expense.details || 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className={styles.total}>Total Expenses: ₹{Number(invoiceData.totalExpenses || 0).toLocaleString('en-IN')}</p>
        </div>

        <div className={styles.section}>
          <h3>Daily Allowance Details</h3>
          <p>On For: {invoiceData.dailyAllowance?.onFor || 'N/A'}</p>
          <p>Hotel Bill Days: {invoiceData.dailyAllowance?.hotelBillDays || 'N/A'}</p>
          <p>DA Days: {invoiceData.dailyAllowance?.daDays || 'N/A'}</p>
          <p>DA Amount: ₹{Number(invoiceData.dailyAllowance?.daAmount || 0).toLocaleString('en-IN')}</p>
        </div>

        <div className={styles.section}>
          <h3>Total Summary</h3>
          <p>Total Bill Amount: ₹{Number(invoiceData.totalBillAmount || 0).toLocaleString('en-IN')}</p>
          <p>Total Expenses: ₹{Number(invoiceData.totalExpenses || 0).toLocaleString('en-IN')}</p>
          <p>Total D.A. Amount: ₹{Number(invoiceData.dailyAllowance?.daAmount || 0).toLocaleString('en-IN')}</p>
          <p className={styles.grandTotal}>Grand Total: ₹{Number(invoiceData.grandTotal || 0).toLocaleString('en-IN')}</p>
        </div>
      </div>

      <div className={styles.actions}>
        <button onClick={handleBack} className={styles.backButton}>Back</button>
        <button
          onClick={handleGenerateInvoice}
          className={styles.generateButton}
          disabled={loading}
        >
          {loading ? 'Generating...' : 'Generate Invoice'}
        </button>
      </div>
    </div>
  );
};

export default GenerateInvoice;
