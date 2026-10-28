import { useState } from 'react';
import { createSearchParams, useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';

/** Hero search box: sends the query to /auctions?q=... */
export default function HeroSearch() {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  function handleSubmit(event) {
    event.preventDefault();
    const trimmed = query.trim();
    navigate({
      pathname: '/auctions',
      search: trimmed ? `?${createSearchParams({ q: trimmed })}` : '',
    });
  }

  return (
    <form onSubmit={handleSubmit} role="search" className="flex w-full max-w-xl gap-2">
      <div className="relative flex-1">
        <label htmlFor="hero-search" className="sr-only">
          Search auctions by title or description
        </label>
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-400"
          aria-hidden="true"
        />
        <input
          id="hero-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search for a cycle, calculator, book..."
          className="field-input h-12 pl-11 shadow-sm"
        />
      </div>
      <button type="submit" className="btn-primary h-12 px-6">
        Search
      </button>
    </form>
  );
}
