// Добавить нового сотрудника.
// Запуск: npm run user:add -- email@example.com "Иван Иванов" manager "+7 916 000-00-00" пароль
//
// Аргументы:
//   1. email
//   2. ФИО (в кавычках)
//   3. роль: director | manager | surveyor | installer
//   4. телефон (в кавычках)
//   5. пароль (открытым текстом, будет захеширован)

import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const [email, fullName, role, phone, password] = process.argv.slice(2);

  if (!email || !fullName || !role || !phone || !password) {
    console.error('Использование:');
    console.error('  npm run user:add -- EMAIL "ФИО" РОЛЬ "ТЕЛЕФОН" ПАРОЛЬ');
    console.error('  где РОЛЬ = director | manager | surveyor | installer');
    process.exit(1);
  }

  const allowedRoles: Role[] = ['director', 'manager', 'surveyor', 'installer'];
  if (!allowedRoles.includes(role as Role)) {
    console.error(`Неизвестная роль: ${role}. Допустимо: ${allowedRoles.join(', ')}`);
    process.exit(1);
  }

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) {
    console.error(`Пользователь ${email} уже существует.`);
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, fullName, phone, role: role as Role, password: passwordHash },
  });

  console.log(`✅ Создан: ${user.email} · ${user.fullName} · ${user.role}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
