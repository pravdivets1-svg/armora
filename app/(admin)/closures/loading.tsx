import { Skeleton } from '@/components/skeletons';

export default function Loading() {
  return (
    <main className="max-w-5xl mx-auto px-4 lg:px-6 py-4 space-y-3 pb-12">
      <div className="bg-card border border-borderc rounded-lg grid grid-cols-3 divide-x divide-borderc/60">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="px-4 py-3 space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-5 w-24" />
          </div>
        ))}
      </div>
      <div className="bg-card border border-borderc rounded-lg divide-y divide-borderc/60">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="px-4 lg:px-5 py-3.5 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-64" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-5 w-28" />
                <Skeleton className="h-3 w-20 ml-auto" />
              </div>
            </div>
            <Skeleton className="h-3 w-full" />
          </div>
        ))}
      </div>
    </main>
  );
}
