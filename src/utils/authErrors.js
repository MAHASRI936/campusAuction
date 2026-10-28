/** Turn a Supabase Auth error into a message a student can act on. */
export function friendlyAuthError(error, context = 'login') {
  const code = String(error?.code ?? '').toLowerCase();
  const message = String(error?.message ?? '').toLowerCase();
  const status = error?.status;

  if (error?.name === 'AuthRetryableFetchError' || /failed to fetch|network|load failed/.test(message)) {
    return 'Could not reach the server. Check your internet connection and try again.';
  }
  if (code === 'invalid_credentials' || message.includes('invalid login credentials')) {
    return 'Incorrect email or password. Check both and try again.';
  }
  if (code === 'email_not_confirmed' || message.includes('email not confirmed')) {
    return 'Please confirm your email first. Open the confirmation link we sent you, then log in.';
  }
  if (code === 'user_already_exists' || code === 'email_exists' || message.includes('already registered')) {
    return 'An account with this email already exists. Try logging in instead.';
  }
  if (code === 'weak_password' || message.includes('password should')) {
    return 'That password is too weak. Use at least 8 characters with a mix of letters and numbers.';
  }
  if (code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit' || status === 429) {
    return 'Too many attempts. Please wait a minute and try again.';
  }
  if (code === 'signup_disabled') return 'New sign-ups are turned off for this project.';
  if (code === 'email_address_invalid' || message.includes('invalid email')) {
    return 'That email address was not accepted. Check it and try again.';
  }
  return context === 'register'
    ? 'Could not create your account. Please try again.'
    : 'Could not log you in. Please try again.';
}

/**
 * With email confirmation ON, Supabase hides whether an email is already registered:
 * it returns a user whose `identities` list is empty instead of an error.
 */
export function isObfuscatedExistingUser(user) {
  return Boolean(user) && Array.isArray(user.identities) && user.identities.length === 0;
}
