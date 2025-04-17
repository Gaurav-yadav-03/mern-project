import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Login.module.css';

const Login = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Add authentication check at component mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/auth/status', {
          credentials: 'include'
        });
        const data = await response.json();
        if (data.isAuthenticated) {
          navigate('/', { replace: true });
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      }
    };
    checkAuth();
  }, [navigate]);

  // In your Login component, ensure the form data is being sent correctly
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
  
    try {
      const endpoint = isLogin ? 'login' : 'register';
      const response = await fetch(`http://localhost:5000/api/auth/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          ...((!isLogin && formData.name) && { name: formData.name })
        })
      });
  
      const data = await response.json();
  
      if (response.ok) {
        if (isLogin) {
          localStorage.setItem('user', JSON.stringify(data.user));
        } else {
          // After successful registration, automatically log in
          const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
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
          const loginData = await loginResponse.json();
          if (loginResponse.ok) {
            localStorage.setItem('user', JSON.stringify(loginData.user));
          }
        }
        navigate('/');
      } else {
        setError(data.error || (isLogin ? 'Login failed' : 'Registration failed'));
        console.error(isLogin ? 'Login error:' : 'Registration error:', data.error);
      }
    } catch (error) {
      console.error(isLogin ? 'Login error:' : 'Registration error:', error);
      setError(`An error occurred during ${isLogin ? 'login' : 'registration'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = 'http://localhost:5000/api/auth/google';
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