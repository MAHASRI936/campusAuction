import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Menu, X, PlusCircle } from 'lucide-react';
import Logo from './Logo.jsx';

const linkBase =
  'rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-brand-50 hover:text-brand-800';

function navClass({ isActive }) {
  return `${linkBase} ${isActive ? 'bg-brand-50 text-brand-800' : 'text-ink-600'}`;
}

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { pathname, hash } = useLocation();

  // Close the mobile menu whenever the route changes.
  useEffect(() => {
    setOpen(false);
  }, [pathname, hash]);

  const links = (
    <>
      <NavLink to="/" end className={navClass}>
        Home
      </NavLink>
      <NavLink to="/auctions" className={navClass}>
        Browse Auctions
      </NavLink>
      {/* Section link on the homepage */}
      <Link to="/#how-it-works" className={`${linkBase} text-ink-600`}>
        How It Works
      </Link>
      <NavLink to="/login" className={navClass}>
        Login
      </NavLink>
      <NavLink to="/register" className={navClass}>
        Register
      </NavLink>
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
