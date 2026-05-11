import type { Stage } from '@prisma/client';
import { STAGE_ORDER } from '@/lib/labels';

const COMPACT: Record<Stage, string> = {
  new:              'Новая',
  survey_scheduled: 'Замер',
  survey_done:      'Аванс',
  production:       'Производство',
  ready_to_install: 'К установке',
  installed:        'Установлена',
  pending_closure:  'На закрытие',
  closed:           'Закрыт',
};

export function ProgressChip({
  stage,
  daysInStage,
}: {
  stage: Stage;
  daysInStage?: number;
}) {
  const idx = STAGE_ORDER.indexOf(stage);
  const isClosed = stage === 'closed';
  const isPending = stage === 'pending_closure';

  const durationCls =
    daysInStage == null ? 'text-text3'
    : daysInStage > 14 ? 'text-bad2'
    : daysInStage > 5  ? 'text-warn2'
    : 'text-text3';

  return (
    <div className="inline-flex items-center gap-2">
      <span className="inline-flex items-center gap-1" aria-label={`Этап ${idx + 1} из ${STAGE_ORDER.length}`}>
        {STAGE_ORDER.map((_, i) => {
          let cls = 'bg-borderc';
          if (i < idx) cls = isClosed ? 'bg-text3' : 'bg-accent';
          else if (i === idx) {
            cls = isPending
              ? 'bg-accent ring-2 ring-accent-soft animate-pulse'
              : 'bg-card border border-accent';
          }
          return <span key={i} className={`w-1.5 h-1.5 rounded-full shrink-0 ${cls}`} />;
        })}
      </span>
      <span className="text-meta text-text2 truncate">
        {COMPACT[stage]}
        {daysInStage != null && stage !== 'closed' && (
          <span className={`ml-1.5 tabular-nums ${durationCls}`}>· {daysInStage}д в этапе</span>
        )}
      </span>
    </div>
  );
}
