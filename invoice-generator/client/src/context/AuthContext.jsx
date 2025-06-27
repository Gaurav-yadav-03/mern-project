import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

const API_BASE_URL = import.meta.env.VITE_API_URL;

// Utility function to normalize user data structure
const normalizeUserData = (userData) => {
  if (!userData) return null;
  
  // Ensure the user data has _id field, copying from id if necessary
  const normalizedData = { ...userData };
  
  // If _id is missing but id exists, copy id to _id
  if (!normalizedData._id && normalizedData.id) {
    normalizedData._id = normalizedData.id;
    console.log('Normalized user data: copied id to _id');
  }
  
  return normalizedData;
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Instant load from localStorage for fast Navbar
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        const normalizedUserData = normalizeUserData(userData);
        setUser(normalizedUserData);
        setIsAuthenticated(true);
        setLoading(false); // Show Navbar instantly
      } catch (e) {
        localStorage.removeItem('user');
        setUser(null);
        setIsAuthenticated(false);
        setLoading(false);
      }
    }
    // Then check with server in background
    const checkAuth = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/auth/status`, {
          withCredentials: true
        });
        if (response.data.isAuthenticated && response.data.user) {
          const normalizedUserData = normalizeUserData(response.data.user);
          setUser(normalizedUserData);
          setIsAuthenticated(true);
          localStorage.setItem('user', JSON.stringify(normalizedUserData));
        } else {
          setUser(null);
          setIsAuthenticated(false);
          localStorage.removeItem('user');
        }
      } catch (err) {
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  // Ensure all axios requests use withCredentials: true
  axios.defaults.withCredentials = true;

  const login = (userData, token) => {
    console.log('Login called with user data:', userData);
    
    // Normalize user data to ensure consistent field naming
    const normalizedUserData = normalizeUserData(userData);
    console.log('Normalized login user data:', normalizedUserData);
    
    localStorage.setItem('user', JSON.stringify(normalizedUserData));
    if (token) localStorage.setItem('token', token);
    setUser(normalizedUserData);
    setIsAuthenticated(true);
  };

  const logout = async () => {
    console.log('Logout initiated');
    try {
      // Call server logout endpoint
      await axios.post(`${API_BASE_URL}/api/auth/logout`, {}, {
        withCredentials: true
      });
      console.log('Server logout successful');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local storage and state regardless of server response
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      setUser(null);
      setIsAuthenticated(false);
      console.log('Local logout complete');
    }
  };

  const updateUserData = (updatedUserData) => {
    const newUserData = { ...user, ...updatedUserData };
    const normalizedUserData = normalizeUserData(newUserData);
    localStorage.setItem('user', JSON.stringify(normalizedUserData));
    setUser(normalizedUserData);
    console.log('User data updated:', normalizedUserData);
  };

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated, 
      loading, 
      user, 
      login, 
      logout,
      updateUserData
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);