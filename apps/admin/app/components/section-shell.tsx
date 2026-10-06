type SectionShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
  aside?: React.ReactNode;
  className?: string;
};

export function SectionShell({
  eyebrow,
  title,
  description,
  children,
  aside,
  className,
}: SectionShellProps) {
  return (
    <section className={`section-shell ${className ?? ''}`.trim()}>
      <header className="section-shell__header">
        <div>
          <span className="section-shell__eyebrow">{eyebrow}</span>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        {aside ? <div className="section-shell__aside">{aside}</div> : null}
      </header>
      {children}
    </section>
  );
}
