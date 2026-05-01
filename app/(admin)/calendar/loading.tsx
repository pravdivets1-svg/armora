import { SkeletonHeader, SkeletonStatRow } from '@/components/skeletons';
import { Skeleton } from '@/components/skeletons';

export default function Loading() {
  return (
    <main className="max-w-6xl mx-auto px-6 py-10 space-y-8">
      <SkeletonHeader />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 auto-rows-[minmax(110px,auto)]">
        <div className="md:col-span-2 md:row-span-2 rounded-2xl bg-ink-900/[0.06] min-h-[240px] md:min-h-[280px]" />
        <div className="rounded-2xl border border-line bg-white p-5 md:p-6"><Skeleton className="h-3 w-16" /><div className="mt-3"><Skeleton className="h-12 w-12" /></div></div>
        <div className="rounded-2xl border border-line bg-white p-5 md:p-6"><Skeleton className="h-3 w-16" /><div className="mt-3"><Skeleton className="h-12 w-12" /></div></div>
        <div className="md:col-span-2 rounded-2xl border border-line bg-white p-5 md:p-6"><Skeleton className="h-3 w-24" /><div className="mt-3"><Skeleton className="h-12 w-16" /></div></div>
      </div>
    </main>
  );
}
