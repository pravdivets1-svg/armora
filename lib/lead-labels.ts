// Лейблы и группы для статусов заявок (Lead).
// Держим отдельно от lib/labels.ts (там Order/Stage), но симметрично.

import type { LeadStage } from '@prisma/client';

export const LEAD_STAGE_LABEL: Record<LeadStage, string> = {
  new:       'Новая',
  contacted: 'Связались',
  scheduled: 'На замер',
  converted: 'В заказе',
  rejected:  'Отказ',
  spam:      'Спам',
};

export const LEAD_STAGE_ORDER: LeadStage[] = [
  'new',
  'contacted',
  'scheduled',
  'converted',
  'rejected',
  'spam',
];

// CSS-классы для бейджа: тон в духе stage-badge для Order
export const LEAD_STAGE_TONE: Record<LeadStage, string> = {
  new:       'bg-accent text-white',
  contacted: 'bg-blue-100 text-blue-800',
  scheduled: 'bg-amber-100 text-amber-800',
  converted: 'bg-ok/10 text-ok',
  rejected:  'bg-ink-900/[0.06] text-ink-700',
  spam:      'bg-bad/10 text-bad',
};
