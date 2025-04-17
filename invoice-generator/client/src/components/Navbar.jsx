import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import styles from './Navbar.module.css';

const Navbar = () => {
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  
  // Get user picture URL
  const userPicture = user?.picture || 'default-avatar-url.png';

  useEffect(() => {
    // Check authentication status when component mounts
    const checkAuth = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/auth/status', {
          credentials: 'include'
        });
        const data = await response.json();
        if (data.isAuthenticated) {
          setUser(data.user);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      }
    };
    
    checkAuth();
  }, []);

  // Check if user is admin
  const isAdmin = user && user.email === 'luffy12@gmail.com';

  const isActive = (path) => {
    return location.pathname === path;
  };
  
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleLogout = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        // Clear local storage
        localStorage.removeItem('user');
        // Redirect to login page
        window.location.href = '/login';
      } else {
        const data = await response.json();
        console.error('Logout failed:', data.error);
        throw new Error(data.error || 'Logout failed');
      }
    } catch (error) {
      console.error('Logout failed:', error);
      // You might want to show an error message to the user here
    }
  };

  return (
    <nav className={styles.navbar}>
      <div className={styles.logo}>
        <Link to="/">NCEL Invoice System</Link>
      </div>
      
      <button className={styles.menuButton} onClick={toggleMenu}>
        <span className={styles.menuIcon}></span>
        <span className={styles.menuIcon}></span>
        <span className={styles.menuIcon}></span>
      </button>
      
      <div className={`${styles.navLinks} ${isMenuOpen ? styles.active : ''}`}>
        <Link to="/" className={`${styles.navLink} ${isActive('/') ? styles.active : ''}`}>
          Home
        </Link>
        <Link to="/basic-details" className={`${styles.navLink} ${isActive('/basic-details') ? styles.active : ''}`}>
          Create Invoice
        </Link>
        <Link to="/invoice-history" className={`${styles.navLink} ${isActive('/invoice-history') ? styles.active : ''}`}>
          Invoice History
        </Link>
        
        {isAdmin && (
          <Link to="/admin" className={`${styles.navLink} ${isActive('/admin') ? styles.active : ''}`}>
            Admin Panel
          </Link>
        )}
        
        {user ? (
          <div className={styles.profileSection}>
            <div 
              className={styles.profileCircle} 
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
            >
              {user.picture ? (
                <img 
                  src={userPicture}
                  alt={user?.name || 'User'} 
                  referrerPolicy="no-referrer"
                  className={styles.userAvatar} 
                />
              ) : (
                <span>{user.name?.[0]?.toUpperCase() || 'U'}</span>
              )}
            </div>
            
            {showProfileDropdown && (
              <div className={styles.profileDropdown}>
                <div className={styles.userInfo}>
                  <span className={styles.userName}>{user.name}</span>
                  <span className={styles.userEmail}>{user.email}</span>
                </div>
                <div className={styles.dropdownDivider} />
                <Link to="/profile" className={styles.dropdownItem}>
                  Edit Profile
                </Link>
                <button onClick={handleLogout} className={styles.dropdownItem}>
                  Logout
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link to="/login" className={`${styles.navLink} ${isActive('/login') ? styles.active : ''}`}>
            Login/Signup
          </Link>
        )}
      </div>
    </nav>
  );
};

export default Navbar;