// Конфиг NextAuth v5 (Auth.js).
// Стратегия: Credentials (email + пароль), сессия в JWT.
// Роль пользователя кладём в токен один раз при логине — все защиты в middleware
// и страницах работают без обращения к БД.

import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import type { Role } from '@prisma/client';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: Role;
    };
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    id: string;
    role: Role;
    name: string;
  }
}

const credentialsSchema = z.object({
  email: z.string().min(3),
  password: z.string().min(1),
});

// Фиктивный bcrypt-хеш для защиты от user enumeration по таймингу.
// Если user не найден — всё равно прогоняем bcrypt, чтобы время ответа
// было сравнимым с реальной проверкой (~150мс). См. также app/(auth)/actions.ts.
const DUMMY_HASH = '$2a$10$uZhq6FwW2N/sBe34yKbLdeyK5c4flCzNO5JMWoKUf3CFQCRQSckyy';

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },

  providers: [
    Credentials({
      credentials: {
        email:    { label: 'Логин',  type: 'text' },
        password: { label: 'Пароль', type: 'password' },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const input = parsed.data.email.toLowerCase().trim();
        const email = input.includes('@') ? input : `${input}@armora.local`;

        const user = await prisma.user.findUnique({ where: { email } });

        // ВСЕГДА выполняем bcrypt — даже если user нет — чтобы по тайму
        // нельзя было определить существование логина.
        const hashToCheck = user?.password ?? DUMMY_HASH;
        const ok = await bcrypt.compare(parsed.data.password, hashToCheck);

        if (!user || !user.isActive || !ok) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.fullName,
          role: user.role,
        };
      },
    }),
  ],

  callbacks: {
    // При логине переписываем JWT: добавляем id и role
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id;
        token.role = (user as any).role;
        token.name = (user as any).name;
      }
      return token;
    },
    // Из JWT в session, чтобы было доступно через `auth()` и `useSession()`
    async session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as Role;
      session.user.name = (token.name as string) ?? '';
      return session;
    },
  },
});
