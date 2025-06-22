import React, { useState, useEffect } from 'react';
import styles from './AdminComponents.module.css';

const AdminEmployees = () => {
  const [employees, setEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const API_BASE_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/admin/employees`, {
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch employees');
        }
        
        const data = await response.json();
        setEmployees(data);
      } catch (error) {
        setError('Failed to load employees');
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchEmployees();
  }, []);

  if (isLoading) return <div className={styles.loading}>Loading employees...</div>;
  if (error) return <div className={styles.error}>{error}</div>;

  return (
    <div className={styles.componentContainer}>
      <h2>Employee Management</h2>
      
      <div className={styles.tableContainer}>
        <table className={styles.dataTable}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Employee ID</th>
              <th>Department</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {employees.length > 0 ? (
              employees.map(employee => (
                <tr key={employee._id}>
                  <td>
                    <div className={styles.employeeInfo}>
                      <img 
                        src={employee.picture || '/default-avatar.png'} 
                        alt={employee.name} 
                        className={styles.employeeAvatar}
                      />
                      <span>{employee.name}</span>
                    </div>
                  </td>
                  <td>{employee.email}</td>
                  <td>{employee.employeeId || 'Not assigned'}</td>
                  <td>{employee.department || 'Not assigned'}</td>
                  <td>
                    <span className={`${styles.status} ${styles.active}`}>
                      Active
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className={styles.noData}>No employees found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminEmployees;