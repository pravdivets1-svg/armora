'use server';

import { requireRole } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';

export type SurveyorReminderResult = { ok: true } | { ok: false; error: string };

// Вкл/выкл напоминания замерщику (баннер на экране календаря). Только директор.
export async function saveSurveyorReminderAction(
  enabled: boolean,
): Promise<SurveyorReminderResult> {
  try {
    await requireRole(['director']);
  } catch {
    return { ok: false, error: 'Только директор' };
  }
  await prisma.controlReminderConfig.upsert({
    where: { id: 'default' },
    update: { surveyorDataReminderEnabled: enabled },
    create: { id: 'default', surveyorDataReminderEnabled: enabled },
  });
  return { ok: true };
}
