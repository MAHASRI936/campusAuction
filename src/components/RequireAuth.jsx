import { Navigate, useLocation } from 'react-router-dom';
import LoadingState from './LoadingState.jsx';
import useAuth from '../hooks/useAuth.js';

/**
 * Route guard: shows the page only to logged-in users, otherwise sends them to /login
 * and brings them back here afterwards. This is a convenience for honest users; the
 * real protection is Row-Level Security in the database.
 */
export default function RequireAuth({ children, reason = 'Please log in to continue.' }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingState label="Checking your login…" />;
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}`, reason }} />;
  }
  return children;
}
