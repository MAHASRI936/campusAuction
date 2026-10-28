import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react';
import Logo from './Logo.jsx';
import { categories } from '../data/categories.js';

const footerLinks = [
  { to: '/', label: 'Home' },
  { to: '/auctions', label: 'Browse Auctions' },
  { to: '/#how-it-works', label: 'How It Works' },
  { to: '/sell', label: 'Sell an Item' },
  { to: '/login', label: 'Login' },
  { to: '/register', label: 'Register' },
];

export default function Footer() {
  return (
    <footer className="mt-16 bg-ink-900 text-ink-200">
      <div className="container-page grid gap-10 py-12 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo light />
          <p className="mt-4 max-w-md text-sm leading-relaxed text-ink-300">
            CampusBid is a second-hand auction marketplace for your campus. Final-year students
            list what they no longer need, and juniors bid fairly for it.
          </p>
        </div>

        <nav aria-label="Footer navigation">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-white">Explore</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {footerLinks.map((link) => (
              <li key={link.label}>
                <Link to={link.to} className="text-ink-300 hover:text-white">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-white">Categories</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {categories.map((category) => (
              <li key={category.id}>
                <Link
                  to={`/auctions?category=${category.id}`}
                  className="text-ink-300 hover:text-white"
                >
                  {category.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-ink-700">
        <div className="container-page flex flex-col gap-3 py-6 text-sm text-ink-400 sm:flex-row sm:items-center sm:justify-between">
          <p className="inline-flex items-center gap-2">
            <Mail className="h-4 w-4" aria-hidden="true" />
            Contact: details coming soon (placeholder)
          </p>
          <p>&copy; {new Date().getFullYear()} CampusBid. Hackathon project. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
