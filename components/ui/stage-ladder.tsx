'use client';

import { useTransition } from 'react';
import { Check, Lock } from 'lucide-react';
import type { Role, Stage } from '@prisma/client';
import { STAGE_LABEL, STAGE_ORDER } from '@/lib/labels';
import { isStageTransitionAllowed } from '@/lib/stage-transitions';

export function StageLadder({
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
    <ol className="space-y-0.5" role="list" aria-label="Все этапы заказа">
      {STAGE_ORDER.map((s, i) => {
        const isCurrent = s === current;
        const isPast = i < currentIdx;
        const allowed = !disabled && !!onStageClick && isStageTransitionAllowed(role, current, s) && !isCurrent;
        const interactive = allowed && !pending;

        const base = 'flex items-center gap-3 h-10 px-3 rounded-md text-[13.5px] w-full text-left transition-colors duration-fast';
        let look: string;
        let icon: React.ReactNode;
        if (isCurrent) {
          look = 'bg-accent-soft text-accent font-medium';
          icon = <span className="w-2 h-2 rounded-full bg-accent animate-pulse shrink-0" />;
        } else if (isPast) {
          look = 'text-text2';
          icon = <Check size={14} className="text-ok2 shrink-0" />;
        } else if (interactive) {
          look = 'text-text2 hover:bg-subtle hover:text-text1';
          icon = <span className="w-2 h-2 rounded-full border border-text3 shrink-0" />;
        } else {
          look = 'text-text3';
          icon = <Lock size={12} className="text-text3 shrink-0" />;
        }

        const inner = (
          <>
            {icon}
            <span className="flex-1 truncate">{STAGE_LABEL[s]}</span>
            {isCurrent && <span className="text-meta text-accent uppercase tracking-wide">текущий</span>}
          </>
        );

        if (interactive) {
          return (
            <li key={s}>
              <button
                type="button"
                onClick={() => start(() => onStageClick!(s))}
                className={`${base} ${look}`}
              >
                {inner}
              </button>
            </li>
          );
        }
        return (
          <li key={s}>
            <div className={`${base} ${look} cursor-default`} aria-current={isCurrent ? 'step' : undefined}>
              {inner}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
