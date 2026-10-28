export default function SectionHeading({ eyebrow, title, description, align = 'left', id }) {
  return (
    <div className={align === 'center' ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'}>
      {eyebrow && (
        <p className="text-sm font-semibold uppercase tracking-wider text-brand-700">{eyebrow}</p>
      )}
      <h2 id={id} className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">
        {title}
      </h2>
      {description && <p className="mt-3 text-base leading-relaxed text-ink-600">{description}</p>}
    </div>
  );
}
