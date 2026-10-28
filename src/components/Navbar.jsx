import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, PlusCircle, LogOut, User } from 'lucide-react';
import Logo from './Logo.jsx';
import useAuth from '../hooks/useAuth.js';

const linkBase =
  'rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-brand-50 hover:text-brand-800';

function navClass({ isActive }) {
  return `${linkBase} ${isActive ? 'bg-brand-50 text-brand-800' : 'text-ink-600'}`;
}

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);
  const { pathname, hash } = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, loading, displayName, signOut } = useAuth();

  // Close the mobile menu whenever the route changes.
  useEffect(() => {
    setOpen(false);
  }, [pathname, hash]);

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    setLogoutError('');
    try {
      await signOut();
      navigate('/', { replace: true });
    } catch (error) {
      setLogoutError(error.message);
    }
    setLoggingOut(false);
  }

  const accountLinks = loading ? null : isAuthenticated ? (
    <>
      <NavLink to="/my-listings" className={navClass}>
        My Listings
      </NavLink>
      <span className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-ink-700" title={displayName}>
        <User className="h-4 w-4 shrink-0 text-ink-500" aria-hidden="true" />
        <span className="max-w-[10rem] truncate">{displayName}</span>
      </span>
      <button
        type="button"
        onClick={handleLogout}
        disabled={loggingOut}
        className={`${linkBase} inline-flex items-center gap-1.5 text-left text-ink-600 disabled:opacity-60`}
      >
        <LogOut className="h-4 w-4" aria-hidden="true" />
        {loggingOut ? 'Logging out…' : 'Log out'}
      </button>
    </>
  ) : (
    <>
      <NavLink to="/login" className={navClass}>
        Login
      </NavLink>
      <NavLink to="/register" className={navClass}>
        Register
      </NavLink>
    </>
  );

  const links = (
    <>
      <NavLink to="/" end className={navClass}>
        Home
      </NavLink>
      <NavLink to="/auctions" end className={navClass}>
        Browse Auctions
      </NavLink>
      {/* Section link on the homepage */}
      <Link to="/#how-it-works" className={`${linkBase} text-ink-600`}>
        How It Works
      </Link>
      {accountLinks}
    </>
  );

  return (
    <header className="sticky top-0 z-50 border-b border-ink-100 bg-white/90 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Logo />

        <nav aria-label="Main navigation" className="hidden items-center gap-1 lg:flex">
          {links}
        </nav>

        <div className="flex items-center gap-2">
          <Link to="/sell" className="btn-accent hidden sm:inline-flex">
            <PlusCircle className="h-4 w-4" aria-hidden="true" />
            Sell an Item
          </Link>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-ink-200 text-ink-700 hover:bg-ink-50 lg:hidden"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {logoutError && (
        <p role="alert" className="border-t border-rose-200 bg-rose-50 px-4 py-2 text-center text-sm font-medium text-rose-700">
          {logoutError}
        </p>
      )}

      {open && (
        <nav
          id="mobile-menu"
          aria-label="Mobile navigation"
          className="border-t border-ink-100 bg-white lg:hidden"
        >
          <div className="container-page flex flex-col gap-1 py-3">
            {links}
            <Link to="/sell" className="btn-accent mt-2 sm:hidden">
              <PlusCircle className="h-4 w-4" aria-hidden="true" />
              Sell an Item
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
