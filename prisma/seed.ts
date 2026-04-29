// Сидинг базы при первом разворачивании.
// Запуск: npm run db:seed
//
// Логины ровно 6 символов, пароли ровно 5.
// На странице логина вводится просто "dir001" — сервер сам подставит
// служебный домен @armora.local при поиске в БД.

import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DOMAIN = '@armora.local';

const USERS: Array<{
  login: string;     // 6 символов, латиница/цифры
  fullName: string;
  phone: string;
  role: Role;
  password: string;  // 5 символов
}> = [
  // === Директор ===
  { login: 'dir001', fullName: 'Владимир Сергеевич', phone: '+7 999 835-35-55',  role: 'director',  password: 'a4dvh' },

  // === Менеджер ===
  { login: 'mgr001', fullName: 'Арина',              phone: '',                   role: 'manager',   password: 'DVtVB' },

  // === Замерщик ===
  { login: 'srv001', fullName: 'Али',                phone: '+7 967 134-65-56',  role: 'surveyor',  password: 'Tg5Bs' },

  // === Установщик ===
  { login: 'ins001', fullName: 'Арсен',              phone: '+7 964 524-48-28',  role: 'installer', password: '3acvH' },
];

async function main() {
  console.log('🌱 Сидинг базы Armora...');

  // 1. Настройки компании
  await prisma.companySettings.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      companyName:  process.env.NEXT_PUBLIC_COMPANY_NAME  ?? 'Armora',
      companyPhone: process.env.NEXT_PUBLIC_COMPANY_PHONE ?? '+7 (495) 123-45-67',
    },
    update: {},
  });

  // 2. Пользователи
  console.log('\nЛогины и пароли:');
  console.log('─'.repeat(70));
  for (const u of USERS) {
    const email = u.login + DOMAIN;
    const passwordHash = await bcrypt.hash(u.password, 10);
    await prisma.user.upsert({
      where: { email },
      create: {
        email,
        fullName: u.fullName,
        phone:    u.phone,
        role:     u.role,
        password: passwordHash,
      },
      update: {
        fullName: u.fullName,
        phone:    u.phone,
        role:     u.role,
        password: passwordHash, // при пересиде перезатираем — это локалка / первый деплой
      },
    });
    console.log(
      `  ${u.role.padEnd(10)} ${u.fullName.padEnd(22)} ` +
      `логин: ${u.login.padEnd(8)} пароль: ${u.password}`,
    );
  }
  console.log('─'.repeat(70));
  console.log('\n✅ Готово. Логин на странице — просто "dir001" + пароль.\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
