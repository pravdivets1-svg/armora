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
      <header className="flex items-center justify-between px-4 pt-4 pb-2.5">
        <h2 className="text-meta uppercase tracking-wide text-text2">{title}</h2>
        {action}
      </header>
      <div className="px-4 pb-4 space-y-2.5">{children}</div>
    </section>
  );
}
