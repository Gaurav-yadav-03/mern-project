import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './Navigation.module.css';

const Navigation = () => {
  const { user, logout } = useAuth();

  return (
    <nav className={styles.nav}>
      <div className={styles.logo}>
        <Link to="/">Invoice Generator</Link>
      </div>
      <div className={styles.links}>
        {user ? (
          <>
            <span>Welcome, {user.name}</span>
            <Link to="/dashboard">Dashboard</Link>
            <button onClick={logout} className={styles.logoutBtn}>
              Logout
            </button>
          </>
        ) : (
          <Link to="/login">Login</Link>
        )}
      </div>
    </nav>
  );
};

export default Navigation;