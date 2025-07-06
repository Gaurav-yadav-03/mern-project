import { UserProfile } from '@clerk/clerk-react';

export default function Profile() {
  return <UserProfile path="/profile" routing="path" />;
} 