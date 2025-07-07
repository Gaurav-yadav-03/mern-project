import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import styles from './Navbar.module.css';
import { useUser, UserButton } from '@clerk/clerk-react';

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isSignedIn, user } = useUser();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  
  // Get user picture URL
  const userPicture = user?.picture || 'default-avatar-url.png';

  // Check if user is admin
  const isAdmin = user && (user.emailAddresses?.[0]?.emailAddress === 'admin@gmail.com' || user.publicMetadata?.role === 'admin');

  const isActive = (path) => {
    return location.pathname === path;
  };
  
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleLogout = async () => {
    try {
      console.log('Logout button clicked');
      // Close dropdown
      setShowProfileDropdown(false);
      // Redirect to home page
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
      // You might want to show an error message to the user here
    }
  };

  useEffect(() => {
    // Close the mobile menu when route changes
    setIsMenuOpen(false);
    // Close profile dropdown when route changes
    setShowProfileDropdown(false);
  }, [location.pathname]);

  if (!user) {
    return <div className={styles.loading}>Loading...</div>;
  }

  return (
    <nav className={styles.navbar}>
      <div className={styles.logo}>
        <Link to="/">Invoicely</Link>
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
        
        {/* Show Create Invoice and Invoice History only for authenticated non-admin users */}
        {isSignedIn && !isAdmin && (
          <>
            <Link to="/basic-details" className={`${styles.navLink} ${isActive('/basic-details') ? styles.active : ''}`}>
              Create Invoice
            </Link>
            <Link to="/invoice-history" className={`${styles.navLink} ${isActive('/invoice-history') ? styles.active : ''}`}>
              Invoice History
            </Link>
          </>
        )}
        
        {/* Show Admin Panel only for admin users */}
        {isSignedIn && isAdmin && (
          <Link 
            to="/admin" 
            className={`${styles.navLink} ${location.pathname.startsWith('/admin') ? styles.active : ''}`}
          >
            Admin Panel
          </Link>
        )}
        
        {isSignedIn ? (
          <div className={styles.profileSection}>
            <UserButton afterSignOutUrl="/login" />
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