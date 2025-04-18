import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './BasicDetails.module.css';
import '../theme.css';
import { UserIcon, CalendarIcon, ListIcon, PlusIcon } from '../icons.jsx';

// Common corporate departments
const DEPARTMENTS = [
  'Accounting',
  'Administration',
  'Business Development',
  'Customer Service',
  'Engineering',
  'Finance',
  'Human Resources',
  'Information Technology',
  'Legal',
  'Marketing',
  'Operations',
  'Product Management',
  'Quality Assurance',
  'Research & Development',
  'Sales',
  'Security',
  'Supply Chain'
];

const BasicDetails = () => {
  const navigate = useNavigate();
  
  // Clear all localStorage data when starting a new invoice
  useEffect(() => {
    // Clear all localStorage data when starting a new invoice
    localStorage.removeItem('invoiceData');
    localStorage.removeItem('bills');
    localStorage.removeItem('expenses');
    localStorage.removeItem('conveyances');
    localStorage.removeItem('dailyAllowance');
    localStorage.removeItem('totalBillAmount');
    localStorage.removeItem('totalConveyanceAmount');
  }, []);

  const [formData, setFormData] = useState({
    employeeName: '',
    department: '',
    tourPeriod: '',
    agendaItems: [{ 
      agendaItem: '', 
      fromDate: '', 
      toDate: '', 
      actionTaken: '' 
    }]
  });

  const handleChange = (e, index) => {
    const { name, value } = e.target;
    if (index !== undefined) {
      const updatedAgendaItems = [...formData.agendaItems];
      updatedAgendaItems[index] = {
        ...updatedAgendaItems[index],
        [name]: value
      };
      
      // If fromDate changed, ensure toDate is not before fromDate
      if (name === 'fromDate' && updatedAgendaItems[index].toDate && updatedAgendaItems[index].toDate < value) {
        updatedAgendaItems[index].toDate = value;
      }
      
      setFormData({
        ...formData,
        agendaItems: updatedAgendaItems
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const addAgendaItem = () => {
    setFormData({
      ...formData,
      agendaItems: [...formData.agendaItems, { 
        agendaItem: '', 
        fromDate: '', 
        toDate: '', 
        actionTaken: '' 
      }]
    });
  };

  const removeAgendaItem = (index) => {
    const updatedAgendaItems = formData.agendaItems.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      agendaItems: updatedAgendaItems
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Create form data object
    const dataToSave = {
      employee: {
        employeeName: formData.employeeName,
        department: formData.department,
        tourPeriod: formData.tourPeriod
      },
      agendaItems: formData.agendaItems
    };

    // Save form data to localStorage
    localStorage.setItem('invoiceData', JSON.stringify(dataToSave));
    
    // Navigate to tour summary
    navigate('/tour-summary');
  };

  return (
    <div className="theme-form-container">
      <div className="theme-form-header">
        <h1>Basic Details</h1>
      </div>
      
      <form onSubmit={handleSubmit} className="theme-form-content">
        <div className="theme-section">
          <div className="theme-section-header">
            <span className="theme-section-icon"><UserIcon color="var(--theme-primary)" size={20} /></span>
            <h2>Employee Details</h2>
          </div>
          <div className="theme-form-row">
            <div className="theme-form-col">
              <div className="theme-form-group">
                <label htmlFor="employeeName">Employee Name</label>
                <input
                  type="text"
                  id="employeeName"
                  name="employeeName"
                  value={formData.employeeName}
                  onChange={handleChange}
                  required
                  placeholder="Enter employee name"
                  className="theme-form-input"
                />
              </div>
            </div>
          
            <div className="theme-form-col">
              <div className="theme-form-group">
                <label htmlFor="department">Department</label>
                <select
                  id="department"
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  required
                  className="theme-form-input"
                >
                  <option value="" disabled>Select a department</option>
                  {DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
          </div>
          
          <div className="theme-form-group">
            <label htmlFor="tourPeriod">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CalendarIcon color="var(--theme-text-secondary)" size={16} />
                <span>Period of Tour (Days)</span>
              </div>
            </label>
            <input
              type="number"
              id="tourPeriod"
              name="tourPeriod"
              value={formData.tourPeriod}
              onChange={handleChange}
              required
              min="1"
              placeholder="Enter number of days"
              className="theme-form-input"
            />
          </div>
        </div>

        <div className="theme-section">
          <div className="theme-section-header">
            <span className="theme-section-icon"><ListIcon color="var(--theme-primary)" size={20} /></span>
            <h2>Agenda Items</h2>
          </div>
          <table className="theme-table">
            <thead>
              <tr>
                <th style={{ width: '50px' }}>Sr. No.</th>
                <th>Agenda Item(s)</th>
                <th>From Date</th>
                <th>To Date</th>
                <th>Record note of Action taken</th>
                <th style={{ width: '100px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {formData.agendaItems.map((item, index) => (
                <tr key={index}>
                  <td>{index + 1}</td>
                  <td>
                    <input
                      type="text"
                      name="agendaItem"
                      value={item.agendaItem}
                      onChange={(e) => handleChange(e, index)}
                      required
                      placeholder="Enter agenda item"
                    />
                  </td>
                  <td>
                    <input
                      type="date"
                      name="fromDate"
                      value={item.fromDate}
                      onChange={(e) => handleChange(e, index)}
                      required
                    />
                  </td>
                  <td>
                    <input
                      type="date"
                      name="toDate"
                      value={item.toDate}
                      onChange={(e) => handleChange(e, index)}
                      min={item.fromDate || undefined}
                      required
                      disabled={!item.fromDate}
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      name="actionTaken"
                      value={item.actionTaken}
                      onChange={(e) => handleChange(e, index)}
                      required
                      placeholder="Enter action taken"
                    />
                  </td>
                  <td>
                    {index > 0 && (
                      <button
                        type="button"
                        onClick={() => removeAgendaItem(index)}
                        className="theme-btn theme-btn-accent"
                      >
                        Remove
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          <button
            type="button"
            onClick={addAgendaItem}
            className="theme-btn theme-btn-secondary"
            style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <PlusIcon size={16} />
            Add Agenda Item
          </button>
        </div>

        <div className="theme-form-actions">
          <button type="submit" className="theme-btn theme-btn-primary">
            Next
          </button>
        </div>
      </form>
    </div>
  );
};

export default BasicDetails;