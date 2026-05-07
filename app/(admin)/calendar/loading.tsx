import { Skeleton } from '@/components/skeletons';

export default function Loading() {
  return (
    <main className="max-w-4xl mx-auto px-4 md:px-6 py-6 space-y-6">
      {/* Шапка */}
      <div className="space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-9 w-64" />
      </div>

      {/* Stats-bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl bg-ink-900/[0.07] h-[116px]" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-xl bg-white border border-line px-4 py-4 space-y-3">
            <Skeleton className="h-2.5 w-16" />
            <Skeleton className="h-10 w-12" />
            <Skeleton className="h-2.5 w-10" />
          </div>
        ))}
      </div>

      {/* Timeline */}
      <div className="space-y-8">
        {[5, 3].map((count, gi) => (
          <div key={gi}>
            {/* День */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-2 h-2 rounded-full bg-ink-300" />
              <Skeleton className="h-4 w-40" />
            </div>
            {/* Карточки */}
            <div className="ml-[9px] pl-6 space-y-2 border-l border-line">
              {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="bg-white border border-line border-l-[3px] border-l-ink-200
                                        rounded-xl px-4 py-3.5 flex gap-4">
                  <div className="shrink-0 w-16 space-y-2">
                    <Skeleton className="h-7 w-14" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-56" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
