// Layout для админских роутов (всё, что в группе (admin)).
// Тут гарантированно есть сессия — middleware уже проверил.
//
// Все серверные данные (auth, счётчики Header) грузим прямо тут и оборачиваем
// в try/catch. Header — синхронный компонент, принимает данные пропсами.
// Это нужно потому, что async server components в RSC бросают ошибки мимо
// родительского try/catch вокруг JSX, и тогда падает на дефолтную
// "Application error: a server-side exception".

import { Suspense } from 'react';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import Header from '@/components/header';
import PageTransition from '@/components/page-transition';
import ToastHost from '@/components/toast-host';
import FaviconBadge from '@/components/favicon-badge';

const LAYOUT_BUILD_MARKER = 'admin-layout-debug-v4';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  try {
    const session = await auth();
    const user = session?.user;
    const role = user?.role;
    const showLeadBadge = role === 'director' || role === 'manager';

    // Счётчики Header — оборачиваем каждый отдельно, чтобы при поломке одной
    // таблицы Header всё равно показал нав.
    let pendingClosures = 0;
    let newLeads = 0;

    if (role === 'director') {
      try {
        pendingClosures = await prisma.order.count({ where: { stage: 'pending_closure' } });
      } catch (e: any) {
        console.error('[ADMIN_LAYOUT_CLOSURES_ERROR]', {
          name: e?.name, code: e?.code, message: e?.message, meta: e?.meta,
        });
      }
    }

    if (role === 'director' || role === 'manager') {
      try {
        newLeads = await prisma.lead.count({ where: { stage: 'new' } });
      } catch (e: any) {
        console.error('[ADMIN_LAYOUT_LEADS_ERROR]', {
          name: e?.name, code: e?.code, message: e?.message, meta: e?.meta,
        });
      }
    }

    return (
      <div className="min-h-screen bg-canvas bg-page-soft">
        <Header user={user} pendingClosures={pendingClosures} newLeads={newLeads} />
        <PageTransition>{children}</PageTransition>
        <Suspense fallback={null}>
          <ToastHost />
        </Suspense>
        <FaviconBadge enabled={showLeadBadge} />
      </div>
    );
  } catch (e: any) {
    console.error('[ADMIN_LAYOUT_ERROR]', {
      name: e?.name, code: e?.code, message: e?.message, meta: e?.meta,
      stack: e?.stack?.split('\n').slice(0, 8).join('\n'),
    });
    return (
      <div className="min-h-screen bg-white p-6">
        <h1 className="text-2xl font-semibold mb-4">Admin layout — диагностика ({LAYOUT_BUILD_MARKER})</h1>
        <pre className="bg-red-50 border border-red-200 rounded-lg p-4 text-[12px] text-red-900 whitespace-pre-wrap break-words">
{JSON.stringify({
  name: e?.name,
  code: e?.code,
  message: e?.message,
  meta: e?.meta,
  stack: e?.stack?.split('\n').slice(0, 8).join('\n'),
}, null, 2)}
        </pre>
      </div>
    );
  }
}
