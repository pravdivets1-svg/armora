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
    <section className={`bg-card border border-borderc rounded-lg ${className}`}>
      <header className="flex items-center justify-between px-5 pt-5 pb-3">
        <h2 className="text-meta uppercase tracking-wide text-text3">{title}</h2>
        {action}
      </header>
      <div className="px-5 pb-5 space-y-3">{children}</div>
    </section>
  );
}
