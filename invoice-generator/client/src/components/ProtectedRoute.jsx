import { useUser, RedirectToSignIn } from '@clerk/clerk-react';

const ProtectedRoute = ({ children }) => {
  const { isSignedIn } = useUser();
  if (!isSignedIn) return <RedirectToSignIn />;
  return children;
};

export default ProtectedRoute;