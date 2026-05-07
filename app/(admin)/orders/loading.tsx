import { SkeletonHeader, SkeletonTable } from '@/components/skeletons';

export default function Loading() {
  return (
    <main className="max-w-6xl mx-auto px-6 py-6 space-y-5">
      <SkeletonHeader />
      <div className="h-12" />
      <SkeletonTable rows={8} />
    </main>
  );
}
