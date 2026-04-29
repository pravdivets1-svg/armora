// Текстовые лейблы для ролей и этапов — в одном месте, чтобы переводы не разбежались.

import type { Role, Stage } from '@prisma/client';

export const ROLE_LABEL: Record<Role, string> = {
  director:  'Директор',
  manager:   'Менеджер',
  surveyor:  'Замерщик',
  installer: 'Установщик',
};

export const STAGE_LABEL: Record<Stage, string> = {
  new:              'Новая',
  survey_scheduled: 'Замер назначен',
  survey_done:      'Замер сделан, аванс получен',
  production:       'В производстве',
  ready_to_install: 'Готова к установке',
  installed:        'Установлена',
  closed:           'Закрыта',
};

export const STAGE_ORDER: Stage[] = [
  'new',
  'survey_scheduled',
  'survey_done',
  'production',
  'ready_to_install',
  'installed',
  'closed',
];

// Группировка для CSS-классов бейджа
export type StageGroup = 'new' | 'survey' | 'prod' | 'ready' | 'closed';

export function stageGroup(stage: Stage): StageGroup {
  switch (stage) {
    case 'new':              return 'new';
    case 'survey_scheduled':
    case 'survey_done':      return 'survey';
    case 'production':       return 'prod';
    case 'ready_to_install':
    case 'installed':        return 'ready';
    case 'closed':           return 'closed';
  }
}
