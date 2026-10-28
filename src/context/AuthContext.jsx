import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient.js';
import { friendlyAuthError, isObfuscatedExistingUser } from '../utils/authErrors.js';
import { ServiceError } from '../services/serviceError.js';

export const AuthContext = createContext(null);

function requireClient() {
  if (!supabase) {
    throw new ServiceError('Supabase is not configured. Add your keys to the .env file (see the README).', { code: 'config' });
  }
  return supabase;
}

/**
 * Keeps the Supabase session in React state.
 *  - `loading` is true until the stored session has been checked (so protected pages do not flash
 *    a redirect to /login on refresh).
 *  - Supabase stores the session token itself; this app never stores or sees a password after sending it.
 */
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(Boolean(supabase));

  useEffect(() => {
    if (!supabase) return undefined;
    let active = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (active) setSession(data.session ?? null);
      })
      .catch((error) => console.error('CampusAuction: could not restore the session.', error))
      .finally(() => {
        if (active) setLoading(false);
      });

    // Keep this callback synchronous: calling other Supabase methods inside it can deadlock.
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession ?? null);
      setLoading(false);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async ({ email, password }) => {
    const { error } = await requireClient().auth.signInWithPassword({ email, password });
    if (error) throw new ServiceError(friendlyAuthError(error, 'login'), { code: 'auth', cause: error });
  }, []);

  /**
   * Returns { status: 'signed_in' } when a session was created, or
   * { status: 'confirm_email' } when the project requires email confirmation first.
   */
  const signUp = useCallback(async ({ fullName, email, password }) => {
    const { data, error } = await requireClient().auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/login`,
      },
    });
    if (error) throw new ServiceError(friendlyAuthError(error, 'register'), { code: 'auth', cause: error });
    if (isObfuscatedExistingUser(data.user)) {
      throw new ServiceError(friendlyAuthError({ code: 'user_already_exists' }, 'register'), { code: 'auth' });
    }
    return { status: data.session ? 'signed_in' : 'confirm_email' };
  }, []);

  const resendConfirmation = useCallback(async (email) => {
    const { error } = await requireClient().auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: `${window.location.origin}/login` },
    });
    if (error) throw new ServiceError(friendlyAuthError(error, 'register'), { code: 'auth', cause: error });
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await requireClient().auth.signOut();
    if (error) throw new ServiceError('Could not log you out. Please try again.', { code: 'auth', cause: error });
  }, []);

  const user = session?.user ?? null;
  const value = useMemo(
    () => ({
      user,
      session,
      loading,
      isAuthenticated: Boolean(user),
      displayName: user?.user_metadata?.full_name?.trim() || user?.email || '',
      signIn,
      signUp,
      signOut,
      resendConfirmation,
    }),
    [user, session, loading, signIn, signUp, signOut, resendConfirmation],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
