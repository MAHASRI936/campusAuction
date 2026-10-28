import { BookOpen, Laptop, Calculator, Bike, BedDouble, Package } from 'lucide-react';

/**
 * Central list of marketplace categories.
 * `id` is the value used in the URL (`/auctions?category=books`) and
 * stored on each auction. Later modules can reuse these as database values.
 *
 * `tone` holds Tailwind classes so each category has a consistent colour.
 */
export const categories = [
  {
    id: 'books',
    label: 'Books',
    description: 'Textbooks, notes and reference books',
    icon: BookOpen,
    tone: {
      tile: 'bg-sky-100 text-sky-700',
      gradient: 'from-sky-100 via-sky-50 to-white',
      icon: 'text-sky-600',
    },
  },
  {
    id: 'electronics',
    label: 'Electronics',
    description: 'Laptops, headphones and gadgets',
    icon: Laptop,
    tone: {
      tile: 'bg-violet-100 text-violet-700',
      gradient: 'from-violet-100 via-violet-50 to-white',
      icon: 'text-violet-600',
    },
  },
  {
    id: 'calculators',
    label: 'Calculators',
    description: 'Scientific and graphing calculators',
    icon: Calculator,
    tone: {
      tile: 'bg-emerald-100 text-emerald-700',
      gradient: 'from-emerald-100 via-emerald-50 to-white',
      icon: 'text-emerald-600',
    },
  },
  {
    id: 'cycles',
    label: 'Cycles',
    description: 'Bicycles for getting around campus',
    icon: Bike,
    tone: {
      tile: 'bg-orange-100 text-orange-700',
      gradient: 'from-orange-100 via-orange-50 to-white',
      icon: 'text-orange-600',
    },
  },
  {
    id: 'hostel',
    label: 'Hostel Essentials',
    description: 'Lamps, kettles and room basics',
    icon: BedDouble,
    tone: {
      tile: 'bg-rose-100 text-rose-700',
      gradient: 'from-rose-100 via-rose-50 to-white',
      icon: 'text-rose-600',
    },
  },
  {
    id: 'other',
    label: 'Other Items',
    description: 'Bags, drafters and everything else',
    icon: Package,
    tone: {
      tile: 'bg-amber-100 text-amber-700',
      gradient: 'from-amber-100 via-amber-50 to-white',
      icon: 'text-amber-600',
    },
  },
];

export function getCategoryById(id) {
  return categories.find((category) => category.id === id);
}
