import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

const STYLES = {
  success: { box: 'border-emerald-200 bg-emerald-50 text-emerald-900', icon: CheckCircle2, iconTone: 'text-emerald-600' },
  error: { box: 'border-rose-200 bg-rose-50 text-rose-900', icon: AlertCircle, iconTone: 'text-rose-600' },
  warning: { box: 'border-accent-200 bg-accent-50 text-ink-800', icon: AlertTriangle, iconTone: 'text-accent-700' },
  info: { box: 'border-brand-200 bg-brand-50 text-ink-800', icon: Info, iconTone: 'text-brand-600' },
};

/** Inline message banner. Errors are announced immediately; other types politely. */
export default function Notice({ type = 'info', title, children, onDismiss, className = '' }) {
  const style = STYLES[type] ?? STYLES.info;
  const Icon = style.icon;

  return (
    <div
      role={type === 'error' ? 'alert' : 'status'}
      className={`flex items-start gap-3 rounded-xl border p-3.5 text-sm ${style.box} ${className}`}
    >
      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${style.iconTone}`} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={title ? 'mt-0.5 leading-relaxed' : 'leading-relaxed'}>{children}</div>}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss message"
          className="-m-1 rounded-lg p-1 text-current opacity-70 hover:opacity-100"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
