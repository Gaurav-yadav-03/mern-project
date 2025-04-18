import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import styles from './GenerateInvoice.module.css';
import { useAuth } from '../context/AuthContext';
import toast, { Toaster } from 'react-hot-toast';

const GenerateInvoice = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [invoiceData, setInvoiceData] = useState(null);
  const { user } = useAuth();
  const [validationErrors, setValidationErrors] = useState([]);
  const [success, setSuccess] = useState(false);

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

  useEffect(() => {
    // Log user data when component mounts or user changes
    console.log('Current user data in GenerateInvoice:', user);
  }, [user]);

  const handleBack = () => {
    navigate('/expenses');
  };

  const handleGenerateInvoice = async () => {
    try {
      setLoading(true);
      setError(null);
      setValidationErrors([]);

      if (!invoiceData) {
        throw new Error('No invoice data found');
      }

      // Get userId from user object, handling both _id and id formats
      const userId = user?._id || user?.id;
      console.log('User data for invoice generation:', { 
        user, 
        hasId: !!user?.id, 
        has_Id: !!user?._id,
        userId
      });

      if (!user || !userId) {
        throw new Error('User information not available. Please log in again.');
      }

      // Clone data for validation to avoid modifying the original
      const validationData = {
        userId: userId, // Include the user ID
        employee: { ...invoiceData.employee },
        tourSummary: {
          tourDetails: Array.isArray(invoiceData.tourSummary?.tourDetails) 
            ? [...invoiceData.tourSummary.tourDetails] 
            : []
        },
        bills: Array.isArray(invoiceData.bills) ? [...invoiceData.bills] : [],
        expenses: Array.isArray(invoiceData.expenses) ? [...invoiceData.expenses] : [],
        conveyances: Array.isArray(invoiceData.conveyances) ? [...invoiceData.conveyances] : [],
        dailyAllowance: {
          daDays: invoiceData.dailyAllowance?.daDays || 0,
          daAmount: invoiceData.dailyAllowance?.daAmount || 0,
          onFor: invoiceData.dailyAllowance?.onFor || '',
          hotelBillDays: invoiceData.dailyAllowance?.hotelBillDays || 0,
          totalDays: invoiceData.dailyAllowance?.daDays || 0,
          ratePerDay: (invoiceData.dailyAllowance?.daAmount || 0) / (invoiceData.dailyAllowance?.daDays || 1)
        },
        totalBillAmount: parseFloat(invoiceData.totalBillAmount || 0),
        totalExpenses: parseFloat(invoiceData.totalExpenses || 0),
        totalConveyanceAmount: parseFloat(invoiceData.totalConveyanceAmount || 0),
        totalAmount: parseFloat(invoiceData.grandTotal || 0) // Use totalAmount to match Invoice model
      };

      // Log data for validation
      console.log('Sending data for validation:', validationData);

      // First validate the data
      const validationResponse = await axios.post(
        'http://localhost:5000/generate-invoice/validate',
        validationData
      );

      console.log('Validation response:', validationResponse.data);

      if (validationResponse.data.success) {
        // If validation is successful, proceed with PDF generation
        console.log('Validation passed, generating PDF...');
        
        // Use the same validated data for PDF generation
        const response = await axios.post(
          'http://localhost:5000/generate-invoice',
          validationData,
          {
            responseType: 'blob'
          }
        );

        // Create download link for the PDF
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        const filename = `invoice_${invoiceData.employee?.employeeName || 'unnamed'}_${new Date().toISOString().split('T')[0]}.pdf`;
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        
        // Save the invoice to the database
        try {
          console.log('Saving invoice to database...');
          const saveResponse = await axios.post(
            'http://localhost:5000/invoice',
            validationData,
            {
              withCredentials: true
            }
          );
          console.log('Invoice saved successfully:', saveResponse.data);
        } catch (saveError) {
          console.error('Error saving invoice to database:', saveError);
          toast.error('Invoice generated but could not be saved to your history.');
        }
        
        setSuccess(true);
        // Clear the stored data after successful generation
        localStorage.removeItem('invoiceData');
        localStorage.removeItem('bills');
        localStorage.removeItem('expenses');
        localStorage.removeItem('conveyances');
        localStorage.removeItem('dailyAllowance');
        localStorage.removeItem('totalBillAmount');
        localStorage.removeItem('totalConveyanceAmount');
        
        // Success message
        toast.success('Invoice generated successfully!');
        
        // Navigate to invoice history after a short delay
        setTimeout(() => {
          navigate('/invoice-history');
        }, 2000);
      } else {
        // Handle validation errors
        setError('Validation failed: ' + (validationResponse.data.message || 'Unknown error'));
        
        if (validationResponse.data.errors && validationResponse.data.errors.length > 0) {
          setValidationErrors(validationResponse.data.errors);
          console.error('Validation errors:', validationResponse.data.errors);
        }
      }
    } catch (error) {
      console.error('Error during invoice generation:', error);
      
      // Enhanced error handling for various failure scenarios
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Server responded with an error:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        });
        
        // Check if the response data is a blob (PDF generation error)
        if (error.response.data instanceof Blob) {
          try {
            // Try to read the blob as text to get the error message
            const errorText = await error.response.data.text();
            try {
              const errorJson = JSON.parse(errorText);
              setError(`Server error: ${errorJson.message || errorJson.error || 'Unknown error'}`);
            } catch (parseError) {
              setError(`Server error: ${errorText.substring(0, 100)}`);
            }
          } catch (blobError) {
            setError(`Server returned an error (${error.response.status}): Unable to parse error details`);
          }
        } else if (error.response.data) {
          // Handle structured error response
          const errorMessage = error.response.data.message || 
                             error.response.data.error || 
                             'Unknown server error';
          
          setError(`Server error: ${errorMessage}`);
          
          // Set validation errors if they exist
          if (error.response.data.errors) {
            setValidationErrors(
              Array.isArray(error.response.data.errors) 
                ? error.response.data.errors 
                : [error.response.data.errors]
            );
          }
        } else {
          setError(`Server error (${error.response.status}): ${error.response.statusText}`);
        }
      } else if (error.request) {
        // The request was made but no response was received
        console.error('No response received from server:', error.request);
        setError('No response from server. Please check if the server is running.');
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error('Error setting up request:', error.message);
        setError(`Error: ${error.message}`);
      }
      
      toast.error('Failed to generate invoice. Please check the errors.');
    } finally {
      setLoading(false);
    }
  };
  
  const resetForm = () => {
    // Clear all localStorage data
    localStorage.removeItem('invoiceData');
    localStorage.removeItem('bills');
    localStorage.removeItem('expenses');
    localStorage.removeItem('conveyances');
    localStorage.removeItem('dailyAllowance');
    localStorage.removeItem('totalBillAmount');
    localStorage.removeItem('totalConveyanceAmount');
    
    // Redirect to home page
    navigate('/');
  };

  if (!invoiceData) {
    return <div>Loading...</div>;
  }

  return (
    <div className={styles.container}>
      <Toaster position="top-right" />
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

        {/* Conveyance Charges Section */}
        <div className={styles.section}>
          <h3>Conveyance Charges</h3>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Place</th>
                <th>From</th>
                <th>To</th>
                <th>Mode</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoiceData.conveyances?.map((conveyance, index) => (
                <tr key={index}>
                  <td>{conveyance.date || 'N/A'}</td>
                  <td>{conveyance.place || 'N/A'}</td>
                  <td>{conveyance.from || 'N/A'}</td>
                  <td>{conveyance.to || 'N/A'}</td>
                  <td>{conveyance.mode || 'N/A'}</td>
                  <td>₹{Number(conveyance.amount || 0).toLocaleString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className={styles.total}>Total Conveyance: ₹{Number(invoiceData.totalConveyanceAmount || 0).toLocaleString('en-IN')}</p>
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
          <p>Total Conveyance: ₹{Number(invoiceData.totalConveyanceAmount || 0).toLocaleString('en-IN')}</p>
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
