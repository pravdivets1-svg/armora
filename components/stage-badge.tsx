// Бейдж этапа на новой дизайн-системе.

import type { Stage } from '@prisma/client';
import { STAGE_LABEL, stageGroup, type StageGroup } from '@/lib/labels';
import { Pill } from '@/components/ds/pill';

type Tone = 'neutral' | 'accent' | 'ok' | 'warn' | 'bad';

const TONE: Record<StageGroup, Tone> = {
  new:    'neutral',
  survey: 'accent',
  prod:   'warn',
  ready:  'ok',
  closed: 'neutral',
};

export function StageBadge({ stage }: { stage: Stage }) {
  return <Pill tone={TONE[stageGroup(stage)]}>{STAGE_LABEL[stage]}</Pill>;
}
