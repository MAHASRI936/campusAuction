import { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import AuthCard from '../components/AuthCard.jsx';
import FormField, { describeField } from '../components/FormField.jsx';
import LoadingState from '../components/LoadingState.jsx';
import Notice from '../components/Notice.jsx';
import useAuth from '../hooks/useAuth.js';
import { safeRedirectPath, validateLogin } from '../utils/authValidation.js';

export default function LoginPage() {
  const { isAuthenticated, loading, signIn, resendConfirmation } = useAuth();
  const location = useLocation();
  const [values, setValues] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const destination = safeRedirectPath(location.state?.from, '/');

  if (loading) return <LoadingState label="Checking your login…" />;
  if (isAuthenticated) return <Navigate to={destination} replace />;

  function setField(name, value) {
    setValues((current) => ({ ...current, [name]: value }));
    if (errors[name]) setErrors((current) => ({ ...current, [name]: undefined }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;
    setFormError('');
    setResendMessage('');
    setNeedsConfirmation(false);

    const result = validateLogin(values);
    setErrors(result.errors);
    if (!result.ok) {
      document.getElementById(`login-${Object.keys(result.errors)[0]}`)?.focus();
      return;
    }

    setSubmitting(true);
    try {
      await signIn(result.data); // on success the auth state changes and this page redirects
    } catch (error) {
      setFormError(error.message);
      setNeedsConfirmation(error.cause?.code === 'email_not_confirmed');
      setSubmitting(false);
    }
  }

  async function handleResend() {
    setResendMessage('');
    try {
      await resendConfirmation(values.email.trim().toLowerCase());
      setResendMessage('Confirmation email sent. Check your inbox (and spam folder).');
    } catch (error) {
      setFormError(error.message);
    }
  }

  return (
    <AuthCard
      title="Log in to CampusBid"
      subtitle="Welcome back. Sign in to sell items and manage your listings."
      altText="New to CampusBid?"
      altLink="/register"
      altLabel="Create an account"
    >
      {location.state?.reason && !formError && (
        <Notice type="info" className="mb-4">
          {location.state.reason}
        </Notice>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {formError && (
          <Notice type="error" title="Could not log you in">
            {formError}
            {needsConfirmation && (
              <button type="button" onClick={handleResend} className="mt-2 block font-semibold underline underline-offset-2">
                Resend the confirmation email
              </button>
            )}
          </Notice>
        )}
        {resendMessage && <Notice type="success">{resendMessage}</Notice>}

        <FormField id="login-email" label="Email" error={errors.email}>
          <input
            {...describeField('login-email', { error: errors.email })}
            type="email"
            autoComplete="email"
            value={values.email}
            onChange={(event) => setField('email', event.target.value)}
            placeholder="you@example.edu"
            className={`field-input ${errors.email ? 'border-rose-400 focus:border-rose-500' : ''}`}
          />
        </FormField>

        <FormField id="login-password" label="Password" error={errors.password}>
          <input
            {...describeField('login-password', { error: errors.password })}
            type="password"
            autoComplete="current-password"
            value={values.password}
            onChange={(event) => setField('password', event.target.value)}
            placeholder="Your password"
            className={`field-input ${errors.password ? 'border-rose-400 focus:border-rose-500' : ''}`}
          />
        </FormField>

        <button type="submit" disabled={submitting} className="btn-primary w-full">
          <LogIn className="h-4 w-4" aria-hidden="true" />
          {submitting ? 'Logging in…' : 'Log in'}
        </button>
      </form>
    </AuthCard>
  );
}
