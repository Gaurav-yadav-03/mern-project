import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './EditProfile.module.css';

const EditProfile = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    employeeId: '',
    department: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    picture: ''
  });
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/user/profile', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch profile');
      }
      
      const data = await response.json();
      setProfileData(prev => ({
        ...prev,
        name: data.name || '',
        email: data.email || '',
        employeeId: data.employeeId || '',
        department: data.department || '',
        picture: data.picture || ''
      }));
    } catch (error) {
      console.error('Fetch profile error:', error);
      setError('Failed to fetch profile');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfileData(prev => ({
        ...prev,
        picture: file
      }));
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
  
    const formData = new FormData();
    
    // Handle file upload separately
    if (profileData.picture instanceof File) {
      formData.append('picture', profileData.picture);
    }
  
    // Add other form data
    formData.append('name', profileData.name);
    formData.append('employeeId', profileData.employeeId);
    formData.append('department', profileData.department);
    
    // Only append password fields if they are filled
    if (profileData.currentPassword && profileData.newPassword) {
      formData.append('currentPassword', profileData.currentPassword);
      formData.append('newPassword', profileData.newPassword);
    }
  
    try {
      const response = await fetch('http://localhost:5000/api/user/profile/update', {
        method: 'PUT',
        credentials: 'include',
        body: formData
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Update failed');
      }
  
      const data = await response.json();
      const updatedUser = {
        ...JSON.parse(localStorage.getItem('user')),
        ...data.user
      };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      navigate('/');
    } catch (error) {
      console.error('Profile update error:', error);
      setError(error.message || 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.profileForm}>
        <div className={styles.header}>
          <h1>Profile Settings</h1>
          <p>Manage your account information and preferences</p>
        </div>

        {error && <p className={styles.error}>{error}</p>}

        <form onSubmit={handleSubmit}>
          <div className={styles.photoSection}>
            // Replace the placeholder image URL with a local default avatar
            <img 
              src={preview || profileData.picture || '/default-avatar.png'} 
              alt="Profile" 
              className={styles.profilePhoto}
            />
            <label className={styles.uploadButton}>
              Change Photo
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className={styles.fileInput}
              />
            </label>
          </div>

          <div className={styles.formGrid}>
            <div className={styles.inputGroup}>
              <label>Full Name</label>
              <input
                type="text"
                name="name"
                value={profileData.name}
                onChange={handleInputChange}
                placeholder="Enter your full name"
              />
            </div>

            <div className={styles.inputGroup}>
              <label>Email Address</label>
              <input
                type="email"
                name="email"
                value={profileData.email}
                onChange={handleInputChange}
                disabled
                placeholder="Your email"
              />
            </div>

            <div className={styles.inputGroup}>
              <label>Employee ID</label>
              <input
                type="text"
                name="employeeId"
                value={profileData.employeeId}
                onChange={handleInputChange}
                placeholder="Enter employee ID"
              />
            </div>

            <div className={styles.inputGroup}>
              <label>Department</label>
              <select
                name="department"
                value={profileData.department}
                onChange={handleInputChange}
              >
                <option value="">Select Department</option>
                <option value="IT">Information Technology</option>
                <option value="HR">Human Resources</option>
                <option value="Finance">Finance</option>
                <option value="Operations">Operations</option>
                <option value="Sales">Sales & Marketing</option>
                <option value="Management">Management</option>
              </select>
            </div>
          </div>

          <div className={styles.passwordSection}>
            <h3>Security Settings</h3>
            <div className={styles.formGrid}>
              <div className={styles.inputGroup}>
                <label>Current Password</label>
                <input
                  type="password"
                  name="currentPassword"
                  value={profileData.currentPassword}
                  onChange={handleInputChange}
                  placeholder="Enter current password"
                />
              </div>

              <div className={styles.inputGroup}>
                <label>New Password</label>
                <input
                  type="password"
                  name="newPassword"
                  value={profileData.newPassword}
                  onChange={handleInputChange}
                  placeholder="Enter new password"
                />
              </div>
            </div>
            <div className={styles.inputGroup}>
              <label>Confirm New Password</label>
              <input
                type="password"
                name="confirmPassword"
                value={profileData.confirmPassword}
                onChange={handleInputChange}
                placeholder="Confirm new password"
              />
            </div>
          </div>

          <button 
            type="submit" 
            className={styles.submitButton}
            disabled={isLoading}
          >
            {isLoading ? 'Saving Changes...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default EditProfile;