import { SkeletonHeader, SkeletonTable } from '@/components/skeletons';

export default function Loading() {
  return (
    <main className="max-w-6xl mx-auto px-6 py-10 space-y-8">
      <SkeletonHeader />
      <SkeletonTable rows={4} />
    </main>
  );
}
