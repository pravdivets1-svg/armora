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
  { login: 'dir001', fullName: 'Иван Иванов',     phone: '+7 495 123-45-67', role: 'director',  password: 'A9k2x' },

  // === Менеджеры ===
  { login: 'mgr001', fullName: 'Анна Михайлова',  phone: '+7 916 100-20-30', role: 'manager',   password: 'B7m4q' },
  { login: 'mgr002', fullName: 'Елена Петрова',   phone: '+7 916 100-20-31', role: 'manager',   password: 'C3n8r' },

  // === Замерщики ===
  { login: 'srv001', fullName: 'Сергей Иванов',   phone: '+7 916 111-22-33', role: 'surveyor',  password: 'D5p2t' },
  { login: 'srv002', fullName: 'Олег Кузнецов',   phone: '+7 916 111-22-34', role: 'surveyor',  password: 'E8w6v' },

  // === Установщики ===
  { login: 'ins001', fullName: 'Андрей Смирнов',  phone: '+7 925 444-55-66', role: 'installer', password: 'F4z1y' },
  { login: 'ins002', fullName: 'Дмитрий Попов',   phone: '+7 925 444-55-67', role: 'installer', password: 'G6h3j' },
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
