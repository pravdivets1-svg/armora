'use client';

// Горизонтальный stepper этапов заказа.
// Все 8 этапов как сегменты: пройденные/текущий/будущие.
// Клик по доступному этапу — переводит туда (через скрытое поле в форме + submit).
//
// Стиль: тонкий ряд chip'ов, текущий заполнен accent, прошедшие — ink-700,
// недоступные для роли — ink-300 (clickable: false).
//
// Машина переходов: используем тот же allowed(role, from, to) что и на сервере.

import { useTransition } from 'react';
import type { Stage, Role } from '@prisma/client';
import { Check, Lock } from 'lucide-react';
import { STAGE_LABEL, STAGE_ORDER } from '@/lib/labels';
import { isStageTransitionAllowed } from '@/lib/stage-transitions';

const COMPACT_LABEL: Record<Stage, string> = {
  new:              'Новая',
  survey_scheduled: 'Замер',
  survey_done:      'Аванс',
  production:       'Производство',
  ready_to_install: 'К установке',
  installed:        'Установлена',
  pending_closure:  'На закрытие',
  closed:           'Закрыт',
};

export default function StageStepper({
  current,
  role,
  onStageClick,
  disabled,
}: {
  current: Stage;
  role: Role;
  onStageClick?: (next: Stage) => void;
  disabled?: boolean;
}) {
  const [pending, start] = useTransition();
  const currentIdx = STAGE_ORDER.indexOf(current);

  return (
    <div
      className="flex items-stretch overflow-x-auto rounded-lg border border-line bg-white
                 -mx-1 px-1 py-1 gap-0.5 scrollbar-none"
      role="tablist"
      aria-label="Этап заказа"
    >
      {STAGE_ORDER.map((s, i) => {
        const isCurrent = s === current;
        const isPast = i < currentIdx;
        const allowed = !disabled && onStageClick && isStageTransitionAllowed(role, current, s) && s !== current;
        const interactive = !!allowed && !pending;

        const base =
          'relative flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium whitespace-nowrap shrink-0';
        let look: string;
        if (isCurrent) {
          look = 'bg-accent text-white';
        } else if (isPast) {
          look = 'text-ink-700';
        } else if (interactive) {
          look = 'text-ink-500 hover:text-ink-900 hover:bg-ink-900/[0.04]';
        } else {
          look = 'text-ink-300';
        }

        const inner = (
          <>
            {isPast && <Check size={11} className="text-ok shrink-0" />}
            {!isPast && !isCurrent && !interactive && <Lock size={10} className="text-ink-300 shrink-0" />}
            {!isPast && !isCurrent && interactive && (
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-current opacity-40 shrink-0" />
            )}
            <span>{COMPACT_LABEL[s]}</span>
          </>
        );

        if (interactive) {
          return (
            <button
              key={s}
              type="button"
              role="tab"
              aria-current={isCurrent ? 'step' : undefined}
              onClick={() => start(() => { onStageClick(s); })}
              className={`${base} ${look}`}
            >
              {inner}
            </button>
          );
        }
        return (
          <span
            key={s}
            role="tab"
            aria-current={isCurrent ? 'step' : undefined}
            className={`${base} ${look} cursor-default`}
            title={!isCurrent && !isPast ? STAGE_LABEL[s] : undefined}
          >
            {inner}
          </span>
        );
      })}
    </div>
  );
}
