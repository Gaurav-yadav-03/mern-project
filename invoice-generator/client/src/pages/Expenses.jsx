import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../css/expenses.css';

function Expenses() {
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState([]);
  const [conveniences, setConveniences] = useState([]);
  const [newExpense, setNewExpense] = useState({
    date: '',
    modeOfTravel: '',
    class: '',
    from: '',
    to: '',
    departureTime: '',
    arrivalTime: '',
    details: ''
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

  useEffect(() => {
    // Get data from localStorage
    const savedData = JSON.parse(localStorage.getItem('invoiceData') || '{}');
    
    // Load convenience charges directly from localStorage
    const savedConveniences = JSON.parse(localStorage.getItem('conveniences') || '[]');
    setConveniences(savedConveniences);
    
    // Calculate total convenience amount
    const totalConvenienceAmount = savedConveniences.reduce((sum, conv) => sum + Number(conv.amount || 0), 0);
    
    setBasicDetails(savedData.employee || {});
    setBillDetails({
      bills: savedData.bills || [],
      totalBillAmount: savedData.totalBillAmount || 0,
      conveniences: savedConveniences,
      totalConvenienceAmount: totalConvenienceAmount
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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewExpense(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDAChange = (e) => {
    const { name, value } = e.target;
    setDailyAllowance(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const addExpense = () => {
    if (!newExpense.date || !newExpense.modeOfTravel || !newExpense.from || !newExpense.to) {
      alert('Please fill in all required fields');
      return;
    }

    setExpenses([...expenses, newExpense]);
    setNewExpense({
      date: '',
      modeOfTravel: '',
      class: '',
      from: '',
      to: '',
      departureTime: '',
      arrivalTime: '',
      details: ''
    });
  };

  const deleteExpense = (index) => {
    const newExpenses = [...expenses];
    newExpenses.splice(index, 1);
    setExpenses(newExpenses);
  };

  const deleteConvenience = (index) => {
    const newConveniences = [...conveniences];
    newConveniences.splice(index, 1);
    setConveniences(newConveniences);
  };

  const calculateTotalConvenienceAmount = () => {
    return conveniences.reduce((sum, convenience) => sum + Number(convenience.amount || 0), 0);
  };

  const calculateTotalExpenses = () => {
    // Since expenses don't have an amount field, we'll return 0 for now
    // This will be updated when we add amount field to expenses
    return 0;
  };

  const calculateGrandTotal = () => {
    const expensesTotal = calculateTotalExpenses();
    const hotelBillTotal = Number(billDetails.totalBillAmount || 0);
    const convenienceTotal = calculateTotalConvenienceAmount();
    const daAmount = Number(dailyAllowance.daAmount || 0);
    return expensesTotal + hotelBillTotal + convenienceTotal + daAmount;
  };

  const handleSubmit = () => {
    if (expenses.length === 0) {
      alert('Please add at least one expense');
      return;
    }

    const existingData = JSON.parse(localStorage.getItem('invoiceData') || '{}');
    const updatedData = {
      ...existingData,
      expenses,
      conveniences,
      dailyAllowance,
      totalExpenses: calculateTotalExpenses(),
      totalConvenienceAmount: calculateTotalConvenienceAmount(),
      grandTotal: calculateGrandTotal()
    };
    
    // Save to localStorage
    localStorage.setItem('invoiceData', JSON.stringify(updatedData));
    
    // Also save to individual keys for easier access
    localStorage.setItem('expenses', JSON.stringify(expenses));
    localStorage.setItem('conveniences', JSON.stringify(conveniences));
    localStorage.setItem('dailyAllowance', JSON.stringify(dailyAllowance));
    
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
          <div className="info-item">
            <label>Starting Date & Time:</label>
            <input
              type="datetime-local"
              value={newExpense.departureTime}
              onChange={(e) => setNewExpense(prev => ({ ...prev, departureTime: e.target.value }))}
            />
          </div>
          <div className="info-item">
            <label>Return to HQ Date & Time:</label>
            <input
              type="datetime-local"
              value={newExpense.arrivalTime}
              onChange={(e) => setNewExpense(prev => ({ ...prev, arrivalTime: e.target.value }))}
            />
          </div>
          <div className="info-item full-width">
            <label>Purpose of Journey:</label>
            <span>{basicDetails.purpose || 'N/A'}</span>
          </div>
        </div>
      </div>

      <div className="expenses-section">
        <h2>Particulars of Expenses</h2>
        
        <div className="employee-info">
          <p>Employee Name: {basicDetails.employeeName || 'N/A'}</p>
          <p>Employee ID: {basicDetails.employeeId || 'N/A'}</p>
        </div>
        
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
              </select>
            </div>

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
              <input
                type="text"
                name="from"
                value={newExpense.from}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-group">
              <label>To</label>
              <input
                type="text"
                name="to"
                value={newExpense.to}
                onChange={handleInputChange}
                required
              />
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

        {/* Display Convenience Charges */}
        {conveniences.length > 0 && (
          <div className="convenience-section">
            <h3>Convenience Charges</h3>
            <table className="expense-table">
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
                {conveniences.map((convenience, index) => (
                  <tr key={index}>
                    <td>{convenience.date}</td>
                    <td>{convenience.place}</td>
                    <td>{convenience.from}</td>
                    <td>{convenience.to}</td>
                    <td>{convenience.mode}</td>
                    <td>Rs. {Number(convenience.amount).toLocaleString('en-IN')}</td>
                    <td>
                      <button 
                        className="delete-button"
                        onClick={() => deleteConvenience(index)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan="5" className="total-label">Total Convenience Amount:</td>
                  <td className="total-amount">
                    Rs. {calculateTotalConvenienceAmount().toLocaleString('en-IN')}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
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
                  <th>Details</th>
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
                    <td>{expense.details}</td>
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
        <div className="da-section">
          <h3>Daily Allowance</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>On For</label>
              <input
                type="text"
                name="onFor"
                value={dailyAllowance.onFor}
                onChange={handleDAChange}
              />
            </div>

            <div className="form-group">
              <label>Hotel Bill Days</label>
              <input
                type="number"
                name="hotelBillDays"
                value={dailyAllowance.hotelBillDays}
                onChange={handleDAChange}
              />
            </div>

            <div className="form-group">
              <label>DA Days</label>
              <input
                type="number"
                name="daDays"
                value={dailyAllowance.daDays}
                onChange={handleDAChange}
              />
            </div>

            <div className="form-group">
              <label>DA Amount</label>
              <input
                type="number"
                name="daAmount"
                value={dailyAllowance.daAmount}
                onChange={handleDAChange}
              />
            </div>
          </div>
        </div>

        {/* Summary Section */}
        <div className="summary-section">
          <h3>Summary</h3>
          <div className="summary-grid">
            <div className="summary-item">
              <span>Total Bill Amount:</span>
              <span>Rs. {Number(billDetails.totalBillAmount || 0).toLocaleString('en-IN')}</span>
            </div>
            <div className="summary-item">
              <span>Total Convenience Amount:</span>
              <span>Rs. {calculateTotalConvenienceAmount().toLocaleString('en-IN')}</span>
            </div>
            <div className="summary-item">
              <span>Total Expenses:</span>
              <span>Rs. {calculateTotalExpenses().toLocaleString('en-IN')}</span>
            </div>
            <div className="summary-item">
              <span>DA Amount:</span>
              <span>Rs. {Number(dailyAllowance.daAmount || 0).toLocaleString('en-IN')}</span>
            </div>
            <div className="summary-item grand-total">
              <span>Grand Total:</span>
              <span>Rs. {calculateGrandTotal().toLocaleString('en-IN')}</span>
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