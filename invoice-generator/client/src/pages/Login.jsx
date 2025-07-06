import { SignIn } from '@clerk/clerk-react';

export default function Login() {
  return (
    <div>
      <SignIn path="/login" routing="path" />
    </div>
  );
}