// Отключить пользователя (мягкое удаление: is_active = false).
// Запуск: npm run user:disable -- email@example.com
//
// Реальное удаление НЕ делаем, чтобы не порвать связи с прошлыми заказами.

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const [email] = process.argv.slice(2);
  if (!email) {
    console.error('Использование: npm run user:disable -- EMAIL');
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`Пользователь ${email} не найден.`);
    process.exit(1);
  }

  await prisma.user.update({ where: { email }, data: { isActive: false } });
  console.log(`✅ Отключён: ${email}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
