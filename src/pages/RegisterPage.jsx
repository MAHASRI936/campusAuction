import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { MailCheck, UserPlus } from 'lucide-react';
import AuthCard from '../components/AuthCard.jsx';
import FormField, { describeField } from '../components/FormField.jsx';
import LoadingState from '../components/LoadingState.jsx';
import Notice from '../components/Notice.jsx';
import useAuth from '../hooks/useAuth.js';
import { PASSWORD_MIN, validateRegister } from '../utils/authValidation.js';

const EMPTY = { fullName: '', email: '', password: '', confirmPassword: '' };

export default function RegisterPage() {
  const { isAuthenticated, loading, signUp, resendConfirmation } = useAuth();
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [pendingEmail, setPendingEmail] = useState(null); // set when email confirmation is required
  const [resendMessage, setResendMessage] = useState('');

  if (loading) return <LoadingState label="Checking your login…" />;
  if (isAuthenticated) return <Navigate to="/" replace />;

  function setField(name, value) {
    setValues((current) => ({ ...current, [name]: value }));
    if (errors[name]) setErrors((current) => ({ ...current, [name]: undefined }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;
    setFormError('');

    const result = validateRegister(values);
    setErrors(result.errors);
    if (!result.ok) {
      const first = Object.keys(result.errors)[0];
      document.getElementById(`register-${first === 'fullName' ? 'name' : first === 'confirmPassword' ? 'confirm' : first}`)?.focus();
      return;
    }

    setSubmitting(true);
    try {
      const outcome = await signUp(result.data);
      // 'signed_in': the auth state changes and this page redirects. Otherwise confirmation is required.
      if (outcome.status === 'confirm_email') setPendingEmail(result.data.email);
    } catch (error) {
      setFormError(error.message);
    }
    setSubmitting(false);
  }

  async function handleResend() {
    setResendMessage('');
    setFormError('');
    try {
      await resendConfirmation(pendingEmail);
      setResendMessage('Confirmation email sent again. Check your inbox (and spam folder).');
    } catch (error) {
      setFormError(error.message);
    }
  }

  if (pendingEmail) {
    return (
      <div className="container-page flex justify-center py-14">
        <div className="card w-full max-w-md p-7 text-center sm:p-8">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
            <MailCheck className="h-6 w-6" aria-hidden="true" />
          </span>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight">Check your email</h1>
          <p className="mt-2 break-words text-sm leading-relaxed text-ink-600">
            We sent a confirmation link to <strong className="text-ink-900">{pendingEmail}</strong>. Open it to activate your
            account, then log in.
          </p>
          {formError && <Notice type="error" className="mt-4 text-left">{formError}</Notice>}
          {resendMessage && <Notice type="success" className="mt-4 text-left">{resendMessage}</Notice>}
          <div className="mt-6 flex flex-col gap-3">
            <Link to="/login" className="btn-primary">
              Go to log in
            </Link>
            <button type="button" onClick={handleResend} className="btn-secondary">
              Resend the email
            </button>
          </div>
        </div>
      </div>
    );
  }

  const inputClass = (name) => `field-input ${errors[name] ? 'border-rose-400 focus:border-rose-500' : ''}`;

  return (
    <AuthCard
      title="Create your account"
      subtitle="Join your campus marketplace to sell items. Bidding arrives in a later module."
      altText="Already have an account?"
      altLink="/login"
      altLabel="Log in"
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {formError && (
          <Notice type="error" title="Could not create your account">
            {formError}
          </Notice>
        )}

        <FormField id="register-name" label="Full name" error={errors.fullName}>
          <input
            {...describeField('register-name', { error: errors.fullName })}
            type="text"
            autoComplete="name"
            value={values.fullName}
            onChange={(event) => setField('fullName', event.target.value)}
            placeholder="Your name"
            className={inputClass('fullName')}
          />
        </FormField>

        <FormField id="register-email" label="Email" error={errors.email}>
          <input
            {...describeField('register-email', { error: errors.email })}
            type="email"
            autoComplete="email"
            value={values.email}
            onChange={(event) => setField('email', event.target.value)}
            placeholder="you@example.edu"
            className={inputClass('email')}
          />
        </FormField>

        <FormField id="register-password" label="Password" error={errors.password} hint={`At least ${PASSWORD_MIN} characters.`}>
          <input
            {...describeField('register-password', { error: errors.password, hint: true })}
            type="password"
            autoComplete="new-password"
            value={values.password}
            onChange={(event) => setField('password', event.target.value)}
            placeholder="Choose a password"
            className={inputClass('password')}
          />
        </FormField>

        <FormField id="register-confirm" label="Confirm password" error={errors.confirmPassword}>
          <input
            {...describeField('register-confirm', { error: errors.confirmPassword })}
            type="password"
            autoComplete="new-password"
            value={values.confirmPassword}
            onChange={(event) => setField('confirmPassword', event.target.value)}
            placeholder="Type it again"
            className={inputClass('confirmPassword')}
          />
        </FormField>

        <button type="submit" disabled={submitting} className="btn-primary w-full">
          <UserPlus className="h-4 w-4" aria-hidden="true" />
          {submitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>
    </AuthCard>
  );
}
