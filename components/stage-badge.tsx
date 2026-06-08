// Минималистичные бейджи этапов.
// Принцип: один сильный action-state (pending_closure для директора),
// остальные — тихие dot+text без заливки.

import type { Stage } from '@prisma/client';
import { STAGE_LABEL, stageGroup } from '@/lib/labels';

const DOT = {
  new:     'bg-text3',
  survey:  'bg-info2',
  prod:    'bg-warn2',
  ready:   'bg-ok2',
  pending: 'bg-accent',
  closed:  'bg-text3/60',
} as const;

const TEXT = {
  new:     'text-text2',
  survey:  'text-info2',
  prod:    'text-warn2',
  ready:   'text-ok2',
  pending: 'text-accent',
  closed:  'text-text3',
} as const;

// Заливка — только для pending_closure (action-item директору).
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

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md font-medium whitespace-nowrap
                  ${BG[g]} ${TEXT[g]} ${pad}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${DOT[g]} ${g === 'pending' ? 'animate-pulse' : ''}`} />
      {STAGE_LABEL[stage]}
    </span>
  );
}
