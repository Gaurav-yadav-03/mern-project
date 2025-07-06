import { SignIn } from '@clerk/clerk-react';

export default function Login() {
  return <SignIn path="/login" routing="path" />;
}