// Минималистичные бейджи: цветной dot + текст.
// Без рамок, без заливок — только цвет и точка.

import type { Stage } from '@prisma/client';
import { STAGE_LABEL, stageGroup } from '@/lib/labels';

const DOT = {
  new:     'bg-ink-400',
  survey:  'bg-blue-500',
  prod:    'bg-amber-500',
  ready:   'bg-emerald-500',
  pending: 'bg-violet-500',
  closed:  'bg-ink-300',
} as const;

const TEXT = {
  new:     'text-ink-700',
  survey:  'text-blue-700',
  prod:    'text-amber-800',
  ready:   'text-emerald-700',
  pending: 'text-violet-700',
  closed:  'text-ink-400',
} as const;

const BG = {
  new:     'bg-ink-900/[0.04]',
  survey:  'bg-blue-500/10',
  prod:    'bg-amber-500/10',
  ready:   'bg-emerald-500/10',
  pending: 'bg-violet-500/10',
  closed:  'bg-ink-900/[0.03]',
} as const;

export function StageBadge({
  stage,
  size = 'sm',
}: {
  stage: Stage;
  size?: 'sm' | 'md';
}) {
  const g = stageGroup(stage);
  const pad = size === 'md' ? 'px-3 py-1 text-[13px]' : 'px-2.5 py-0.5 text-xs';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-medium whitespace-nowrap ${BG[g]} ${TEXT[g]} ${pad}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${DOT[g]}`} />
      {STAGE_LABEL[stage]}
    </span>
  );
}
