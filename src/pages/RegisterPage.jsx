import AuthPlaceholder from '../components/AuthPlaceholder.jsx';

export default function RegisterPage() {
  return (
    <AuthPlaceholder
      title="Create your account"
      subtitle="Join your campus marketplace to sell items or place bids."
      submitLabel="Create account"
      altText="Already have an account?"
      altLink="/login"
      altLabel="Log in"
      fields={[
        { id: 'register-name', label: 'Full name', type: 'text', placeholder: 'Your name', autoComplete: 'name' },
        { id: 'register-email', label: 'College email', type: 'email', placeholder: 'you@example.edu', autoComplete: 'email' },
        { id: 'register-password', label: 'Password', type: 'password', placeholder: 'Choose a password', autoComplete: 'new-password' },
      ]}
    />
  );
}
