import { SkeletonHeader, SkeletonStatRow, SkeletonRow } from '@/components/skeletons';

export default function Loading() {
  return (
    <main className="max-w-6xl mx-auto px-6 py-10 space-y-8">
      <SkeletonHeader />
      <SkeletonStatRow count={3} />
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)}
      </div>
    </main>
  );
}
