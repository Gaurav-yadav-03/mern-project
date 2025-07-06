import { useClerk } from '@clerk/clerk-react';

export default function SignOutButton() {
  const { signOut } = useClerk();
  return <button onClick={() => signOut()}>Sign Out</button>;
} 