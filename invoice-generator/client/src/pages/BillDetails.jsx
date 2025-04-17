import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import styles from './BillDetails.module.css';

const BillDetails = () => {
  const navigate = useNavigate();
  const [bills, setBills] = useState([]);
  const [conveniences, setConveniences] = useState([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [totalConvenienceAmount, setTotalConvenienceAmount] = useState(0);
  const [showConvenienceForm, setShowConvenienceForm] = useState(false);
  const [newBill, setNewBill] = useState({
    name: '',
    place: '',
    billNo: '',
    billDate: '',
    amount: '',
    file: null
  });
  const [newConvenience, setNewConvenience] = useState({
    date: '',
    place: '',
    from: '',
    to: '',
    mode: '',
    amount: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Load existing data from localStorage
    const savedBills = localStorage.getItem('bills');
    const savedConveniences = localStorage.getItem('conveniences');
    
    if (savedBills) {
      setBills(JSON.parse(savedBills));
    }
    
    if (savedConveniences) {
      setConveniences(JSON.parse(savedConveniences));
    }
  }, []);

  useEffect(() => {
    // Calculate total amount whenever bills or conveniences change
    const billsTotal = bills.reduce((sum, bill) => sum + Number(bill.amount || 0), 0);
    const conveniencesTotal = conveniences.reduce((sum, conv) => sum + Number(conv.amount || 0), 0);
    
    setTotalAmount(billsTotal);
    setTotalConvenienceAmount(conveniencesTotal);
    
    // Save to localStorage
    localStorage.setItem('bills', JSON.stringify(bills));
    localStorage.setItem('conveniences', JSON.stringify(conveniences));
  }, [bills, conveniences]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewBill({
      ...newBill,
      [name]: value
    });
  };

  const handleConvenienceInputChange = (e) => {
    const { name, value } = e.target;
    setNewConvenience({
      ...newConvenience,
      [name]: value
    });
  };

  const handleFileChange = (e) => {
    setNewBill({
      ...newBill,
      file: e.target.files[0]
    });
  };

  const handleAddBill = async () => {
    if (!newBill.name || !newBill.amount) {
      alert('Please fill in at least the name and amount fields');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      let fileUrl = '';
      
      if (newBill.file) {
        const formData = new FormData();
        formData.append('bill', newBill.file);
        
        const response = await axios.post('http://localhost:5000/upload/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
        
        fileUrl = response.data.fileUrl;
      }
      
      const billToAdd = {
        ...newBill,
        fileUrl,
        id: Date.now().toString()
      };
      
      setBills([...bills, billToAdd]);
      setNewBill({
        name: '',
        place: '',
        billNo: '',
        billDate: '',
        amount: '',
        file: null
      });
    } catch (err) {
      console.error('Error uploading file:', err);
      setError('Failed to upload file. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddConvenience = () => {
    if (!newConvenience.date || !newConvenience.amount) {
      alert('Please fill in at least the date and amount fields');
      return;
    }
    
    const convenienceToAdd = {
      ...newConvenience,
      id: Date.now().toString()
    };
    
    setConveniences([...conveniences, convenienceToAdd]);
    setNewConvenience({
      date: '',
      place: '',
      from: '',
      to: '',
      mode: '',
      amount: ''
    });
    setShowConvenienceForm(false);
  };

  const handleDeleteBill = (id) => {
    setBills(bills.filter(bill => bill.id !== id));
  };

  const handleDeleteConvenience = (id) => {
    setConveniences(conveniences.filter(conv => conv.id !== id));
  };

  const handleSubmit = () => {
    if (bills.length === 0 && conveniences.length === 0) {
      alert('Please add at least one bill or convenience charge');
      return;
    }
    
    // Calculate total convenience amount
    const totalConvenienceAmount = conveniences.reduce((sum, conv) => sum + Number(conv.amount || 0), 0);
    
    // Save data to localStorage
    localStorage.setItem('bills', JSON.stringify(bills));
    localStorage.setItem('conveniences', JSON.stringify(conveniences));
    localStorage.setItem('totalBillAmount', totalAmount.toString());
    localStorage.setItem('totalConvenienceAmount', totalConvenienceAmount.toString());
    
    // Update invoiceData in localStorage
    const existingData = JSON.parse(localStorage.getItem('invoiceData') || '{}');
    const updatedData = {
      ...existingData,
      bills,
      conveniences,
      totalBillAmount: totalAmount,
      totalConvenienceAmount: totalConvenienceAmount
    };
    localStorage.setItem('invoiceData', JSON.stringify(updatedData));
    
    // Navigate to the next page
    navigate('/expenses');
  };

  return (
    <div className={styles.container}>
      <h1>Bill Details</h1>
      
      {error && <div className={styles.error}>{error}</div>}
      
      <div className={styles.formSection}>
        <h2>Add Bill</h2>
        <div className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="name">Hotel/Restaurant Name*</label>
            <input
              type="text"
              id="name"
              name="name"
              value={newBill.name}
              onChange={handleInputChange}
              required
            />
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="place">Place</label>
            <input
              type="text"
              id="place"
              name="place"
              value={newBill.place}
              onChange={handleInputChange}
            />
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="billNo">Bill No</label>
            <input
              type="text"
              id="billNo"
              name="billNo"
              value={newBill.billNo}
              onChange={handleInputChange}
            />
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="billDate">Bill Date</label>
            <input
              type="date"
              id="billDate"
              name="billDate"
              value={newBill.billDate}
              onChange={handleInputChange}
            />
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="amount">Amount*</label>
            <input
              type="number"
              id="amount"
              name="amount"
              value={newBill.amount}
              onChange={handleInputChange}
              required
            />
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="file">Upload Bill</label>
            <input
              type="file"
              id="file"
              name="file"
              onChange={handleFileChange}
              accept="image/*,.pdf"
            />
          </div>
          
          <button 
            className={styles.addButton}
            onClick={handleAddBill}
            disabled={loading}
          >
            {loading ? 'Adding...' : 'Add Bill'}
          </button>
        </div>
      </div>
      
      <div className={styles.convenienceSection}>
        <div className={styles.convenienceHeader}>
          <h2>Convenience Charges</h2>
          <button 
            className={styles.toggleButton}
            onClick={() => setShowConvenienceForm(!showConvenienceForm)}
          >
            {showConvenienceForm ? 'Hide Form' : 'Add Convenience'}
          </button>
        </div>
        
        {showConvenienceForm && (
          <div className={styles.form}>
            <div className={styles.formGroup}>
              <label htmlFor="convDate">Date*</label>
              <input
                type="date"
                id="convDate"
                name="date"
                value={newConvenience.date}
                onChange={handleConvenienceInputChange}
                required
              />
            </div>
            
            <div className={styles.formGroup}>
              <label htmlFor="convPlace">Place</label>
              <input
                type="text"
                id="convPlace"
                name="place"
                value={newConvenience.place}
                onChange={handleConvenienceInputChange}
              />
            </div>
            
            <div className={styles.formGroup}>
              <label htmlFor="convFrom">From</label>
              <input
                type="text"
                id="convFrom"
                name="from"
                value={newConvenience.from}
                onChange={handleConvenienceInputChange}
              />
            </div>
            
            <div className={styles.formGroup}>
              <label htmlFor="convTo">To</label>
              <input
                type="text"
                id="convTo"
                name="to"
                value={newConvenience.to}
                onChange={handleConvenienceInputChange}
              />
            </div>
            
            <div className={styles.formGroup}>
              <label htmlFor="convMode">Mode</label>
              <input
                type="text"
                id="convMode"
                name="mode"
                value={newConvenience.mode}
                onChange={handleConvenienceInputChange}
              />
            </div>
            
            <div className={styles.formGroup}>
              <label htmlFor="convAmount">Amount*</label>
              <input
                type="number"
                id="convAmount"
                name="amount"
                value={newConvenience.amount}
                onChange={handleConvenienceInputChange}
                required
              />
            </div>
            
            <button 
              className={styles.addButton}
              onClick={handleAddConvenience}
            >
              Add Convenience
            </button>
          </div>
        )}
      </div>
      
      <div className={styles.billsList}>
        <h2>Bills</h2>
        {bills.length === 0 ? (
          <p>No bills added yet</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Hotel/Restaurant</th>
                <th>Place</th>
                <th>Bill No</th>
                <th>Date</th>
                <th>Amount</th>
                <th>File</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {bills.map(bill => (
                <tr key={bill.id}>
                  <td>{bill.name}</td>
                  <td>{bill.place}</td>
                  <td>{bill.billNo}</td>
                  <td>{bill.billDate}</td>
                  <td>Rs. {Number(bill.amount).toLocaleString('en-IN')}</td>
                  <td>
                    {bill.fileUrl ? (
                      <a href={bill.fileUrl} target="_blank" rel="noopener noreferrer">View</a>
                    ) : (
                      'No file'
                    )}
                  </td>
                  <td>
                    <button 
                      className={styles.deleteButton}
                      onClick={() => handleDeleteBill(bill.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      
      <div className={styles.convenienceList}>
        <h2>Convenience Charges</h2>
        {conveniences.length === 0 ? (
          <p>No convenience charges added yet</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Place</th>
                <th>From</th>
                <th>To</th>
                <th>Mode</th>
                <th>Amount</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {conveniences.map(conv => (
                <tr key={conv.id}>
                  <td>{conv.date}</td>
                  <td>{conv.place}</td>
                  <td>{conv.from}</td>
                  <td>{conv.to}</td>
                  <td>{conv.mode}</td>
                  <td>Rs. {Number(conv.amount).toLocaleString('en-IN')}</td>
                  <td>
                    <button 
                      className={styles.deleteButton}
                      onClick={() => handleDeleteConvenience(conv.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      
      <div className={styles.summary}>
        <div className={styles.summaryItem}>
          <span>Total Bill Amount:</span>
          <span>Rs. {totalAmount.toLocaleString('en-IN')}</span>
        </div>
        <div className={styles.summaryItem}>
          <span>Total Convenience Amount:</span>
          <span>Rs. {totalConvenienceAmount.toLocaleString('en-IN')}</span>
        </div>
        <div className={styles.summaryItem}>
          <span>Grand Total:</span>
          <span>Rs. {(totalAmount + totalConvenienceAmount).toLocaleString('en-IN')}</span>
        </div>
      </div>
      
      <div className={styles.actions}>
        <button 
          className={styles.nextButton}
          onClick={handleSubmit}
        >
          Save & Next
        </button>
      </div>
    </div>
  );
};

export default BillDetails;