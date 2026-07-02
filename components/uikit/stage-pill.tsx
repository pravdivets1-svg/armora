import type { Stage } from '@prisma/client';
import { STAGE_LABEL } from '@/lib/labels';

// Текст пилюли — тёмные .text-варианты статусных токенов (AA на soft-фонах);
// точка-индикатор остаётся на ярком DEFAULT. Правило внутри цветовой пары:
// «запланировано» — точка-КОЛЬЦО, «сделано» — залитая (иначе survey_scheduled
// и survey_done в списке неотличимы без чтения текста). new — фиолет: свежие
// заказы семантически самые «горячие», серый делал их самыми выключенными.
const STYLE: Record<Stage, { bg: string; text: string; dot: string; ring?: boolean; pulse?: boolean }> = {
  new:              { bg: 'bg-violet-soft', text: 'text-violet',     dot: 'bg-violet' },
  survey_scheduled: { bg: 'bg-info2-soft',  text: 'text-info2-text', dot: 'ring-info2', ring: true },
  survey_done:      { bg: 'bg-info2-soft',  text: 'text-info2-text', dot: 'bg-info2' },
  production:       { bg: 'bg-warn2-soft',  text: 'text-warn2-text', dot: 'bg-warn2' },
  ready_to_install: { bg: 'bg-ok2-soft',    text: 'text-ok2-text',   dot: 'ring-ok2', ring: true },
  installed:        { bg: 'bg-ok2-soft',    text: 'text-ok2-text',   dot: 'bg-ok2' },
  pending_closure:  { bg: 'bg-accent-soft', text: 'text-accent',     dot: 'bg-accent', pulse: true },
  closed:           { bg: 'bg-subtle',      text: 'text-text3',      dot: 'bg-text3' },
};

export function StagePill({
  stage,
  daysInStage,
  size = 'sm',
}: {
  stage: Stage;
  daysInStage?: number;
  size?: 'sm' | 'md';
}) {
  const s = STYLE[stage];
  // Счётчик дней: тёмные text-токены вместо opacity (opacity-60 поверх статусного
  // цвета давала контраст <2:1 — на улице счётчик был невидим).
  const dur =
    daysInStage == null || stage === 'closed' ? null
    : daysInStage > 14 ? { v: `${daysInStage}д`, cls: 'text-bad2-text' }
    : daysInStage > 5  ? { v: `${daysInStage}д`, cls: 'text-warn2-text' }
    : { v: `${daysInStage}д`, cls: 'text-text2' };

  const cls = size === 'md'
    ? 'h-8 px-3 text-[13.5px] gap-2'
    : 'h-6 px-2 text-[12px] gap-1.5';
  const dot = size === 'md' ? 'w-2 h-2' : 'w-1.5 h-1.5';

  return (
    <span className={`inline-flex items-center rounded-md font-medium whitespace-nowrap ${s.bg} ${s.text} ${cls}`}>
      <span
        className={`shrink-0 rounded-full ${dot}
                    ${s.ring ? `ring-[1.5px] ring-inset bg-transparent ${s.dot}` : s.dot}
                    ${s.pulse ? 'animate-pulse' : ''}`}
      />
      <span className="truncate">{STAGE_LABEL[stage]}</span>
      {dur && <span className={`tabular-nums ${dur.cls}`}>· {dur.v}</span>}
    </span>
  );
}
