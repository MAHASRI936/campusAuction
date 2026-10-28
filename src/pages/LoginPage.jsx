import AuthPlaceholder from '../components/AuthPlaceholder.jsx';

export default function LoginPage() {
  return (
    <AuthPlaceholder
      title="Log in to CampusBid"
      subtitle="Welcome back. Sign in to bid and manage your listings."
      submitLabel="Log in"
      altText="New to CampusBid?"
      altLink="/register"
      altLabel="Create an account"
      fields={[
        { id: 'login-email', label: 'College email', type: 'email', placeholder: 'you@example.edu', autoComplete: 'email' },
        { id: 'login-password', label: 'Password', type: 'password', placeholder: 'Your password', autoComplete: 'current-password' },
      ]}
    />
  );
}
