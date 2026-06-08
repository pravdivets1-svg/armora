// Универсальные skeleton-блоки для loading.tsx.

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

export function SkeletonHeader() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-12 md:h-14 w-72 max-w-full" />
      <Skeleton className="h-4 w-56" />
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="bg-card border border-borderc rounded-lg p-4 space-y-2">
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-5 w-24" />
      </div>
      <Skeleton className="h-5 w-2/3" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  );
}

export function SkeletonStatRow({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-borderc bg-card p-5 md:p-6 space-y-3">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-9 w-16" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 6 }: { rows?: number }) {
  return (
    <div className="bg-card border border-borderc rounded-2xl overflow-hidden">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-borderc/60 last:border-0">
          <Skeleton className="h-4 w-8" />
          <Skeleton className="h-4 flex-1 max-w-[200px]" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-5 w-20" />
        </div>
      ))}
    </div>
  );
}
