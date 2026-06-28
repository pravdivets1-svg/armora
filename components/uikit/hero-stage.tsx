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
  nextEvent,
  onStageChange,
  onApproveClosure,
}: {
  current: Stage;
  role: Role;
  enteredAt: Date | string;
  enteredBy?: string;
  nextEvent?: string | null;
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
    isPendingClosureAsDirector ? 'glass-surface-strong ring-2 ring-accent/30'
    : isPendingClosureOther    ? 'glass-surface-strong ring-2 ring-warn2/30'
    : 'glass-surface-strong';

  return (
    <section className={`rounded-2xl overflow-hidden ${cardCls}`}>
      {/* Шапка этапа — цветной индиго/фиолет градиент + сегментный прогресс по этапам */}
      <div className="bg-gradient-to-br from-accent/[0.12] via-violet/[0.05] to-transparent px-4 sm:px-5 pt-4 pb-3.5">
        <div className="flex items-center justify-between gap-3 mb-3">
          <StagePill stage={current} daysInStage={days} size="md" />
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="text-meta text-text2 hover:text-text1 transition-colors inline-flex items-center gap-0.5 shrink-0"
          >
            Все этапы <ChevronRight size={13} />
          </button>
        </div>

        {/* Сегментный прогресс — визуально показывает позицию в цепочке этапов */}
        <div className="flex items-center gap-1" aria-hidden>
          {STAGE_ORDER.map((s, i) => (
            <span
              key={s}
              className={`h-1.5 flex-1 rounded-full ${i <= idx ? 'bg-accent' : 'bg-borderc/70'}`}
            />
          ))}
        </div>

        <div className="mt-2 flex items-center justify-between gap-3 text-meta">
          <span className="text-text3 tabular-nums shrink-0">Этап {idx + 1} из {total}</span>
          {nextEvent && (
            <span className="text-text2 tabular-nums truncate text-right">{nextEvent}</span>
          )}
        </div>
      </div>

      {/* Действие по этапу. На мобиле кнопка-переход живёт в нижнем доке, поэтому её
          блок скрыт и НЕ оставляет пустого места; текстовые статусы видны всегда. */}
      {isPendingClosureAsDirector && onApproveClosure ? (
        <div className="hidden lg:block px-5 pb-4">
          <Button
            variant="accent" size="lg" block disabled={pending}
            onClick={() => start(() => { void onApproveClosure(); })}
          >
            Закрыть заказ <ChevronRight size={18} />
          </Button>
        </div>
      ) : isPendingClosureOther ? (
        <div className="px-4 sm:px-5 pb-4">
          <p className="text-[14px] text-warn2 font-medium">Ждёт подтверждения директора</p>
        </div>
      ) : next ? (
        <div className="hidden lg:block px-5 pb-4">
          <Button
            variant="accent" size="lg" block disabled={pending}
            onClick={() => start(() => { void onStageChange(next); })}
          >
            Передать в «{STAGE_LABEL[next]}» <ChevronRight size={18} />
          </Button>
        </div>
      ) : current === 'closed' ? (
        <div className="px-4 sm:px-5 pb-4">
          <p className="text-[14px] text-text3">Заказ закрыт</p>
        </div>
      ) : (
        <div className="px-4 sm:px-5 pb-4">
          <p className="text-[14px] text-text3">Нет доступных переходов</p>
        </div>
      )}

      {/* Директор: закрыть заказ напрямую из любой не-closed стадии (секондари-линк). */}
      {role === 'director'
        && current !== 'closed'
        && current !== 'pending_closure'
        && onApproveClosure && (
        <div className="px-4 sm:px-5 pb-3.5 -mt-1">
          <button
            type="button"
            onClick={() => {
              if (confirm('Закрыть заказ напрямую без подтверждения этапов?')) {
                start(() => { void onApproveClosure(); });
              }
            }}
            disabled={pending}
            className="block w-full text-meta text-text3 hover:text-text1
                       transition-colors text-center underline-offset-2 hover:underline
                       disabled:opacity-50"
          >
            или закрыть напрямую
          </button>
        </div>
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
