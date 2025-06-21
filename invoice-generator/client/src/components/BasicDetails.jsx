import React, { useState } from 'react';
import styles from './BasicDetails.module.css';
import SignaturePad from './SignaturePad';
import { Button } from 'react-bootstrap';

const BasicDetails = ({ data, onChange, onNext }) => {
  const [signature, setSignature] = useState(null);

  const handleEmployeeChange = (e) => {
    const { name, value } = e.target;
    onChange({
      ...data,
      employee: {
        ...data.employee,
        [name]: value
      }
    });
  };

  const handleAgendaItemChange = (index, field, value) => {
    const newAgendaItems = [...(data.employee?.agendaItems || [])];
    newAgendaItems[index] = {
      ...newAgendaItems[index],
      [field]: value
    };
    onChange({
      ...data,
      employee: {
        ...data.employee,
        agendaItems: newAgendaItems
      }
    });
  };

  const addAgendaItem = () => {
    onChange({
      ...data,
      employee: {
        ...data.employee,
        agendaItems: [
          ...(data.employee?.agendaItems || []),
          { agendaItem: '', timeSchedule: '', actionTaken: '' }
        ]
      }
    });
  };

  const removeAgendaItem = (index) => {
    const newAgendaItems = [...(data.employee?.agendaItems || [])];
    newAgendaItems.splice(index, 1);
    onChange({
      ...data,
      employee: {
        ...data.employee,
        agendaItems: newAgendaItems
      }
    });
  };

  const handleSignatureSave = (signatureData) => {
    console.log('Signature saved:', signatureData);
    setSignature(signatureData);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // ... existing validation ...

    const formData = {
      employee: {
        employeeName: data.employee?.employeeName,
        department: data.employee?.department,
        tourPeriod: data.employee?.tourPeriod,
        agendaItems: data.employee?.agendaItems
      },
      signature
    };

    onNext(formData);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Professional Invoice Generator</h2>
        <h3 className={styles.subtitle}>Detailed Agenda & Record Note of Tour Undertaken</h3>
      </div>

      <div className={styles.employeeDetails}>
        <div className={styles.nameAndDept}>
          <div className={styles.field}>
            <label>Name of Employee</label>
            <input
              type="text"
              name="employeeName"
              value={data.employee?.employeeName || ''}
              onChange={handleEmployeeChange}
              placeholder="Enter employee name"
            />
          </div>
          <div className={styles.field}>
            <label>Department</label>
            <input
              type="text"
              name="department"
              value={data.employee?.department || ''}
              onChange={handleEmployeeChange}
              placeholder="Enter department"
            />
          </div>
        </div>
        <div className={styles.tourPeriod}>
          <label>Period of Tour</label>
          <input
            type="text"
            name="tourPeriod"
            value={data.employee?.tourPeriod || ''}
            onChange={handleEmployeeChange}
            placeholder="Enter tour period"
          />
        </div>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.srNo}>Sr. No.</th>
              <th className={styles.agendaItem}>Agenda Item(s)*</th>
              <th className={styles.timeSchedule}>Time Schedule</th>
              <th className={styles.actionTaken}>Record note of Action taken**</th>
              <th className={styles.actions}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.employee?.agendaItems?.map((item, index) => (
              <tr key={index}>
                <td className={styles.srNo}>{index + 1}</td>
                <td className={styles.agendaItem}>
                  <input
                    type="text"
                    value={item.agendaItem || ''}
                    onChange={(e) => handleAgendaItemChange(index, 'agendaItem', e.target.value)}
                    placeholder="Enter agenda item"
                  />
                </td>
                <td className={styles.timeSchedule}>
                  <input
                    type="text"
                    value={item.timeSchedule || ''}
                    onChange={(e) => handleAgendaItemChange(index, 'timeSchedule', e.target.value)}
                    placeholder="Enter time schedule"
                  />
                </td>
                <td className={styles.actionTaken}>
                  <input
                    type="text"
                    value={item.actionTaken || ''}
                    onChange={(e) => handleAgendaItemChange(index, 'actionTaken', e.target.value)}
                    placeholder="Enter action taken"
                  />
                </td>
                <td className={styles.actions}>
                  <button
                    type="button"
                    onClick={() => removeAgendaItem(index)}
                    className={styles.removeButton}
                  >
                    ×
                  </button>
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

      <div className={styles.section}>
        <h3>Signature</h3>
        <p className={styles.note}>Please provide your signature for the invoice</p>
        <SignaturePad onSave={handleSignatureSave} />
        {signature && (
          <div className={styles.signaturePreview}>
            <p>Signature Preview:</p>
            <img src={signature} alt="Signature Preview" />
          </div>
        )}
      </div>

      <div className={styles.footer}>
        <div className={styles.notes}>
          <p>* To be filled before proceeding on tour</p>
          <p>** To be filled after return from tour</p>
        </div>
        <div className={styles.signature}>
          <p>Sign. Of employee:...........</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className={styles.actions}>
          <Button type="submit" variant="primary">
            Next
          </Button>
        </div>
      </form>
    </div>
  );
};

export default BasicDetails; 