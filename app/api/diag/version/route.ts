// Public diagnostic endpoint — confirms which build is currently deployed.
// Remove after debugging.

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const BUILD_MARKER = 'fix-decimal-v3';

export async function GET() {
  const checks: Record<string, any> = { marker: BUILD_MARKER };

  try {
    checks.leadCount = await prisma.lead.count();
  } catch (e: any) {
    checks.leadCountError = {
      name: e?.name,
      code: e?.code,
      message: e?.message,
      meta: e?.meta,
    };
  }

  try {
    checks.leadGroup = await prisma.lead.groupBy({
      by: ['stage'],
      _count: { _all: true },
    });
  } catch (e: any) {
    checks.leadGroupError = {
      name: e?.name,
      code: e?.code,
      message: e?.message,
      meta: e?.meta,
    };
  }

  try {
    checks.leadFindOne = await prisma.lead.findFirst({
      orderBy: { createdAt: 'desc' },
      include: { assignedTo: { select: { fullName: true } } },
    });
  } catch (e: any) {
    checks.leadFindOneError = {
      name: e?.name,
      code: e?.code,
      message: e?.message,
      meta: e?.meta,
      stack: e?.stack?.split('\n').slice(0, 8).join('\n'),
    };
  }

  return NextResponse.json(checks, { status: 200 });
}
