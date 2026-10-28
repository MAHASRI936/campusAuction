import { Gavel, BookOpen, Calculator, Bike, Laptop, Headphones } from 'lucide-react';

/**
 * Locally built hero visual (no external images): a stylised auction
 * "stage" with a gavel and floating item tiles. Purely decorative.
 */
export default function HeroIllustration() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-md" aria-hidden="true">
      {/* Background shapes */}
      <div className="absolute inset-0 rounded-[2.5rem] bg-gradient-to-br from-brand-700 via-brand-600 to-brand-900" />
      <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-accent-300/90" />
      <div className="absolute -bottom-5 -left-5 h-20 w-20 rounded-2xl bg-sky-300/80 rotate-12" />
      <div className="absolute inset-6 rounded-[2rem] border border-white/15" />

      {/* Centre: gavel on a block */}
      <div className="absolute left-1/2 top-1/2 flex h-40 w-40 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/25">
        <div className="flex h-28 w-28 items-center justify-center rounded-full bg-white shadow-lift">
          <Gavel className="h-14 w-14 text-brand-700" strokeWidth={1.75} />
        </div>
      </div>

      {/* Floating item tiles */}
      <Tile className="left-[8%] top-[12%] -rotate-6" tone="bg-sky-100 text-sky-700" label="Books">
        <BookOpen className="h-6 w-6" />
      </Tile>
      <Tile className="right-[8%] top-[18%] rotate-6" tone="bg-emerald-100 text-emerald-700" label="Calculators">
        <Calculator className="h-6 w-6" />
      </Tile>
      <Tile className="left-[6%] bottom-[22%] rotate-3" tone="bg-orange-100 text-orange-700" label="Cycles">
        <Bike className="h-6 w-6" />
      </Tile>
      <Tile className="right-[6%] bottom-[16%] -rotate-3" tone="bg-violet-100 text-violet-700" label="Laptops">
        <Laptop className="h-6 w-6" />
      </Tile>
      <Tile className="left-[38%] bottom-[5%] rotate-2" tone="bg-rose-100 text-rose-700" label="Audio">
        <Headphones className="h-6 w-6" />
      </Tile>
    </div>
  );
}

function Tile({ className, tone, label, children }) {
  return (
    <div
      className={`absolute flex items-center gap-2 rounded-2xl bg-white px-3 py-2 shadow-lift ${className}`}
    >
      <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}>{children}</span>
      <span className="pr-1 text-sm font-semibold text-ink-800">{label}</span>
    </div>
  );
}
