import { Skeleton } from '@/components/skeletons';

export default function Loading() {
  return (
    <main className="max-w-4xl mx-auto px-4 lg:px-6 py-4 pb-12">
      <div className="bg-card border border-borderc rounded-lg divide-y divide-borderc/60">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 lg:px-5 py-2.5">
            <Skeleton className="h-7 w-7 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-40" />
              <Skeleton className="h-3 w-56" />
            </div>
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>
    </main>
  );
}
