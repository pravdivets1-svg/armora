'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, Loader2 } from 'lucide-react';
import type { Role, Stage } from '@prisma/client';
import { STAGE_LABEL, STAGE_ORDER } from '@/lib/labels';
import { isStageTransitionAllowed } from '@/lib/stage-transitions';
import { HeroStage, Button, Money } from '@/components/uikit';

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

  // Живое «К доплате» из формы (CustomEvent) — показываем в доке рядом с CTA,
  // чтобы сумма к приёму была на глазах без скролла к финансовой сводке.
  const [remaining, setRemaining] = useState<number | null>(null);
  useEffect(() => {
    const on = (e: Event) =>
      setRemaining((e as CustomEvent<{ remaining: number | null }>).detail?.remaining ?? null);
    window.addEventListener('armora:order-remaining', on);
    return () => window.removeEventListener('armora:order-remaining', on);
  }, []);

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

      {/* Sticky bottom CTA — только на мобиле, дублирует primary action HeroStage.
          Слева — живое «К доплате» (если есть долг): сумма к приёму на глазах. */}
      {showStickyCta && (
        <div
          className="lg:hidden fixed inset-x-0 z-30 px-4 pt-2 pb-3 bg-app/95 backdrop-blur border-t border-borderc/60"
          style={{ bottom: 'calc(64px + env(safe-area-inset-bottom))' }}
        >
          <div className="flex items-center gap-3">
            {remaining != null && remaining > 0 && (
              <div className="shrink-0 leading-tight">
                <div className="text-[10px] uppercase tracking-wide text-text3">К доплате</div>
                <Money value={remaining} size="sm" className="text-text1" />
              </div>
            )}
            {isPendingClosureDirector ? (
              <Button size="lg" block disabled={pending} onClick={doApprove} className="flex-1">
                {pending ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <>Закрыть заказ <ChevronRight size={18} /></>
                )}
              </Button>
            ) : next ? (
              <Button size="lg" block disabled={pending} onClick={() => doStageChange(next)} className="flex-1">
                {pending ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <>Передать в «{STAGE_LABEL[next]}» <ChevronRight size={18} /></>
                )}
              </Button>
            ) : null}
          </div>
        </div>
      )}
    </>
  );
}
