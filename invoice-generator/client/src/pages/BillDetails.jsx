import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import styles from './BillDetails.module.css';
import '../theme.css';
import { ReceiptIcon, MoneyIcon, CarIcon, FileIcon, PlusIcon, TrashIcon, ArrowRightIcon } from '../icons.jsx';

// Define common mode of travel options
const TRAVEL_MODES = ['Car', 'Bike', 'Taxi', 'Bus', 'Train', 'Flight', 'Metro', 'Other'];

// Define common Indian cities
const COMMON_CITIES = [
  'Delhi',
  'Mumbai',
  'Bangalore',
  'Chennai',
  'Kolkata',
  'Hyderabad',
  'Pune',
  'Ahmedabad',
  'Jaipur',
  'Lucknow',
  'Chandigarh',
  'Bhopal',
  'Kochi',
  'Guwahati',
  'Patna',
  'Indore',
  'Nagpur',
  'Surat',
  'Visakhapatnam',
  'Coimbatore',
  'Other'
];

const API_BASE_URL = import.meta.env.VITE_API_URL;

const BillDetails = () => {
  const navigate = useNavigate();
  const [bills, setBills] = useState([]);
  const [conveyances, setConveyances] = useState([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [totalConveyanceAmount, setTotalConveyanceAmount] = useState(0);
  const [showConveyanceForm, setShowConveyanceForm] = useState(false);
  const [newBill, setNewBill] = useState({
    name: '',
    place: '',
    billNo: '',
    billDate: '',
    amount: '',
    file: null
  });
  const [newConveyance, setNewConveyance] = useState({
    date: '',
    place: '',
    from: '',
    to: '',
    mode: '',
    amount: '',
    file: null,
    isCustomFromCity: false,
    isCustomToCity: false,
    isCustomMode: false
  });
  const [loading, setLoading] = useState(false);
  const [conveyanceLoading, setConveyanceLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedFileName, setSelectedFileName] = useState('');
  const [selectedConveyanceFileName, setSelectedConveyanceFileName] = useState('');

  useEffect(() => {
    // Load existing data from localStorage
    const savedBills = localStorage.getItem('bills');
    const savedConveyances = localStorage.getItem('conveyances');
    
    if (savedBills) {
      setBills(JSON.parse(savedBills));
    }
    
    if (savedConveyances) {
      setConveyances(JSON.parse(savedConveyances));
    }
  }, []);

  useEffect(() => {
    // Calculate total amount whenever bills or conveyances change
    const billsTotal = bills.reduce((sum, bill) => sum + Number(bill.amount || 0), 0);
    const conveyancesTotal = conveyances.reduce((sum, conv) => sum + Number(conv.amount || 0), 0);
    
    setTotalAmount(billsTotal);
    setTotalConveyanceAmount(conveyancesTotal);
    
    // Save to localStorage
    localStorage.setItem('bills', JSON.stringify(bills));
    localStorage.setItem('conveyances', JSON.stringify(conveyances));
  }, [bills, conveyances]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewBill({
      ...newBill,
      [name]: value
    });
  };

  const handleConveyanceInputChange = (e, field) => {
    const { name, value } = e.target;
    
    if (field === "customMode") {
      setNewConveyance({
        ...newConveyance,
        mode: value
      });
      return;
    }
    
    if (field === "customFrom") {
      setNewConveyance({
        ...newConveyance,
        from: value
      });
      return;
    }
    
    if (field === "customTo") {
      setNewConveyance({
        ...newConveyance,
        to: value
      });
      return;
    }
    
    if (name === "mode" && value === "Other") {
      setNewConveyance({
        ...newConveyance,
        mode: '',
        isCustomMode: true
      });
      return;
    } else if (name === "mode") {
      setNewConveyance({
        ...newConveyance,
        mode: value,
        isCustomMode: false
      });
      return;
    }
    
    if (name === "from" && value === "Other") {
      setNewConveyance({
        ...newConveyance,
        from: '',
        isCustomFromCity: true
      });
      return;
    } else if (name === "from") {
      setNewConveyance({
        ...newConveyance,
        from: value,
        isCustomFromCity: false
      });
      return;
    }
    
    if (name === "to" && value === "Other") {
      setNewConveyance({
        ...newConveyance,
        to: '',
        isCustomToCity: true
      });
      return;
    } else if (name === "to") {
      setNewConveyance({
        ...newConveyance,
        to: value,
        isCustomToCity: false
      });
      return;
    }
    
    setNewConveyance({
      ...newConveyance,
      [name]: value
    });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setNewBill({
      ...newBill,
      file: file
    });
    setSelectedFileName(file ? file.name : '');
  };

  const handleConveyanceFileChange = (e) => {
    const file = e.target.files[0];
    setNewConveyance({
      ...newConveyance,
      file: file
    });
    setSelectedConveyanceFileName(file ? file.name : '');
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
        
        console.log('Uploading file:', newBill.file.name, 'size:', newBill.file.size, 'type:', newBill.file.type);
        
        try {
          const response = await axios.post(`${API_BASE_URL}/upload/upload`, formData, {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          });
          
          console.log('Upload response:', response.data);
          
          if (response.data.fileUrl) {
            fileUrl = response.data.fileUrl;
          } else {
            throw new Error('No file URL returned from server');
          }
        } catch (uploadError) {
          console.error('Error uploading file:', uploadError);
          
          // Check if there's a response with error details
          if (uploadError.response && uploadError.response.data) {
            console.error('Server error response:', uploadError.response.data);
            throw new Error(uploadError.response.data.error || 'Failed to upload file');
          } else {
            throw new Error('Failed to upload file: Network or server error');
          }
        }
      }
      
      const billToAdd = {
        ...newBill,
        fileUrl,
        id: Date.now().toString()
      };
      
      console.log('Adding bill:', billToAdd);
      setBills([...bills, billToAdd]);
      setNewBill({
        name: '',
        place: '',
        billNo: '',
        billDate: '',
        amount: '',
        file: null
      });
      setSelectedFileName('');
    } catch (err) {
      console.error('Error adding bill:', err);
      setError(err.message || 'Failed to add bill. Please try again.');
      alert('Error: ' + (err.message || 'Failed to add bill'));
    } finally {
      setLoading(false);
    }
  };

  const handleAddConveyance = async () => {
    if (!newConveyance.date || !newConveyance.amount) {
      alert('Please fill in at least the date and amount fields');
      return;
    }
    
    try {
      setConveyanceLoading(true);
      setError(null);
      
      let fileUrl = '';
      
      if (newConveyance.file) {
        const formData = new FormData();
        formData.append('bill', newConveyance.file);
        
        console.log('Uploading conveyance file:', newConveyance.file.name, 'size:', newConveyance.file.size, 'type:', newConveyance.file.type);
        
        try {
          const response = await axios.post(`${API_BASE_URL}/upload/upload`, formData, {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          });
          
          console.log('Upload response:', response.data);
          
          if (response.data.fileUrl) {
            fileUrl = response.data.fileUrl;
          } else {
            throw new Error('No file URL returned from server');
          }
        } catch (uploadError) {
          console.error('Error uploading conveyance file:', uploadError);
          
          // Check if there's a response with error details
          if (uploadError.response && uploadError.response.data) {
            console.error('Server error response:', uploadError.response.data);
            throw new Error(uploadError.response.data.error || 'Failed to upload file');
          } else {
            throw new Error('Failed to upload file: Network or server error');
          }
        }
      }
      
      // Clean up the object to remove flag properties
      const { isCustomMode, isCustomFromCity, isCustomToCity, ...cleanConveyance } = newConveyance;
      
      const conveyanceToAdd = {
        ...cleanConveyance,
        fileUrl,
        id: Date.now().toString()
      };
      
      console.log('Adding conveyance:', conveyanceToAdd);
      setConveyances([...conveyances, conveyanceToAdd]);
      setNewConveyance({
        date: '',
        place: '',
        from: '',
        to: '',
        mode: '',
        amount: '',
        file: null,
        isCustomMode: false,
        isCustomFromCity: false,
        isCustomToCity: false
      });
      setSelectedConveyanceFileName('');
      setShowConveyanceForm(false);
    } catch (err) {
      console.error('Error adding conveyance:', err);
      setError(err.message || 'Failed to add conveyance. Please try again.');
      alert('Error: ' + (err.message || 'Failed to add conveyance'));
    } finally {
      setConveyanceLoading(false);
    }
  };

  const handleDeleteBill = (id) => {
    setBills(bills.filter(bill => bill.id !== id));
  };

  const handleDeleteConveyance = (id) => {
    setConveyances(conveyances.filter(conv => conv.id !== id));
  };

  const handleSubmit = () => {
    if (bills.length === 0 && conveyances.length === 0) {
      alert('Please add at least one bill or conveyance charge');
      return;
    }
    
    // Calculate total conveyance amount
    const totalConveyanceAmount = conveyances.reduce((sum, conv) => sum + Number(conv.amount || 0), 0);
    
    // Save data to localStorage
    localStorage.setItem('bills', JSON.stringify(bills));
    localStorage.setItem('conveyances', JSON.stringify(conveyances));
    localStorage.setItem('totalBillAmount', totalAmount.toString());
    localStorage.setItem('totalConveyanceAmount', totalConveyanceAmount.toString());
    
    // Update invoiceData in localStorage
    const existingData = JSON.parse(localStorage.getItem('invoiceData') || '{}');
    const updatedData = {
      ...existingData,
      bills,
      conveyances,
      totalBillAmount: totalAmount,
      totalConveyanceAmount: totalConveyanceAmount
    };
    localStorage.setItem('invoiceData', JSON.stringify(updatedData));
    
    // Navigate to the next page
    navigate('/expenses');
  };

  // Update the hotel bill view handler
  const handleViewBill = (fileUrl, e) => {
    e.preventDefault();
    // Ensure the URL is properly formatted
    if (fileUrl) {
      // Check if URL is a relative path
      if (!fileUrl.startsWith('http')) {
        window.open(`${API_BASE_URL}${fileUrl}`, '_blank');
      } else {
        window.open(fileUrl, '_blank');
      }
    }
  };

  return (
    <div className="theme-form-container">
      <div className="theme-form-header">
        <h1>Bill Details</h1>
      </div>
      
      {error && <div className="theme-card" style={{ backgroundColor: 'var(--danger-50)', color: 'var(--danger-700)', marginBottom: '20px', padding: '10px 16px' }}>{error}</div>}
      
      <div className="theme-card">
        <div className="theme-card-header">
          <h2 className="theme-card-title">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ReceiptIcon color="var(--theme-primary)" size={18} />
              <span>Add Hotel/Restaurant Bill</span>
            </div>
          </h2>
        </div>
        <div className="theme-form-row">
          <div className="theme-form-col">
            <div className="theme-form-group">
              <label htmlFor="name">Hotel/Restaurant Name*</label>
              <input
                type="text"
                id="name"
                name="name"
                value={newBill.name}
                onChange={handleInputChange}
                required
                className="theme-form-input"
              />
            </div>
          </div>
          
          <div className="theme-form-col">
            <div className="theme-form-group">
              <label htmlFor="place">Place</label>
              <input
                type="text"
                id="place"
                name="place"
                value={newBill.place}
                onChange={handleInputChange}
                className="theme-form-input"
              />
            </div>
          </div>
        </div>
        
        <div className="theme-form-row">
          <div className="theme-form-col">
            <div className="theme-form-group">
              <label htmlFor="billNo">Bill No</label>
              <input
                type="text"
                id="billNo"
                name="billNo"
                value={newBill.billNo}
                onChange={handleInputChange}
                className="theme-form-input"
              />
            </div>
          </div>
          
          <div className="theme-form-col">
            <div className="theme-form-group">
              <label htmlFor="billDate">Bill Date</label>
              <input
                type="date"
                id="billDate"
                name="billDate"
                value={newBill.billDate}
                onChange={handleInputChange}
                className="theme-form-input"
              />
            </div>
          </div>
          
          <div className="theme-form-col">
            <div className="theme-form-group">
              <label htmlFor="amount">
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MoneyIcon color="var(--theme-text-secondary)" size={16} />
                  <span>Amount*</span>
                </div>
              </label>
              <input
                type="number"
                id="amount"
                name="amount"
                value={newBill.amount}
                onChange={handleInputChange}
                required
                className="theme-form-input"
              />
            </div>
          </div>
        </div>
        
        <div className="theme-form-group">
          <label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FileIcon color="var(--theme-text-secondary)" size={16} />
              <span>Bill Attachment</span>
            </div>
          </label>
          <div className="theme-file-upload">
            <label className="theme-file-label">
              <input
                type="file"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              Choose File
            </label>
            {selectedFileName && <span className="theme-file-name">{selectedFileName}</span>}
          </div>
        </div>
        
        <button
          type="button"
          onClick={handleAddBill}
          disabled={loading}
          className="theme-btn theme-btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <PlusIcon size={16} />
          {loading ? 'Adding...' : 'Add Bill'}
        </button>
      </div>
      
      {bills.length > 0 && (
        <div className="theme-card">
          <div className="theme-card-header">
            <h2 className="theme-card-title">Added Bills</h2>
          </div>
          <table className="theme-table">
            <thead>
              <tr>
                <th>Hotel/Restaurant</th>
                <th>Place</th>
                <th>Bill No</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Bill</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {bills.map((bill) => (
                <tr key={bill.id}>
                  <td>{bill.name}</td>
                  <td>{bill.place}</td>
                  <td>{bill.billNo}</td>
                  <td>{bill.billDate}</td>
                  <td>₹{parseFloat(bill.amount).toFixed(2)}</td>
                  <td>
                    {bill.fileUrl && (
                      <a 
                        href="#" 
                        onClick={(e) => handleViewBill(bill.fileUrl, e)} 
                        className="theme-link"
                      >
                        View Bill
                      </a>
                    )}
                  </td>
                  <td>
                    <button
                      onClick={() => handleDeleteBill(bill.id)}
                      className="theme-btn theme-btn-accent"
                      style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <TrashIcon size={14} />
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      <div className="theme-card">
        <div className="theme-card-header">
          <h2 className="theme-card-title">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CarIcon color="var(--theme-primary)" size={18} />
              <span>Conveyance Charges</span>
            </div>
          </h2>
          {!showConveyanceForm && (
            <button
              onClick={() => setShowConveyanceForm(true)}
              className="theme-btn theme-btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <PlusIcon size={14} />
              Add Conveyance
            </button>
          )}
        </div>
        
        {showConveyanceForm && (
          <div className="theme-form-content" style={{ boxShadow: 'none', padding: '0', marginBottom: '20px' }}>
            <div className="theme-form-row">
              <div className="theme-form-col">
                <div className="theme-form-group">
                  <label htmlFor="date">Date*</label>
                  <input
                    type="date"
                    id="date"
                    name="date"
                    value={newConveyance.date}
                    onChange={(e) => handleConveyanceInputChange(e)}
                    required
                    className="theme-form-input"
                  />
                </div>
              </div>
              
              <div className="theme-form-col">
                <div className="theme-form-group">
                  <label htmlFor="place">Place</label>
                  <input
                    type="text"
                    id="place"
                    name="place"
                    value={newConveyance.place}
                    onChange={(e) => handleConveyanceInputChange(e)}
                    className="theme-form-input"
                  />
                </div>
              </div>
            </div>
            
            <div className="theme-form-row">
              <div className="theme-form-col">
                <div className="theme-form-group">
                  <label htmlFor="from">From</label>
                  {newConveyance.isCustomFromCity ? (
                    <input
                      type="text"
                      id="customFrom"
                      name="customFrom"
                      placeholder="Enter departure city"
                      value={newConveyance.from}
                      onChange={(e) => handleConveyanceInputChange(e, "customFrom")}
                      className="theme-form-input"
                    />
                  ) : (
                    <select
                      id="from"
                      name="from"
                      value={newConveyance.from}
                      onChange={(e) => handleConveyanceInputChange(e)}
                      className="theme-form-input"
                    >
                      <option value="">Select City</option>
                      {COMMON_CITIES.map(city => (
                        <option key={city} value={city}>{city}</option>
                      ))}
                      <option value="Other">Other (Enter manually)</option>
                    </select>
                  )}
                </div>
              </div>
              
              <div className="theme-form-col">
                <div className="theme-form-group">
                  <label htmlFor="to">To</label>
                  {newConveyance.isCustomToCity ? (
                    <input
                      type="text"
                      id="customTo"
                      name="customTo"
                      placeholder="Enter destination city"
                      value={newConveyance.to}
                      onChange={(e) => handleConveyanceInputChange(e, "customTo")}
                      className="theme-form-input"
                    />
                  ) : (
                    <select
                      id="to"
                      name="to"
                      value={newConveyance.to}
                      onChange={(e) => handleConveyanceInputChange(e)}
                      className="theme-form-input"
                    >
                      <option value="">Select City</option>
                      {COMMON_CITIES.map(city => (
                        <option key={city} value={city}>{city}</option>
                      ))}
                      <option value="Other">Other (Enter manually)</option>
                    </select>
                  )}
                </div>
              </div>
            </div>
            
            <div className="theme-form-row">
              <div className="theme-form-col">
                <div className="theme-form-group">
                  <label htmlFor="mode">Mode of Travel</label>
                  {newConveyance.isCustomMode ? (
                    <input
                      type="text"
                      id="customMode"
                      name="customMode"
                      placeholder="Enter mode of travel"
                      value={newConveyance.mode}
                      onChange={(e) => handleConveyanceInputChange(e, "customMode")}
                      className="theme-form-input"
                    />
                  ) : (
                    <select
                      id="mode"
                      name="mode"
                      value={newConveyance.mode}
                      onChange={(e) => handleConveyanceInputChange(e)}
                      className="theme-form-input"
                    >
                      <option value="">Select Mode</option>
                      {TRAVEL_MODES.map(mode => (
                        <option key={mode} value={mode}>{mode}</option>
                      ))}
                      <option value="Other">Other (Enter manually)</option>
                    </select>
                  )}
                </div>
              </div>
              
              <div className="theme-form-col">
                <div className="theme-form-group">
                  <label htmlFor="amount">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <MoneyIcon color="var(--theme-text-secondary)" size={16} />
                      <span>Amount*</span>
                    </div>
                  </label>
                  <input
                    type="number"
                    id="amount"
                    name="amount"
                    value={newConveyance.amount}
                    onChange={(e) => handleConveyanceInputChange(e)}
                    required
                    className="theme-form-input"
                  />
                </div>
              </div>
            </div>
            
            <div className="theme-form-group">
              <label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FileIcon color="var(--theme-text-secondary)" size={16} />
                  <span>Conveyance Bill Attachment</span>
                </div>
              </label>
              <div className="theme-file-upload">
                <label className="theme-file-label">
                  <input
                    type="file"
                    onChange={handleConveyanceFileChange}
                    style={{ display: 'none' }}
                  />
                  Choose File
                </label>
                {selectedConveyanceFileName && <span className="theme-file-name">{selectedConveyanceFileName}</span>}
              </div>
            </div>
            
            <div className="theme-form-actions" style={{ marginTop: '16px' }}>
              <button
                onClick={() => setShowConveyanceForm(false)}
                className="theme-btn theme-btn-outline"
              >
                Cancel
              </button>
              <button
                onClick={handleAddConveyance}
                className="theme-btn theme-btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                disabled={conveyanceLoading}
              >
                <PlusIcon size={14} />
                {conveyanceLoading ? 'Adding...' : 'Add Conveyance'}
              </button>
            </div>
          </div>
        )}
        
        {conveyances.length > 0 && (
          <table className="theme-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Place</th>
                <th>From</th>
                <th>To</th>
                <th>Mode</th>
                <th>Amount</th>
                <th>Bill</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {conveyances.map((conveyance) => (
                <tr key={conveyance.id}>
                  <td>{conveyance.date}</td>
                  <td>{conveyance.place}</td>
                  <td>{conveyance.from}</td>
                  <td>{conveyance.to}</td>
                  <td>{conveyance.mode}</td>
                  <td>₹{parseFloat(conveyance.amount).toFixed(2)}</td>
                  <td>
                    {conveyance.fileUrl && (
                      <a 
                        href="#" 
                        onClick={(e) => handleViewBill(conveyance.fileUrl, e)} 
                        className="theme-link"
                      >
                        View Bill
                      </a>
                    )}
                  </td>
                  <td>
                    <button
                      onClick={() => handleDeleteConveyance(conveyance.id)}
                      className="theme-btn theme-btn-accent"
                      style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <TrashIcon size={14} />
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      
      <div className="theme-card">
        <div className="theme-card-header">
          <h2 className="theme-card-title">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MoneyIcon color="var(--theme-primary)" size={18} />
              <span>Summary</span>
            </div>
          </h2>
        </div>
        <div className="theme-summary">
          <div className="theme-summary-item">
            <span className="theme-summary-label">Total Bill Amount:</span>
            <span className="theme-summary-value">₹{parseFloat(totalAmount).toFixed(2)}</span>
          </div>
          <div className="theme-summary-item">
            <span className="theme-summary-label">Total Conveyance Amount:</span>
            <span className="theme-summary-value">₹{parseFloat(totalConveyanceAmount).toFixed(2)}</span>
          </div>
          <div className="theme-summary-item">
            <span className="theme-summary-label">Grand Total:</span>
            <span className="theme-summary-total">₹{parseFloat(totalAmount + totalConveyanceAmount).toFixed(2)}</span>
          </div>
        </div>
      </div>
      
      <div className="theme-form-actions">
        <button 
          onClick={handleSubmit} 
          className="theme-btn theme-btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <span>Next: Add Travel Expenses</span>
          <ArrowRightIcon size={16} />
        </button>
      </div>
    </div>
  );
};

export default BillDetails;