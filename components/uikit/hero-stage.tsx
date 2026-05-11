'use client';

import { useState, useTransition } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import type { Role, Stage } from '@prisma/client';
import { STAGE_LABEL, STAGE_ORDER } from '@/lib/labels';
import { isStageTransitionAllowed } from '@/lib/stage-transitions';
import { Button } from './button';
import { Sheet } from './sheet';
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
  enteredBy,
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

  const railFill = ((idx + 1) / total) * 100;
  const days = daysSince(enteredAt);

  const heroBg =
    isPendingClosureAsDirector ? 'bg-accent-soft border-accent/30'
    : isPendingClosureOther    ? 'bg-warn2-soft border-warn2/30'
    : 'bg-card border-borderc';

  return (
    <section className={`rounded-lg border ${heroBg} p-5 sm:p-6`}>
      <p className="text-meta uppercase tracking-wide text-text3 mb-1">
        Этап {idx + 1} из {total}
      </p>
      <h2 className="text-display text-text1 mb-3">{STAGE_LABEL[current]}</h2>

      <div className="relative h-1.5 bg-subtle rounded-md mb-2 overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-accent rounded-md transition-all duration-slow ease-soft"
          style={{ width: `${railFill}%` }}
        />
      </div>
      <p className="text-meta text-text3 mb-5 tabular-nums">
        {days === 0 ? 'Перешёл сюда сегодня' : `Перешёл сюда ${days} ${days === 1 ? 'день' : days < 5 ? 'дня' : 'дней'} назад`}
        {enteredBy && <> · <span className="font-mono">{enteredBy}</span></>}
      </p>

      <div className="flex flex-col gap-2">
        {isPendingClosureAsDirector && onApproveClosure ? (
          <Button
            size="lg"
            block
            disabled={pending}
            onClick={() => start(() => { void onApproveClosure(); })}
          >
            Закрыть заказ
            <ChevronRight size={18} />
          </Button>
        ) : isPendingClosureOther ? (
          <div className="text-meta text-warn2 font-medium py-2">
            Ожидает действия директора
          </div>
        ) : next ? (
          <Button
            size="lg"
            block
            disabled={pending}
            onClick={() => start(() => { void onStageChange(next); })}
          >
            Передать в «{STAGE_LABEL[next]}»
            <ChevronRight size={18} />
          </Button>
        ) : current === 'closed' ? (
          <div className="text-meta text-text3 font-medium py-2">Заказ закрыт</div>
        ) : (
          <div className="text-meta text-text3 font-medium py-2">Доступных переходов нет</div>
        )}

        <button
          type="button"
          onClick={() => setOpen(true)}
          className="self-start inline-flex items-center gap-1.5 text-meta text-text2 hover:text-text1 transition-colors"
        >
          <ChevronDown size={14} /> Все этапы
        </button>
      </div>

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
