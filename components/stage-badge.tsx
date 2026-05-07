// Минималистичные бейджи этапов.
// Принцип: один сильный action-state (pending_closure для директора),
// остальные — тихие dot+text без заливки. Это снимает "новогоднюю гирлянду"
// в таблицах и делает иерархию читаемой: важное — выделено, обычное — тихое.

import type { Stage } from '@prisma/client';
import { STAGE_LABEL, stageGroup } from '@/lib/labels';

// Цвет точки и текста по группе этапа
const DOT = {
  new:     'bg-ink-400',
  survey:  'bg-blue-500',
  prod:    'bg-amber-500',
  ready:   'bg-emerald-500',
  pending: 'bg-accent',   // accent = #2563eb (синий)
  closed:  'bg-ink-300',
} as const;

const TEXT = {
  new:     'text-ink-700',
  survey:  'text-blue-700',
  prod:    'text-amber-800',
  ready:   'text-emerald-700',
  pending: 'text-accent',
  closed:  'text-ink-400',
} as const;

// Заливка — только для pending_closure (action item для директора).
// Для остальных — прозрачный фон, читается как "тихий статус".
const BG = {
  new:     '',
  survey:  '',
  prod:    '',
  ready:   '',
  pending: 'bg-accent/10',
  closed:  '',
} as const;

export function StageBadge({
  stage,
  size = 'sm',
}: {
  stage: Stage;
  size?: 'sm' | 'md';
}) {
  const g = stageGroup(stage);
  const pad =
    size === 'md'
      ? 'px-2.5 py-1 text-[13px]'
      : 'px-1.5 py-0.5 text-[12px]';
  const ring = g === 'pending' ? '' : ''; // оставлено для будущих state

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md font-medium whitespace-nowrap
                  ${BG[g]} ${TEXT[g]} ${pad} ${ring}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${DOT[g]} ${g === 'pending' ? 'animate-pulse' : ''}`} />
      {STAGE_LABEL[stage]}
    </span>
  );
}
