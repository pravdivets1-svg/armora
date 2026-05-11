export function Card({
  children,
  className = '',
  interactive = false,
}: {
  children: React.ReactNode;
  className?: string;
  interactive?: boolean;
}) {
  return (
    <div
      className={`bg-card border border-borderc rounded-lg shadow-card
                  ${interactive ? 'transition-shadow duration-fast ease-soft hover:shadow-soft-lg cursor-pointer' : ''}
                  ${className}`}
    >
      {children}
    </div>
  );
}
