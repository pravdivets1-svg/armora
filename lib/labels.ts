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
  pending_closure:  'Ожидает закрытия',
  closed:           'Закрыта',
};

// Клиентские названия этапов для публичной страницы /order/[token]:
// без внутреннего жаргона CRM («Новая», «Ожидает закрытия»).
export const STAGE_LABEL_PUBLIC: Record<Stage, string> = {
  new:              'Заказ принят',
  survey_scheduled: 'Замер назначен',
  survey_done:      'Замер выполнен',
  production:       'Дверь в производстве',
  ready_to_install: 'Готова к установке',
  installed:        'Дверь установлена',
  pending_closure:  'Завершаем заказ',
  closed:           'Заказ завершён',
};

export const STAGE_ORDER: Stage[] = [
  'new',
  'survey_scheduled',
  'survey_done',
  'production',
  'ready_to_install',
  'installed',
  'pending_closure',
  'closed',
];

// Группировка для CSS-классов бейджа
export type StageGroup = 'new' | 'survey' | 'prod' | 'ready' | 'pending' | 'closed';

export function stageGroup(stage: Stage): StageGroup {
  switch (stage) {
    case 'new':              return 'new';
    case 'survey_scheduled':
    case 'survey_done':      return 'survey';
    case 'production':       return 'prod';
    case 'ready_to_install':
    case 'installed':        return 'ready';
    case 'pending_closure':  return 'pending';
    case 'closed':           return 'closed';
  }
}
