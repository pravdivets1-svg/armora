import { Skeleton } from '@/components/skeletons';

// Скелет под Linear/Vercel-ленту: hairline-секция, плотные ряды.
// Геометрия совпадает с финальной разметкой страницы, чтобы не было
// «прыжка» при гидрации.

export default function Loading() {
  return (
    <>
      {/* Плейсхолдер sticky-шапки — без него контент прыгал на 56px, когда
          приходила настоящая PageHeader. */}
      <header className="sticky top-0 z-30 glass-strip border-b h-14 lg:h-16 flex items-center px-3 sm:px-4">
        <Skeleton className="h-5 w-28" />
      </header>
      <main className="max-w-3xl mx-auto px-4 lg:px-6 pt-3 pb-12 space-y-4">
      {/* Hero: следующее событие */}
      <div className="rounded-md border border-borderc bg-card px-4 py-3.5 pl-5 space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-14" />
          <Skeleton className="h-3 w-10" />
          <Skeleton className="h-3 w-12" />
        </div>
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-3 w-20" />
        <div className="pt-1 space-y-1.5">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-3 w-56" />
        </div>
      </div>

      {/* 21-дневная лента */}
      <section className="rounded-md border border-borderc bg-card overflow-hidden">
        {[true, false, false, true, false, false, true].map((withEvents, gi) => (
          <div
            key={gi}
            className={gi > 0 ? 'border-t border-borderc' : ''}
          >
            <div className="px-4 py-2 flex items-baseline gap-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-3 w-12" />
            </div>
            {withEvents ? (
              <ul className="divide-y divide-borderc/60">
                {Array.from({ length: gi === 0 ? 2 : 1 }).map((_, i) => (
                  <li key={i} className="px-4 py-2.5 min-h-[44px] flex items-center gap-3">
                    <Skeleton className="h-3 w-10" />
                    <Skeleton className="h-4 w-14" />
                    <Skeleton className="h-3 flex-1" />
                    <Skeleton className="h-3 w-10" />
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-4 py-3">
                <Skeleton className="h-3 w-16" />
              </div>
            )}
          </div>
        ))}
      </section>
    </main>
    </>
  );
}
