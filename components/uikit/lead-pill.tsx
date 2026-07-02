import type { LeadStage } from '@prisma/client';
import { LEAD_STAGE_LABEL } from '@/lib/lead-labels';

// Текст — тёмные .text-варианты статусов (AA на soft-фонах), точка — яркий DEFAULT.
const STYLE: Record<LeadStage, { bg: string; text: string; dot: string; pulse?: boolean }> = {
  new:       { bg: 'bg-accent-soft', text: 'text-accent',     dot: 'bg-accent', pulse: true },
  contacted: { bg: 'bg-info2-soft',  text: 'text-info2-text', dot: 'bg-info2' },
  scheduled: { bg: 'bg-warn2-soft',  text: 'text-warn2-text', dot: 'bg-warn2' },
  converted: { bg: 'bg-ok2-soft',    text: 'text-ok2-text',   dot: 'bg-ok2' },
  rejected:  { bg: 'bg-subtle',      text: 'text-text3',      dot: 'bg-text3' },
  spam:      { bg: 'bg-bad2-soft',   text: 'text-bad2-text',  dot: 'bg-bad2' },
};

export function LeadPill({
  stage,
  size = 'sm',
}: {
  stage: LeadStage;
  size?: 'sm' | 'md';
}) {
  const s = STYLE[stage];
  const cls = size === 'md' ? 'h-8 px-3 text-[13.5px] gap-2' : 'h-6 px-2 text-[12px] gap-1.5';
  const dot = size === 'md' ? 'w-2 h-2' : 'w-1.5 h-1.5';
  return (
    <span className={`inline-flex items-center rounded-md font-medium whitespace-nowrap ${s.bg} ${s.text} ${cls}`}>
      <span className={`shrink-0 rounded-full ${dot} ${s.dot} ${s.pulse ? 'animate-pulse' : ''}`} />
      <span className="truncate">{LEAD_STAGE_LABEL[stage]}</span>
    </span>
  );
}
