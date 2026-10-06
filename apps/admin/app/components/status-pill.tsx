type StatusPillProps = {
  tone: 'success' | 'warning' | 'danger' | 'neutral' | 'brand';
  children: React.ReactNode;
};

export function StatusPill({ tone, children }: StatusPillProps) {
  return <span className={`status-pill status-pill--${tone}`}>{children}</span>;
}
