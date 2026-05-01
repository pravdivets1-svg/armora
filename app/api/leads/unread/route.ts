// Возвращает число непрочитанных (stage='new') заявок.
// Используется favicon-badge'ом для polling. Доступ только staff.

import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const session = await auth();
  const user = session?.user;
  if (!user || (user.role !== 'director' && user.role !== 'manager')) {
    return NextResponse.json({ count: 0 });
  }

  const count = await prisma.lead.count({ where: { stage: 'new' } });
  return NextResponse.json({ count });
}
