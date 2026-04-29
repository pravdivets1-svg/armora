// Singleton Prisma Client.
// В dev-режиме Next.js перезагружает модули — без singleton каждое сохранение
// плодит новые подключения и Postgres быстро упирается в лимит.

import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
