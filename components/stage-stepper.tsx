'use client';

// Горизонтальный stepper этапов заказа.
// Источник истины — prop `current` (приходит с сервера через RSC после
// revalidatePath). Локальный state для оптимистичного UI ведётся в форме
// (order-form.tsx), здесь компонент чисто презентационный.
//
// Раньше тут был framer-motion layoutId="stage-marker" со spring-анимацией,
// но он давал баг при RSC-перерендере: при смене current motion.span "висел"
// на старом сегменте и не переезжал. Заменили на обычный CSS background —
// стабильно и без рассинхрона.
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
      className="flex items-stretch overflow-x-auto rounded-xl border border-borderc bg-card
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
          'flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] font-medium whitespace-nowrap shrink-0 transition-colors';
        let look: string;
        if (isCurrent) {
          look = 'bg-accent text-white';
        } else if (isPast) {
          look = 'text-text2';
        } else if (interactive) {
          look = 'text-text3 hover:text-text1 hover:bg-subtle/70';
        } else {
          look = 'text-text3/60';
        }

        const inner = (
          <>
            {isPast && <Check size={11} className="text-ok2 shrink-0" />}
            {!isPast && !isCurrent && !interactive && <Lock size={10} className="text-text3/60 shrink-0" />}
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
