import { Skeleton, SkeletonRow } from '@/components/skeletons';

// Скелет повторяет реальный каркас /orders (sticky glass-шапка, hero, поиск,
// вкладки, карточки) — раньше рисовался «табличный» макет в других отступах,
// и при приходе данных весь лейаут перескакивал.
export default function Loading() {
  return (
    <>
      <header className="sticky top-0 z-30 glass-strip border-b h-14 lg:h-16 flex items-center px-3 sm:px-4">
        <Skeleton className="h-5 w-28" />
      </header>
      <main className="max-w-6xl mx-auto px-4 lg:px-6 pt-4 space-y-3">
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-10 rounded-md" />
        <div className="flex gap-1.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-11 lg:h-9 w-20 rounded-md" />
          ))}
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-2.5">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}
        </div>
      </main>
    </>
  );
}
