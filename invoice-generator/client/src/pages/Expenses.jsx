import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../css/expenses.css';
import axios from 'axios';

// Define common Indian cities for validation
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

function Expenses() {
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState([]);
  const [conveyances, setConveyances] = useState([]);
  const [newExpense, setNewExpense] = useState({
    date: '',
    modeOfTravel: '',
    class: '',
    from: '',
    to: '',
    details: '',
    ticketBookingSource: '',
    ticketAmount: '',
    file: null,
    isCustomFrom: false,
    isCustomTo: false
  });
  
  // Separate state for departure and return date/time
  const [travelDuration, setTravelDuration] = useState({
    departureDate: '',
    departureTime: '',
    returnDate: '',
    returnTime: '',
    nightsStayed: 0
  });
  
  // Calculated values
  const [calculatedValues, setCalculatedValues] = useState({
    nightsStayed: 0,
    daysOfTravel: 0
  });
  
  const [dailyAllowance, setDailyAllowance] = useState({
    onFor: '',
    hotelBillDays: '',
    daDays: '',
    daAmount: ''
  });

  // Get data from previous forms
  const [basicDetails, setBasicDetails] = useState({});
  const [billDetails, setBillDetails] = useState({});

  // DA rate constant
  const DA_RATE_PER_NIGHT = 400;

  const [selectedTicketFileName, setSelectedTicketFileName] = useState('');

  const API_BASE_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    // Get data from localStorage
    const savedData = JSON.parse(localStorage.getItem('invoiceData') || '{}');
    
    // Load conveyance charges directly from localStorage
    const savedConveyances = JSON.parse(localStorage.getItem('conveyances') || '[]');
    setConveyances(savedConveyances);
    
    // Load travel dates if saved previously
    const savedTravelDates = JSON.parse(localStorage.getItem('travelDates') || '{}');
    if (Object.keys(savedTravelDates).length > 0) {
      setTravelDuration(savedTravelDates);
    }
    
    // Load daily allowance if saved previously
    const savedDA = JSON.parse(localStorage.getItem('dailyAllowance') || '{}');
    if (Object.keys(savedDA).length > 0) {
      setDailyAllowance(savedDA);
    }
    
    // Calculate total conveyance amount
    const totalConveyanceAmount = savedConveyances.reduce((sum, conv) => sum + Number(conv.amount || 0), 0);
    
    setBasicDetails(savedData.employee || {});
    setBillDetails({
      bills: savedData.bills || [],
      totalBillAmount: savedData.totalBillAmount || 0,
      conveyances: savedConveyances,
      totalConveyanceAmount: totalConveyanceAmount
    });
    
    // Calculate total bill amount if not already set
    if (!savedData.totalBillAmount && savedData.bills) {
      const totalBillAmount = savedData.bills.reduce((sum, bill) => sum + Number(bill.amount || 0), 0);
      
      // Update the invoiceData with the calculated total
      const updatedData = {
        ...savedData,
        totalBillAmount
      };
      localStorage.setItem('invoiceData', JSON.stringify(updatedData));
    }
  }, []);

  // Calculate nights and days whenever travel dates change
  useEffect(() => {
    if (travelDuration.departureDate && travelDuration.departureTime && 
        travelDuration.returnDate && travelDuration.returnTime) {
      calculateTravelDuration();
    }
  }, [travelDuration]);

  // Calculate travel duration based on departure and return dates/times
  const calculateTravelDuration = () => {
    try {
      const departureDateTime = new Date(`${travelDuration.departureDate}T${travelDuration.departureTime}`);
      const returnDateTime = new Date(`${travelDuration.returnDate}T${travelDuration.returnTime}`);
      
      if (isNaN(departureDateTime.getTime()) || isNaN(returnDateTime.getTime())) {
        console.error('Invalid date format');
        return;
      }
      
      if (returnDateTime <= departureDateTime) {
        console.error('Return date must be after departure date');
        return;
      }
      
      // Calculate difference in milliseconds
      const diffMs = returnDateTime - departureDateTime;
      
      // Calculate days (rounded up if partial day)
      const daysOfTravel = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      
      // Calculate nights (floor to get complete nights only)
      const nightsStayed = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      setCalculatedValues({
        nightsStayed,
        daysOfTravel
      });
      
      // Auto-update daily allowance fields
      setDailyAllowance(prev => ({
        ...prev,
        hotelBillDays: nightsStayed.toString(),
        daDays: daysOfTravel.toString(),
        daAmount: (daysOfTravel * DA_RATE_PER_NIGHT).toString()
      }));
      
      console.log(`Travel duration: ${daysOfTravel} days, ${nightsStayed} nights`);
    } catch (error) {
      console.error('Error calculating travel duration:', error);
    }
  };

  const handleTravelDurationChange = (e) => {
    const { name, value } = e.target;
    
    const updatedTravelDuration = {
      ...travelDuration,
      [name]: value
    };
    
    // Calculate nights stayed if both departure and return dates are set
    if (name === 'departureDate' || name === 'returnDate') {
      if (updatedTravelDuration.departureDate && updatedTravelDuration.returnDate) {
        const departureDate = new Date(updatedTravelDuration.departureDate);
        const returnDate = new Date(updatedTravelDuration.returnDate);
        
        // Calculate difference in days
        const diffTime = returnDate - departureDate;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        // Ensure at least 0 nights
        const nightsStayed = Math.max(0, diffDays);
        
        updatedTravelDuration.nightsStayed = nightsStayed;
        
        // Also update the daily allowance
        setDailyAllowance({
          ...dailyAllowance,
          nightsStayed: nightsStayed,
          daAmount: nightsStayed * DA_RATE_PER_NIGHT
        });
      }
    }
    
    setTravelDuration(updatedTravelDuration);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Special handling for From and To fields when "Other" is selected
    if (name === "from" && value === "Other") {
      setNewExpense(prev => ({
        ...prev,
        from: '',
        isCustomFrom: true
      }));
      return;
    }
    
    if (name === "to" && value === "Other") {
      setNewExpense(prev => ({
        ...prev,
        to: '',
        isCustomTo: true
      }));
      return;
    }
    
    // Special handling for custom inputs
    if (name === "customFrom") {
      setNewExpense(prev => ({
        ...prev,
        from: value
      }));
      return;
    }
    
    if (name === "customTo") {
      setNewExpense(prev => ({
        ...prev,
        to: value
      }));
      return;
    }
    
    setNewExpense(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleTicketFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setNewExpense(prev => ({
        ...prev,
        file: file
      }));
      setSelectedTicketFileName(file.name);
    } else {
      setSelectedTicketFileName('');
    }
  };

  const handleDAChange = (e) => {
    const { name, value } = e.target;
    
    // For fields that should be auto-calculated, don't allow manual changes
    if (name === 'hotelBillDays' || name === 'daDays' || name === 'daAmount') {
      // These fields are now auto-calculated
      return;
    }
    
    setDailyAllowance(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Save to localStorage
    const updatedDA = {
      ...dailyAllowance,
      [name]: value
    };
    localStorage.setItem('dailyAllowance', JSON.stringify(updatedDA));
  };

  const addExpense = async () => {
    if (!newExpense.date || !newExpense.modeOfTravel || !newExpense.from || !newExpense.to) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      let fileUrl = '';
      
      // Upload the ticket file if present
      if (newExpense.file) {
        const formData = new FormData();
        formData.append('bill', newExpense.file);
        
        const response = await axios.post('http://localhost:5000/upload/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
        
        fileUrl = response.data.fileUrl;
      }
      
      // Remove isCustomFrom and isCustomTo from the stored expense
      const { isCustomFrom, isCustomTo, ...expenseWithoutCustomFlags } = newExpense;
      
      const expenseToAdd = {
        ...expenseWithoutCustomFlags,
        fileUrl,
        file: null // Don't store the file object itself
      };
      
      setExpenses([...expenses, expenseToAdd]);
      setNewExpense({
        date: '',
        modeOfTravel: '',
        class: '',
        from: '',
        to: '',
        details: '',
        ticketBookingSource: '',
        ticketAmount: '',
        file: null,
        isCustomFrom: false,
        isCustomTo: false
      });
      setSelectedTicketFileName('');
    } catch (error) {
      console.error('Error uploading ticket file:', error);
      alert('Failed to upload ticket. Please try again.');
    }
  };

  const deleteExpense = (index) => {
    const newExpenses = [...expenses];
    newExpenses.splice(index, 1);
    setExpenses(newExpenses);
  };

  const deleteConveyance = (index) => {
    const newConveyances = [...conveyances];
    newConveyances.splice(index, 1);
    setConveyances(newConveyances);
  };

  const calculateTotalConveyanceAmount = () => {
    return conveyances.reduce((sum, conveyance) => sum + Number(conveyance.amount || 0), 0);
  };

  const calculateTotalExpenses = () => {
    // Sum all ticket amounts from expenses
    return expenses.reduce((sum, expense) => sum + Number(expense.ticketAmount || 0), 0);
  };

  const calculateTotalConvenience = () => {
    const convenienceTotal = calculateTotalConveyanceAmount();
    return convenienceTotal;
  };

  const calculateTotal = () => {
    const expensesTotal = calculateTotalExpenses();
    const convenienceTotal = calculateTotalConvenience();
    const daTotal = dailyAllowance.daAmount ? Number(dailyAllowance.daAmount) : dailyAllowance.nightsStayed * DA_RATE_PER_NIGHT;
    const hotelBillTotal = Number(billDetails.totalBillAmount || 0);
    return expensesTotal + convenienceTotal + daTotal + hotelBillTotal;
  };

  const handleSubmit = () => {
    if (expenses.length === 0) {
      alert('Please add at least one expense');
      return;
    }

    // Include travel dates in the saved data
    const existingData = JSON.parse(localStorage.getItem('invoiceData') || '{}');
    const updatedData = {
      ...existingData,
      expenses,
      conveyances: Array.isArray(existingData.conveyances) ? [...existingData.conveyances] : [],
      dailyAllowance,
      travelDuration,
      totalExpenses: calculateTotalExpenses(),
      totalConveyanceAmount: calculateTotalConveyanceAmount(),
      grandTotal: calculateTotal()
    };
    
    // Save to localStorage
    localStorage.setItem('invoiceData', JSON.stringify(updatedData));
    
    // Also save to individual keys for easier access
    localStorage.setItem('expenses', JSON.stringify(expenses));
    localStorage.setItem('conveyances', JSON.stringify(conveyances));
    localStorage.setItem('dailyAllowance', JSON.stringify(dailyAllowance));
    localStorage.setItem('travelDates', JSON.stringify(travelDuration));
    
    console.log('Saving data for invoice generation:', updatedData);
    navigate('/generate-invoice');
  };

  return (
    <div className="container">
      <div className="header">
        <h1 className="title">National Cooperation Export Limited</h1>
        <h2 className="subtitle">Statement of Travelling Bill</h2>
      </div>

      <div className="basic-info">
        <div className="info-grid">
          <div className="info-item">
            <label>Name of Employee:</label>
            <span>{basicDetails.employeeName || 'N/A'}</span>
          </div>
          <div className="info-item">
            <label>Employee No:</label>
            <span>EMP{Math.floor(Math.random() * 10000).toString().padStart(4, '0')}</span>
          </div>
          <div className="info-item">
            <label>Department:</label>
            <span>Accounts</span>
          </div>
          <div className="info-item">
            <label>Date:</label>
            <span>{new Date().toLocaleDateString()}</span>
          </div>
          <div className="info-item">
            <label>Destination:</label>
            <span>{basicDetails.destination || 'N/A'}</span>
          </div>
          <div className="info-item">
            <label>From:</label>
            <span>HQ Delhi</span>
          </div>
        </div>
      </div>

      <div className="expenses-section">
        <h2>Particulars of Expenses</h2>
        
        <div className="employee-info">
          <p>Employee Name: {basicDetails.employeeName || 'N/A'}</p>
          <p>Employee ID: {basicDetails.employeeId || 'N/A'}</p>
        </div>
        
        {/* Travel Duration Section */}
        <div className="travel-duration-section">
          <h3>Travel Duration</h3>
          <div className="form-grid" style={{ marginBottom: '20px' }}>
            <div className="form-group">
              <label>Departure Date <span className="required">*</span></label>
              <input
                type="date"
                name="departureDate"
                value={travelDuration.departureDate}
                onChange={handleTravelDurationChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Departure Time <span className="required">*</span></label>
              <input
                type="time"
                name="departureTime"
                value={travelDuration.departureTime}
                onChange={handleTravelDurationChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Return Date <span className="required">*</span></label>
              <input
                type="date"
                name="returnDate"
                value={travelDuration.returnDate}
                onChange={handleTravelDurationChange}
                min={travelDuration.departureDate}
                required
                disabled={!travelDuration.departureDate}
              />
            </div>
            <div className="form-group">
              <label>Return Time <span className="required">*</span></label>
              <input
                type="time"
                name="returnTime"
                value={travelDuration.returnTime}
                onChange={handleTravelDurationChange}
                required
                disabled={!travelDuration.returnDate}
              />
            </div>
            <div className="form-group">
              <label>Nights Stayed</label>
              <input
                type="number"
                value={travelDuration.nightsStayed}
                className="readonly-field"
                readOnly
              />
            </div>
          </div>
        </div>
        
        {calculatedValues.daysOfTravel > 0 && (
          <div className="calculated-info" style={{ margin: '10px 0', padding: '15px', backgroundColor: '#f0f8ff', borderRadius: '5px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <h4 style={{ marginTop: '0', color: '#333' }}>Travel Summary</h4>
            <p><strong>Days of Travel:</strong> {calculatedValues.daysOfTravel}</p>
            <p><strong>Nights Stayed:</strong> {calculatedValues.nightsStayed}</p>
            <p><strong>Daily Allowance:</strong> ₹{calculatedValues.daysOfTravel * DA_RATE_PER_NIGHT} (₹{DA_RATE_PER_NIGHT} × {calculatedValues.daysOfTravel} days)</p>
          </div>
        )}
        
        <div className="expense-form">
          <div className="form-grid">
            <div className="form-group">
              <label>Date</label>
              <input
                type="date"
                name="date"
                value={newExpense.date}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Mode of Travel</label>
              <select
                name="modeOfTravel"
                value={newExpense.modeOfTravel}
                onChange={handleInputChange}
                required
              >
                <option value="">Select Mode</option>
                <option value="air">Air</option>
                <option value="bus">Bus</option>
                <option value="rail">Rail</option>
                <option value="car">Car</option>
                <option value="taxi">Taxi</option>
                <option value="other">Other</option>
              </select>
            </div>

            {newExpense.modeOfTravel === 'other' && (
              <div className="form-group">
                <label>Specify Vehicle</label>
                <input
                  type="text"
                  name="class"
                  value={newExpense.class}
                  onChange={handleInputChange}
                  placeholder="Enter vehicle type"
                  required
                />
              </div>
            )}

            {newExpense.modeOfTravel === 'air' && (
              <div className="form-group">
                <label>Class</label>
                <select
                  name="class"
                  value={newExpense.class}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Select Class</option>
                  <option value="Economy">Economy</option>
                  <option value="Premium Economy">Premium Economy</option>
                  <option value="Business">Business Class</option>
                  <option value="First">First Class</option>
                </select>
              </div>
            )}

            {newExpense.modeOfTravel === 'rail' && (
              <div className="form-group">
                <label>Class</label>
                <select
                  name="class"
                  value={newExpense.class}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Select Class</option>
                  <option value="1A">First Class AC (1A)</option>
                  <option value="2A">Second Class AC (2A)</option>
                  <option value="3A">Third Class AC (3A)</option>
                  <option value="SL">Sleeper Class (SL)</option>
                </select>
              </div>
            )}

            <div className="form-group">
              <label>From</label>
              {newExpense.isCustomFrom ? (
                <div>
                  <input
                    type="text"
                    name="customFrom"
                    value={newExpense.from}
                    onChange={handleInputChange}
                    placeholder="Enter city name"
                    required
                  />
                  <button 
                    type="button" 
                    onClick={() => setNewExpense(prev => ({ ...prev, isCustomFrom: false, from: '' }))}
                    style={{ 
                      marginLeft: '5px', 
                      padding: '2px 8px', 
                      fontSize: '12px',
                      backgroundColor: '#f0f0f0',
                      border: '1px solid #ccc',
                      borderRadius: '3px',
                      cursor: 'pointer'
                    }}
                  >
                    Back to List
                  </button>
                </div>
              ) : (
                <select
                  name="from"
                  value={newExpense.from}
                  onChange={handleInputChange}
                  required
                  className="theme-form-input"
                >
                  <option value="">Select City</option>
                  {COMMON_CITIES.map(city => (
                    <option key={`from-${city}`} value={city}>{city}</option>
                  ))}
                  <option value="Other">Other (Enter manually)</option>
                </select>
              )}
            </div>

            <div className="form-group">
              <label>To</label>
              {newExpense.isCustomTo ? (
                <div>
                  <input
                    type="text"
                    name="customTo"
                    value={newExpense.to}
                    onChange={handleInputChange}
                    placeholder="Enter city name"
                    required
                  />
                  <button 
                    type="button" 
                    onClick={() => setNewExpense(prev => ({ ...prev, isCustomTo: false, to: '' }))}
                    style={{ 
                      marginLeft: '5px', 
                      padding: '2px 8px', 
                      fontSize: '12px',
                      backgroundColor: '#f0f0f0',
                      border: '1px solid #ccc',
                      borderRadius: '3px',
                      cursor: 'pointer'
                    }}
                  >
                    Back to List
                  </button>
                </div>
              ) : (
                <select
                  name="to"
                  value={newExpense.to}
                  onChange={handleInputChange}
                  required
                  className="theme-form-input"
                >
                  <option value="">Select City</option>
                  {COMMON_CITIES.map(city => (
                    <option key={`to-${city}`} value={city}>{city}</option>
                  ))}
                  <option value="Other">Other (Enter manually)</option>
                </select>
              )}
            </div>

            <div className="form-group">
              <label>Ticket Booking Source</label>
              <input
                type="text"
                name="ticketBookingSource"
                value={newExpense.ticketBookingSource}
                placeholder="e.g., IRCTC, MakeMyTrip, Direct"
                onChange={handleInputChange}
              />
            </div>

            <div className="form-group">
              <label>Ticket Amount</label>
              <input
                type="number"
                name="ticketAmount"
                value={newExpense.ticketAmount}
                onChange={handleInputChange}
                placeholder="Amount in ₹"
              />
            </div>

            <div className="form-group full-width">
              <label>Upload Ticket/Bill</label>
              <div className="file-upload-container" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <label className="file-upload-button" style={{ 
                  padding: '8px 12px', 
                  backgroundColor: '#f0f0f0', 
                  borderRadius: '4px',
                  cursor: 'pointer',
                  border: '1px solid #ccc'
                }}>
                  <input
                    type="file"
                    onChange={handleTicketFileChange}
                    style={{ display: 'none' }}
                  />
                  Choose File
                </label>
                {selectedTicketFileName && <span className="file-name">{selectedTicketFileName}</span>}
              </div>
            </div>

            <div className="form-group full-width">
              <label>Details</label>
              <textarea
                name="details"
                value={newExpense.details}
                onChange={handleInputChange}
                rows="3"
              />
            </div>
          </div>

          <button className="add-button" onClick={addExpense}>Add Expense</button>
        </div>

        {/* Display Conveyance Charges */}
        {conveyances.length > 0 && (
          <div className="conveyance-section">
            <h3>Conveyance Charges</h3>
            <table className="expenses-table">
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
                {conveyances.map((conveyance, index) => (
                  <tr key={index}>
                    <td>{conveyance.date}</td>
                    <td>{conveyance.place}</td>
                    <td>{conveyance.from}</td>
                    <td>{conveyance.to}</td>
                    <td>{conveyance.mode}</td>
                    <td>Rs. {Number(conveyance.amount).toLocaleString('en-IN')}</td>
                    <td>
                      <button 
                        className="delete-btn"
                        onClick={() => deleteConveyance(index)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                <tr className="total-row">
                  <td colSpan="5" className="total-label">Total Conveyance Amount:</td>
                  <td className="total-amount">
                    Rs. {calculateTotalConveyanceAmount().toLocaleString('en-IN')}
                  </td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Display Expenses */}
        <div className="expenses-list">
          <h3>Expenses</h3>
          {expenses.length === 0 ? (
            <p>No expenses added yet</p>
          ) : (
            <table className="expense-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Mode of Travel</th>
                  <th>Class</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Booking Source</th>
                  <th>Amount</th>
                  <th>Ticket</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((expense, index) => (
                  <tr key={index}>
                    <td>{expense.date}</td>
                    <td>{expense.modeOfTravel}</td>
                    <td>{expense.class}</td>
                    <td>{expense.from}</td>
                    <td>{expense.to}</td>
                    <td>{expense.ticketBookingSource || '-'}</td>
                    <td>{expense.ticketAmount ? `₹${Number(expense.ticketAmount).toLocaleString('en-IN')}` : '-'}</td>
                    <td>
                      {expense.fileUrl ? (
                        <a 
                          href="#" 
                          onClick={(e) => {
                            e.preventDefault();
                            window.open(`${API_BASE_URL}${expense.fileUrl}`, '_blank');
                          }}
                          style={{ color: 'blue', textDecoration: 'underline' }}
                        >
                          View
                        </a>
                      ) : '-'}
                    </td>
                    <td>
                      <button 
                        className="delete-button"
                        onClick={() => deleteExpense(index)}
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

        {/* Daily Allowance Section */}
        <div className="daily-allowance-section">
          <h3>Daily Allowance (DA)</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>DA Claimed For:</label>
              <input
                type="text"
                name="onFor"
                value={dailyAllowance.onFor}
                onChange={handleDAChange}
                placeholder="Purpose of DA"
              />
            </div>
            <div className="form-group">
              <label>Nights Stayed:</label>
              <input
                type="number"
                name="hotelBillDays"
                value={dailyAllowance.nightsStayed || travelDuration.nightsStayed}
                readOnly
                className="readonly-field"
              />
            </div>
            <div className="form-group">
              <label>Days of Travel:</label>
              <input
                type="number"
                name="daDays"
                value={dailyAllowance.daDays || calculatedValues.daysOfTravel}
                readOnly
                className="readonly-field"
              />
            </div>
            <div className="form-group">
              <label>DA Amount (₹{DA_RATE_PER_NIGHT}/day):</label>
              <input
                type="text"
                name="daAmount"
                value={dailyAllowance.daAmount || (travelDuration.nightsStayed * DA_RATE_PER_NIGHT)}
                readOnly
                className="readonly-field"
              />
            </div>
          </div>
        </div>

        {/* Summary Section */}
        <div className="summary-section">
          <h3>Summary</h3>
          <div className="summary-grid">
            <div className="summary-item">
              <span>Total Expenses:</span>
              <span>₹ {calculateTotalExpenses().toLocaleString('en-IN')}</span>
            </div>
            <div className="summary-item">
              <span>Hotel Bill Amount:</span>
              <span>₹ {Number(billDetails.totalBillAmount || 0).toLocaleString('en-IN')}</span>
            </div>
            <div className="summary-item">
              <span>Total Conveyance Amount:</span>
              <span>₹ {calculateTotalConveyanceAmount().toLocaleString('en-IN')}</span>
            </div>
            <div className="summary-item">
              <span>DA Amount:</span>
              <span>₹ {Number(dailyAllowance.daAmount || (travelDuration.nightsStayed * DA_RATE_PER_NIGHT)).toLocaleString('en-IN')}</span>
            </div>
            <div className="summary-item grand-total">
              <span>Grand Total:</span>
              <span>₹ {calculateTotal().toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        <div className="actions">
          <button className="submit-button" onClick={handleSubmit}>
            Generate Invoice
          </button>
        </div>
      </div>
    </div>
  );
}

export default Expenses;