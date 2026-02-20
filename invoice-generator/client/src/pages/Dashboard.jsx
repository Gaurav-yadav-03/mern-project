import { useUser } from '@clerk/clerk-react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { user } = useUser();
  return (
    <div style={{ padding: '2rem', maxWidth: 600, margin: '0 auto' }}>
      <h2>Welcome, {user?.fullName || user?.username || user?.emailAddress}!</h2>
      <ul style={{ marginTop: 32 }}>
        <li><Link to="/basic-details">Create Invoice</Link></li>
        <li><Link to="/invoice-history">Invoice History</Link></li>
        <li><Link to="/profile">Profile</Link></li>
      </ul>
    </div>
  );
} 