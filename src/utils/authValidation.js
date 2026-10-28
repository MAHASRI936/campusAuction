/** Client-side checks for the login and registration forms. The server still validates everything. */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 72; // bcrypt limit used by Supabase Auth
export const NAME_MIN = 2;
export const NAME_MAX = 100;

export function normalizeEmail(value) {
  return String(value ?? '').trim().toLowerCase();
}

export function validateLogin({ email, password }) {
  const errors = {};
  const cleanEmail = normalizeEmail(email);
  if (!cleanEmail) errors.email = 'Enter your email address.';
  else if (!EMAIL_PATTERN.test(cleanEmail)) errors.email = 'Enter a valid email address, like you@example.edu.';
  if (!password) errors.password = 'Enter your password.';
  return { ok: Object.keys(errors).length === 0, errors, data: { email: cleanEmail, password } };
}

export function validateRegister({ fullName, email, password, confirmPassword }) {
  const errors = {};
  const name = String(fullName ?? '').trim().replace(/\s+/g, ' ');
  const cleanEmail = normalizeEmail(email);

  if (!name) errors.fullName = 'Enter your full name.';
  else if (name.length < NAME_MIN) errors.fullName = `Name must be at least ${NAME_MIN} characters.`;
  else if (name.length > NAME_MAX) errors.fullName = `Name must be ${NAME_MAX} characters or fewer.`;

  if (!cleanEmail) errors.email = 'Enter your email address.';
  else if (!EMAIL_PATTERN.test(cleanEmail)) errors.email = 'Enter a valid email address, like you@example.edu.';

  const pass = String(password ?? '');
  if (!pass) errors.password = 'Choose a password.';
  else if (pass.length < PASSWORD_MIN) errors.password = `Password must be at least ${PASSWORD_MIN} characters.`;
  else if (pass.length > PASSWORD_MAX) errors.password = `Password must be ${PASSWORD_MAX} characters or fewer.`;

  if (!errors.password) {
    if (!confirmPassword) errors.confirmPassword = 'Type your password again to confirm it.';
    else if (confirmPassword !== pass) errors.confirmPassword = 'The two passwords do not match.';
  }

  return { ok: Object.keys(errors).length === 0, errors, data: { fullName: name, email: cleanEmail, password: pass } };
}

/** Only allow redirects to a path inside this app (blocks "//evil.com" and full URLs). */
export function safeRedirectPath(value, fallback = '/') {
  if (typeof value !== 'string') return fallback;
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return fallback;
  if (value === '/login' || value === '/register') return fallback;
  return value;
}
