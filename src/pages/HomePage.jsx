import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Gavel, ShieldCheck } from 'lucide-react';
import HeroSearch from '../components/HeroSearch.jsx';
import HeroIllustration from '../components/HeroIllustration.jsx';
import SectionHeading from '../components/SectionHeading.jsx';
import CategoryCard from '../components/CategoryCard.jsx';
import AuctionCard from '../components/AuctionCard.jsx';
import HowItWorks from '../components/HowItWorks.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ErrorState from '../components/ErrorState.jsx';
import LoadingState from '../components/LoadingState.jsx';
import useNow from '../hooks/useNow.js';
import useListings from '../hooks/useListings.js';
import { categories } from '../data/categories.js';
import { FEATURED_COUNT } from '../data/auctions.js';
import { getFeaturedListings } from '../utils/listingFilters.js';

export default function HomePage() {
  const now = useNow(30000);
  const { listings, loading, error, reload } = useListings();
  const featured = useMemo(() => getFeaturedListings(listings, now, FEATURED_COUNT), [listings, now]);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 via-white to-ink-50">
        <div className="container-page grid items-center gap-12 py-14 lg:grid-cols-2 lg:py-20">
          <div>
            <p className="badge bg-brand-100 text-brand-800">
              <Gavel className="h-3.5 w-3.5" aria-hidden="true" />
              Campus second-hand auctions
            </p>
            <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
              Seniors leave. Their stuff finds its <span className="text-brand-700">next owner.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-600">
              CampusBid turns the end-of-semester rush into fair auctions. Final-year students list
              cycles, calculators and books; juniors bid openly instead of racing in chat groups.
            </p>

            <div className="mt-8">
              <HeroSearch />
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/auctions" className="btn-primary">
                Explore Auctions
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link to="/sell" className="btn-accent">
                Sell Your Item
              </Link>
            </div>

            <p className="mt-5 flex items-center gap-2 text-sm text-ink-500">
              <ShieldCheck className="h-4 w-4 text-brand-600" aria-hidden="true" />
              Open bidding: every bid is visible to everyone.
            </p>
          </div>

          <HeroIllustration />
        </div>
      </section>

      {/* Categories */}
      <section aria-labelledby="categories-heading" className="py-16">
        <div className="container-page">
          <SectionHeading
            id="categories-heading"
            eyebrow="Categories"
            title="Shop by what you need"
            description="Pick a category to jump straight to matching auctions."
          />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => (
              <CategoryCard key={category.id} category={category} />
            ))}
          </div>
        </div>
      </section>

      {/* Featured auctions */}
      <section aria-labelledby="featured-heading" className="pb-16">
        <div className="container-page">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <SectionHeading
              id="featured-heading"
              eyebrow="Featured auctions"
              title="Ending soon on campus"
              description="A selection of open auctions listed by students on your campus."
            />
            <Link to="/auctions" className="btn-secondary">
              View all auctions
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          {loading ? (
            <LoadingState label="Loading auctions…" />
          ) : error ? (
            <ErrorState title="Could not load the auctions" error={error} onRetry={reload} className="mt-8" />
          ) : featured.length > 0 ? (
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((auction) => (
                <AuctionCard key={auction.id} auction={auction} now={now} />
              ))}
            </div>
          ) : (
            <div className="mt-8">
              <EmptyState
                title="No open auctions right now"
                message="There are no running auctions to feature. List an item to start one."
                action={
                  <Link to="/sell" className="btn-primary">
                    Sell an Item
                  </Link>
                }
              />
            </div>
          )}
        </div>
      </section>

      <HowItWorks />

      {/* Seller call to action */}
      <section className="pt-16" aria-labelledby="sell-cta-heading">
        <div className="container-page">
          <div className="flex flex-col items-start justify-between gap-6 rounded-3xl bg-brand-800 p-8 sm:p-10 md:flex-row md:items-center">
            <div>
              <h2 id="sell-cta-heading" className="text-2xl font-extrabold text-white sm:text-3xl">
                Leaving campus soon?
              </h2>
              <p className="mt-2 max-w-xl text-brand-100">
                List your cycle, books or calculator and let juniors compete for it. You choose the
                starting price and when the auction closes.
              </p>
            </div>
            <Link to="/sell" className="btn-accent shrink-0">
              Sell an Item
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
