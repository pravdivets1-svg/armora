'use client';

// Горизонтальный stepper этапов заказа с layout-анимацией.
// motion.span с layoutId="stage-marker" — Framer плавно переезжает между
// этапами при смене current, давая ощущение "стрелка движется по timeline".
//
// Машина переходов: используем тот же allowed(role, from, to) что и на сервере.

import { useTransition } from 'react';
import type { Stage, Role } from '@prisma/client';
import { Check, Lock } from 'lucide-react';
import { motion, LayoutGroup } from 'framer-motion';
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
    <LayoutGroup id="stage-stepper">
      <div
        className="flex items-stretch overflow-x-auto rounded-xl border border-line bg-white
                   -mx-1 px-1 py-1 gap-0.5 scrollbar-none shadow-soft"
        role="tablist"
        aria-label="Этап заказа"
      >
        {STAGE_ORDER.map((s, i) => {
          const isCurrent = s === current;
          const isPast = i < currentIdx;
          const allowed = !disabled && onStageClick && isStageTransitionAllowed(role, current, s) && s !== current;
          const interactive = !!allowed && !pending;

          const base =
            'relative flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] font-medium whitespace-nowrap shrink-0';
          let look: string;
          if (isCurrent) {
            look = 'text-white';
          } else if (isPast) {
            look = 'text-ink-700';
          } else if (interactive) {
            look = 'text-ink-500 hover:text-ink-900 hover:bg-ink-900/[0.04]';
          } else {
            look = 'text-ink-300';
          }

          const inner = (
            <>
              {isCurrent && (
                <motion.span
                  layoutId="stage-marker"
                  className="absolute inset-0 rounded-lg bg-accent shadow-accent-glow"
                  transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                />
              )}
              <span className="relative flex items-center gap-1.5">
                {isPast && <Check size={11} className="text-ok shrink-0" />}
                {!isPast && !isCurrent && !interactive && <Lock size={10} className="text-ink-300 shrink-0" />}
                {!isPast && !isCurrent && interactive && (
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-current opacity-40 shrink-0" />
                )}
                <span>{COMPACT_LABEL[s]}</span>
              </span>
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
    </LayoutGroup>
  );
}
