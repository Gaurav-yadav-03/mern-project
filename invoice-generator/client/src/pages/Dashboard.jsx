import { useUser } from '@clerk/clerk-react';

export default function Dashboard() {
  const { user } = useUser();
  return <div>Welcome, {user?.fullName || user?.username || user?.emailAddress}!</div>;
} 