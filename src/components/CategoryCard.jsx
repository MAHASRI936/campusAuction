import { Link } from 'react-router-dom';

/** Category tile that links to the browse page with the category pre-selected. */
export default function CategoryCard({ category }) {
  const Icon = category.icon;

  return (
    <Link
      to={`/auctions?category=${category.id}`}
      className="card group flex flex-col items-start gap-3 p-5 transition-all hover:-translate-y-0.5 hover:shadow-lift"
    >
      <span className={`flex h-12 w-12 items-center justify-center rounded-xl ${category.tone.tile}`}>
        <Icon className="h-6 w-6" aria-hidden="true" />
      </span>
      <span>
        <span className="block text-base font-bold text-ink-900">{category.label}</span>
        <span className="mt-0.5 block text-sm text-ink-500">{category.description}</span>
      </span>
    </Link>
  );
}
