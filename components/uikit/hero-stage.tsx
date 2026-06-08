'use client';

import { useState, useTransition } from 'react';
import { ChevronRight } from 'lucide-react';
import type { Role, Stage } from '@prisma/client';
import { STAGE_LABEL, STAGE_ORDER } from '@/lib/labels';
import { isStageTransitionAllowed } from '@/lib/stage-transitions';
import { Button } from './button';
import { Sheet } from './sheet';
import { StagePill } from './stage-pill';
import { StageLadder } from './stage-ladder';

function nextAllowed(current: Stage, role: Role): Stage | null {
  const idx = STAGE_ORDER.indexOf(current);
  const next = STAGE_ORDER[idx + 1];
  if (!next) return null;
  return isStageTransitionAllowed(role, current, next) ? next : null;
}

function daysSince(d: Date | string): number {
  const t = typeof d === 'string' ? new Date(d).getTime() : d.getTime();
  return Math.max(0, Math.floor((Date.now() - t) / (1000 * 60 * 60 * 24)));
}

export function HeroStage({
  current,
  role,
  enteredAt,
  onStageChange,
  onApproveClosure,
}: {
  current: Stage;
  role: Role;
  enteredAt: Date | string;
  enteredBy?: string;
  onStageChange: (next: Stage) => Promise<void> | void;
  onApproveClosure?: () => Promise<void> | void;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  const idx = STAGE_ORDER.indexOf(current);
  const total = STAGE_ORDER.length;
  const next = nextAllowed(current, role);
  const isPendingClosureAsDirector = current === 'pending_closure' && role === 'director';
  const isPendingClosureOther = current === 'pending_closure' && role !== 'director';
  const days = daysSince(enteredAt);

  const cardCls =
    isPendingClosureAsDirector ? 'bg-accent/[0.06] border-accent/25'
    : isPendingClosureOther    ? 'bg-warn2/[0.07] border-warn2/25'
    : 'bg-card border-borderc';

  return (
    <section className={`rounded-md border ${cardCls} p-4 sm:p-5`}>
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <StagePill stage={current} daysInStage={days} size="md" />
          <span className="text-meta text-text3 tabular-nums shrink-0">
            · {idx + 1}/{total}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-meta text-text2 hover:text-text1 transition-colors inline-flex items-center gap-1 shrink-0"
        >
          Все этапы
        </button>
      </div>

      {isPendingClosureAsDirector && onApproveClosure ? (
        <Button
          variant="accent"
          size="lg"
          block
          disabled={pending}
          onClick={() => start(() => { void onApproveClosure(); })}
        >
          Закрыть заказ <ChevronRight size={18} />
        </Button>
      ) : isPendingClosureOther ? (
        <p className="text-[14px] text-warn2 font-medium">
          Ждёт подтверждения директора
        </p>
      ) : next ? (
        <Button
          variant="accent"
          size="lg"
          block
          disabled={pending}
          onClick={() => start(() => { void onStageChange(next); })}
        >
          Передать в «{STAGE_LABEL[next]}» <ChevronRight size={18} />
        </Button>
      ) : current === 'closed' ? (
        <p className="text-[14px] text-text3">Заказ закрыт</p>
      ) : (
        <p className="text-[14px] text-text3">Нет доступных переходов</p>
      )}

      <Sheet open={open} onClose={() => setOpen(false)} title="Этапы заказа">
        <StageLadder
          current={current}
          role={role}
          onStageClick={(s) => {
            setOpen(false);
            start(() => { void onStageChange(s); });
          }}
        />
      </Sheet>
    </section>
  );
}
