// Список всех пользователей в БД.
// Запуск: npm run user:list

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    orderBy: [{ isActive: 'desc' }, { role: 'asc' }, { fullName: 'asc' }],
    select: { email: true, fullName: true, phone: true, role: true, isActive: true },
  });

  if (users.length === 0) {
    console.log('Пользователей нет. Запусти `npm run db:seed`.');
    return;
  }

  console.log('\nПользователи:');
  console.log('─'.repeat(90));
  for (const u of users) {
    const status = u.isActive ? '●' : '○';
    console.log(
      `${status} ${u.role.padEnd(10)} ${u.fullName.padEnd(28)} ${u.email.padEnd(28)} ${u.phone ?? ''}`
    );
  }
  console.log('─'.repeat(90));
  console.log(`Всего: ${users.length} (активных: ${users.filter(u => u.isActive).length})\n`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
