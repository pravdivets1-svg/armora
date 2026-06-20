'use server';

import { requireRole } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const InputSchema = z.object({
  productionStaleEnabled:     z.boolean(),
  productionStaleDays:        z.number().int().min(1).max(365),
  installedNoCloseEnabled:    z.boolean(),
  installedNoCloseDays:       z.number().int().min(1).max(365),
  pendingClosureStaleEnabled: z.boolean(),
  pendingClosureStaleDays:    z.number().int().min(1).max(365),
});

export type ControlRemindersInput = z.infer<typeof InputSchema>;
export type ControlRemindersResult = { ok: true } | { ok: false; error: string };

export async function saveControlRemindersAction(
  input: ControlRemindersInput,
): Promise<ControlRemindersResult> {
  try {
    await requireRole(['director']);
  } catch {
    return { ok: false, error: 'Только директор' };
  }
  const parsed = InputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Некорректные значения' };
  }
  await prisma.controlReminderConfig.upsert({
    where: { id: 'default' },
    update: parsed.data,
    create: { id: 'default', ...parsed.data },
  });
  return { ok: true };
}
