// Сменить пароль пользователя.
// Запуск: npm run user:set-password -- email@example.com новый-пароль

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const [email, password] = process.argv.slice(2);
  if (!email || !password) {
    console.error('Использование: npm run user:set-password -- EMAIL НОВЫЙ_ПАРОЛЬ');
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`Пользователь ${email} не найден.`);
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.update({ where: { email }, data: { password: passwordHash } });
  console.log(`✅ Пароль обновлён для ${email}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
