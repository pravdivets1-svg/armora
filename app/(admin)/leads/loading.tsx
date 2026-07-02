import { Skeleton, SkeletonRow } from '@/components/skeletons';

// Скелет повторяет реальный каркас /leads (sticky-шапка, поиск, чипы, строки) —
// прежний макет был от «дашбордной» страницы (max-w-6xl + stat-карточки),
// и контент скакал по ширине и вертикали при каждом заходе.
export default function Loading() {
  return (
    <>
      <header className="sticky top-0 z-30 glass-strip border-b h-14 lg:h-16 flex items-center px-3 sm:px-4">
        <Skeleton className="h-5 w-24" />
      </header>
      <main className="max-w-3xl mx-auto px-4 lg:px-6 pt-3 space-y-3">
        <Skeleton className="h-10 rounded-md" />
        <div className="flex gap-1.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-11 lg:h-9 w-20 rounded-md" />
          ))}
        </div>
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}
        </div>
      </main>
    </>
  );
}
