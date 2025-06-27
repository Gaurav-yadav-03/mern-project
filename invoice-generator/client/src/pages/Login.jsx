import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Login.module.css';
import { useAuth } from '../context/AuthContext';

// Helper to get API base URL from environment
const API_BASE_URL = import.meta.env.VITE_API_URL;

const Login = () => {
  const navigate = useNavigate();
  const { isAuthenticated, loading, login } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !loading) {
      console.log('User is already authenticated, redirecting to home');
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, loading, navigate]);

  // In your Login component, ensure the form data is being sent correctly
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const endpoint = isLogin ? 'login' : 'register';
      console.log(`Attempting ${endpoint} with email:`, formData.email);
      
      // First, check if the server is reachable
      try {
        console.log('Attempting to check server health...');
        // Use the backend API URL for health check
        const checkResponse = await fetch(`${API_BASE_URL}/health`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Accept': 'application/json'
          },
          signal: AbortSignal.timeout(5000) // 5 second timeout
        });
        if (!checkResponse.ok) {
          const errorText = await checkResponse.text();
          setError(`Server connection issue (status ${checkResponse.status}). Please try again later.`);
          setIsLoading(false);
          return;
        }
        try {
          const healthData = await checkResponse.json();
          console.log('Server health check successful:', healthData);
        } catch (jsonError) {
          // Even if JSON parsing fails, we still got a response
        }
        // Server is reachable, proceed
      } catch (serverCheckError) {
        // Handle CORS/network errors gracefully
        const errorMessage = serverCheckError.message || '';
        if (errorMessage.includes('NetworkError') || errorMessage.includes('Failed to fetch')) {
          setError('Cannot connect to the server. Please ensure the server is running.');
        } else if (errorMessage.includes('Timeout')) {
          setError('Server connection timed out. Please try again later.');
        } else if (errorMessage.includes('CORS')) {
          // CORS error, continue with login attempt
        } else {
          setError(`Server connection error: ${errorMessage}`);
          setIsLoading(false);
          return;
        }
      }
      
      // Proceed with registration/login with better error handling
      console.log(`Making ${endpoint} request to ${API_BASE_URL}/api/auth/${endpoint}`);
      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
            ...((!isLogin && formData.name) && { name: formData.name })
          }),
          // Add timeout to prevent hanging requests
          signal: AbortSignal.timeout(10000) // 10 second timeout
        });
        
        // Log response details for debugging
        console.log(`${endpoint} response status:`, response.status);
        console.log(`${endpoint} response headers:`, Object.fromEntries([...response.headers.entries()]));

        // Handle different response types properly
        const contentType = response.headers.get('content-type');
        let data;
        
        if (contentType && contentType.includes('application/json')) {
          try {
            data = await response.json();
          } catch (jsonError) {
            console.error('JSON parsing error:', jsonError);
            const responseText = await response.text();
            console.error('Response text that failed JSON parsing:', responseText);
            
            if (responseText.includes('<!DOCTYPE html>') || responseText.includes('<html>')) {
              throw new Error('Server returned HTML instead of JSON. The server might be down or misconfigured.');
            } else {
              throw new Error('Invalid JSON response from server');
            }
          }
        } else {
          const responseText = await response.text();
          console.error('Non-JSON response:', responseText);
          
          if (responseText.includes('<!DOCTYPE html>') || responseText.includes('<html>')) {
            throw new Error('Server returned HTML instead of JSON. Please check your server configuration.');
          } else {
            throw new Error('Server did not return JSON. Received: ' + (responseText.substring(0, 100) + '...'));
          }
        }

        if (response.ok) {
          console.log(`${endpoint} successful:`, data);
          
          if (isLogin) {
            // Use the auth context login function
            login(data.user);
            navigate('/', { replace: true });
          } else {
            // After successful registration, automatically log in
            console.log('Registration successful, attempting login');
            
            try {
              const loginResponse = await fetch(`${API_BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                  email: formData.email,
                  password: formData.password
                })
              });
              
              if (loginResponse.ok) {
                const loginData = await loginResponse.json();
                console.log('Auto-login after registration successful:', loginData);
                login(loginData.user);
                navigate('/', { replace: true });
              } else {
                const errorText = await loginResponse.text();
                console.error('Auto-login failed after registration:', errorText);
                setError('Registration successful but automatic login failed. Please log in manually.');
              }
            } catch (loginError) {
              console.error('Auto-login exception after registration:', loginError);
              setError('Registration successful but automatic login failed. Please log in manually.');
            }
          }
        } else {
          console.error(`${endpoint} failed:`, data?.error || 'Unknown error');
          setError(data?.error || (isLogin ? 'Login failed' : 'Registration failed'));
        }
      } catch (error) {
        console.error(isLogin ? 'Login error:' : 'Registration error:', error);
        setError(`An error occurred during ${isLogin ? 'login' : 'registration'}: ${error.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    console.log('Redirecting to Google OAuth login');
    window.location.href = `${API_BASE_URL}/api/auth/google`;
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className={styles.container}>
      <div className={styles.formContainer}>
        <h1>{isLogin ? 'Welcome Back' : 'Create Account'}</h1>
        {error && <p className={styles.error}>{error}</p>}
        <p>Please {isLogin ? 'sign in' : 'sign up'} to continue</p>

        <div className={styles.googleButton}>
          <button onClick={handleGoogleLogin}>
            <img 
              src="https://www.google.com/images/branding/googleg/1x/googleg_standard_color_128dp.png" 
              alt="Google"
              className={styles.googleIcon} 
            />
            Continue with Google
          </button>
        </div>

        <div className={styles.divider}>
          <span>OR</span>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {!isLogin && (
            <div className={styles.inputGroup}>
              <label htmlFor="name">Full Name</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
              />
            </div>
          )}
          
          <div className={styles.inputGroup}>
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              required
            />
          </div>

          <button 
            type="submit" 
            className={styles.submitButton}
            disabled={isLoading}
          >
            {isLoading ? 'Please wait...' : (isLogin ? 'Login' : 'Sign Up')}
          </button>
        </form>

        <p className={styles.switchMode}>
          {isLogin ? "Don't have an account?" : "Already have an account?"}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className={styles.switchButton}
          >
            {isLogin ? 'Sign Up' : 'Login'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default Login;