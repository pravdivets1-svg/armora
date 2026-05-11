'use client';

import { useRouter } from 'next/navigation';
import type { Role, Stage } from '@prisma/client';
import { HeroStage } from '@/components/ui';

export default function HeroStageBlock({
  current,
  role,
  enteredAt,
  enteredBy,
  onStageChange,
  onApproveClosure,
}: {
  current: Stage;
  role: Role;
  enteredAt: string;
  enteredBy?: string;
  onStageChange: (next: Stage) => Promise<void>;
  onApproveClosure?: () => Promise<void>;
}) {
  const router = useRouter();

  const handleStageChange = async (next: Stage) => {
    await onStageChange(next);
    router.refresh();
  };

  const handleApprove = onApproveClosure
    ? async () => {
        await onApproveClosure();
        router.refresh();
      }
    : undefined;

  return (
    <HeroStage
      current={current}
      role={role}
      enteredAt={enteredAt}
      enteredBy={enteredBy}
      onStageChange={handleStageChange}
      onApproveClosure={handleApprove}
    />
  );
}
