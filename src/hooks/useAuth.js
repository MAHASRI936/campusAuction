import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext.jsx';

/** Current auth state and actions: { user, loading, isAuthenticated, displayName, signIn, signUp, signOut, resendConfirmation }. */
export default function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>.');
  return value;
}
