// Layout для админских роутов (всё, что в группе (admin)).
// Тут гарантированно есть сессия — middleware уже проверил.
//
// Все серверные данные (auth, счётчики Header) грузим прямо тут.
// Header — синхронный компонент, принимает данные пропсами.
// Это нужно потому, что async server components в RSC бросают ошибки мимо
// родительского try/catch вокруг JSX.

import { Suspense } from 'react';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import Header from '@/components/header';
import PageTransition from '@/components/page-transition';
import ToastHost from '@/components/toast-host';
import FaviconBadge from '@/components/favicon-badge';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const user = session?.user;
  const role = user?.role;
  const showLeadBadge = role === 'director' || role === 'manager';

  // Счётчики Header. Изолируем каждый — если одна таблица недоступна,
  // навигация всё равно отрисуется.
  let pendingClosures = 0;
  let newLeads = 0;

  if (role === 'director') {
    try {
      pendingClosures = await prisma.order.count({ where: { stage: 'pending_closure' } });
    } catch (e) {
      console.error('[ADMIN_LAYOUT_CLOSURES_ERROR]', e);
    }
  }

  if (role === 'director' || role === 'manager') {
    try {
      newLeads = await prisma.lead.count({ where: { stage: 'new' } });
    } catch (e) {
      console.error('[ADMIN_LAYOUT_LEADS_ERROR]', e);
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
}
