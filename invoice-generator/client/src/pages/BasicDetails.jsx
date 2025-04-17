import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './BasicDetails.module.css';

const BasicDetails = () => {
  const navigate = useNavigate();
  
  // Clear all localStorage data when starting a new invoice
  useEffect(() => {
    // Clear all invoice-related data
    localStorage.removeItem('invoiceData');
    localStorage.removeItem('bills');
    localStorage.removeItem('expenses');
    localStorage.removeItem('conveniences');
    localStorage.removeItem('dailyAllowance');
    localStorage.removeItem('totalBillAmount');
    localStorage.removeItem('totalConvenienceAmount');
  }, []);

  const [formData, setFormData] = useState({
    employeeName: '',
    department: '',
    tourPeriod: '',
    agendaItems: [{ agendaItem: '', timeSchedule: '', actionTaken: '' }]
  });

  const handleChange = (e, index) => {
    const { name, value } = e.target;
    if (index !== undefined) {
      const updatedAgendaItems = [...formData.agendaItems];
      updatedAgendaItems[index] = {
        ...updatedAgendaItems[index],
        [name]: value
      };
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
      agendaItems: [...formData.agendaItems, { agendaItem: '', timeSchedule: '', actionTaken: '' }]
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
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Basic Details</h1>
      </div>
      
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.section}>
          <h2>Employee Details</h2>
          <div className={styles.formGroup}>
            <label htmlFor="employeeName">Employee Name</label>
            <input
              type="text"
              id="employeeName"
              name="employeeName"
              value={formData.employeeName}
              onChange={handleChange}
              required
              placeholder="Enter employee name"
            />
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="department">Department</label>
            <input
              type="text"
              id="department"
              name="department"
              value={formData.department}
              onChange={handleChange}
              required
              placeholder="Enter department"
            />
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="tourPeriod">Period of Tour</label>
            <input
              type="text"
              id="tourPeriod"
              name="tourPeriod"
              value={formData.tourPeriod}
              onChange={handleChange}
              required
              placeholder="Enter tour period"
            />
          </div>
        </div>

        <div className={styles.section}>
          <h2>Agenda Items</h2>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Sr. No.</th>
                <th>Agenda Item(s)*</th>
                <th>Time Schedule</th>
                <th>Record note of Action taken**</th>
                <th>Action</th>
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
                      type="text"
                      name="timeSchedule"
                      value={item.timeSchedule}
                      onChange={(e) => handleChange(e, index)}
                      required
                      placeholder="Enter time schedule"
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
                        className={styles.removeButton}
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
            className={styles.addButton}
          >
            Add Agenda Item
          </button>
        </div>

        <div className={styles.actions}>
          <button type="submit" className={styles.submitButton}>
            Next
          </button>
        </div>
      </form>
    </div>
  );
};

export default BasicDetails;