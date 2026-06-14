export function SectionCard({
  title,
  action,
  children,
  className = '',
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`glass-surface rounded-2xl ${className}`}>
      <header className="flex items-center justify-between px-5 pt-5 pb-3">
        <h2 className="text-meta uppercase tracking-wide text-text3">{title}</h2>
        {action}
      </header>
      <div className="px-5 pb-5 space-y-3">{children}</div>
    </section>
  );
}
