import { Search, Gavel, Handshake, Info } from 'lucide-react';
import SectionHeading from './SectionHeading.jsx';

const steps = [
  {
    icon: Search,
    title: 'Browse available items',
    text: 'Search by title or pick a category to find the cycles, calculators, books and hostel essentials seniors are leaving behind.',
  },
  {
    icon: Gavel,
    title: 'Place a bid',
    text: 'Bid at or above the starting price, then outbid others by at least the minimum increment while the auction is open.',
  },
  {
    icon: Handshake,
    title: 'Win and coordinate with the seller',
    text: 'The highest bidder when the auction closes wins. Arrange the handover with the seller on campus.',
  },
];

/** Homepage section, reachable from the navbar via /#how-it-works. */
export default function HowItWorks() {
  return (
    <section id="how-it-works" aria-labelledby="how-heading" className="bg-white py-16">
      <div className="container-page">
        <SectionHeading
          id="how-heading"
          align="center"
          eyebrow="How it works"
          title="Three simple steps to your next campus find"
          description="Fair, open auctions replace the race to reply first in chat groups."
        />

        <ol className="mt-10 grid gap-6 md:grid-cols-3">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <li key={step.title} className="card relative p-6">
                <span className="absolute right-5 top-5 font-display text-5xl font-extrabold text-ink-100">
                  {index + 1}
                </span>
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </span>
                <h3 className="mt-5 text-lg font-bold">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-600">{step.text}</p>
              </li>
            );
          })}
        </ol>

        <p className="mx-auto mt-8 flex max-w-2xl items-start gap-3 rounded-xl border border-accent-200 bg-accent-50 p-4 text-sm text-ink-700">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-accent-700" aria-hidden="true" />
          <span>
            Payment and delivery workflows will be added later if needed. For now, the winner and
            the seller coordinate the handover directly on campus.
          </span>
        </p>
      </div>
    </section>
  );
}
