import { SignIn, useUser, UserButton } from '@clerk/clerk-react';

export default function Login() {
  const { user, isSignedIn } = useUser();

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #f8fafc 0%, #e3e9f7 100%)'
    }}>
      <div style={{
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        borderRadius: '16px',
        background: '#fff',
        padding: '2rem',
        minWidth: '340px',
        maxWidth: '90vw',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        {isSignedIn && (
          <>
            <span style={{ marginBottom: 16, fontWeight: 500 }}>
              {user?.fullName || user?.username || user?.emailAddress}
            </span>
            <UserButton afterSignOutUrl="/login" />
          </>
        )}
        {!isSignedIn && (
          <SignIn path="/login" routing="path" afterSignInUrl="/" />
        )}
      </div>
    </div>
  );
}