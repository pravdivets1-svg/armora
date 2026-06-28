'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, Loader2 } from 'lucide-react';
import type { Role, Stage } from '@prisma/client';
import { STAGE_LABEL, STAGE_ORDER } from '@/lib/labels';
import { isStageTransitionAllowed } from '@/lib/stage-transitions';
import { HeroStage, Button } from '@/components/uikit';

function nextAllowed(current: Stage, role: Role): Stage | null {
  const idx = STAGE_ORDER.indexOf(current);
  const next = STAGE_ORDER[idx + 1];
  if (!next) return null;
  return isStageTransitionAllowed(role, current, next) ? next : null;
}

export default function HeroStageBlock({
  current,
  role,
  enteredAt,
  enteredBy,
  nextEvent,
  onStageChange,
  onApproveClosure,
}: {
  current: Stage;
  role: Role;
  enteredAt: string;
  enteredBy?: string;
  nextEvent?: string | null;
  onStageChange: (next: Stage) => Promise<void>;
  onApproveClosure?: () => Promise<void>;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const doStageChange = (next: Stage) => {
    start(async () => {
      await onStageChange(next);
      router.refresh();
    });
  };

  const doApprove = onApproveClosure
    ? () => {
        start(async () => {
          await onApproveClosure();
          router.refresh();
        });
      }
    : undefined;

  const next = nextAllowed(current, role);
  const isPendingClosureDirector = current === 'pending_closure' && role === 'director' && !!doApprove;
  const showStickyCta = isPendingClosureDirector || !!next;

  return (
    <>
      <HeroStage
        current={current}
        role={role}
        enteredAt={enteredAt}
        enteredBy={enteredBy}
        nextEvent={nextEvent}
        onStageChange={doStageChange}
        onApproveClosure={doApprove}
      />

      {/* Sticky bottom CTA — только на мобиле, дублирует primary action HeroStage */}
      {showStickyCta && (
        <div
          className="lg:hidden fixed inset-x-0 z-30 px-4 pt-2 pb-3 bg-app/95 backdrop-blur border-t border-borderc/60"
          style={{ bottom: 'calc(64px + env(safe-area-inset-bottom))' }}
        >
          {isPendingClosureDirector ? (
            <Button size="lg" block disabled={pending} onClick={doApprove}>
              {pending ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>Закрыть заказ <ChevronRight size={18} /></>
              )}
            </Button>
          ) : next ? (
            <Button size="lg" block disabled={pending} onClick={() => doStageChange(next)}>
              {pending ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>Передать в «{STAGE_LABEL[next]}» <ChevronRight size={18} /></>
              )}
            </Button>
          ) : null}
        </div>
      )}
    </>
  );
}
