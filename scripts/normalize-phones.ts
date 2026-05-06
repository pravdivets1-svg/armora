// One-shot скрипт для нормализации существующих телефонов в БД.
// Запуск:  npx tsx scripts/normalize-phones.ts
//
// Безопасно: пропускает уже нормализованные значения; пишет, что меняет.

import { PrismaClient } from '@prisma/client';
import { normalizePhone } from '../lib/format';

const prisma = new PrismaClient();

async function main() {
  let changed = 0;
  let kept = 0;

  // Orders
  const orders = await prisma.order.findMany({ select: { id: true, clientPhone: true } });
  for (const o of orders) {
    const next = normalizePhone(o.clientPhone);
    if (next !== o.clientPhone) {
      await prisma.order.update({ where: { id: o.id }, data: { clientPhone: next } });
      console.log(`order ${o.id.slice(0, 8)}: "${o.clientPhone}" -> "${next}"`);
      changed++;
    } else kept++;
  }

  // Leads
  const leads = await prisma.lead.findMany({ select: { id: true, clientPhone: true } });
  for (const l of leads) {
    const next = normalizePhone(l.clientPhone);
    if (next !== l.clientPhone) {
      await prisma.lead.update({ where: { id: l.id }, data: { clientPhone: next } });
      console.log(`lead ${l.id.slice(0, 8)}: "${l.clientPhone}" -> "${next}"`);
      changed++;
    } else kept++;
  }

  // Users
  const users = await prisma.user.findMany({ select: { id: true, phone: true } });
  for (const u of users) {
    if (!u.phone) continue;
    const next = normalizePhone(u.phone);
    if (next !== u.phone) {
      await prisma.user.update({ where: { id: u.id }, data: { phone: next } });
      console.log(`user ${u.id.slice(0, 8)}: "${u.phone}" -> "${next}"`);
      changed++;
    } else kept++;
  }

  console.log(`\nDone. changed=${changed}, kept=${kept}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
