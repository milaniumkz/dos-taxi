import Link from 'next/link';

type MetricCardProps = {
  label: string;
  value: string;
  hint: string;
  accent?: 'gold' | 'teal' | 'ink' | 'ember';
  href?: string;
  actionLabel?: string;
};

export function MetricCard({
  label,
  value,
  hint,
  accent = 'gold',
  href,
  actionLabel,
}: MetricCardProps) {
  return (
    <article className={`metric-card metric-card--${accent}`}>
      <span className="metric-card__label">{label}</span>
      <strong className="metric-card__value">{value}</strong>
      <span className="metric-card__hint">{hint}</span>
      {href && actionLabel ? (
        <div className="button-row">
          <Link href={href} className="action-button action-button--ghost">
            {actionLabel}
          </Link>
        </div>
      ) : null}
    </article>
  );
}
