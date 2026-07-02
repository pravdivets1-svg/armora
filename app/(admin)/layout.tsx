import { Suspense } from 'react';
import { MotionConfig } from 'framer-motion';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { AppShell } from '@/components/uikit';
import InitialSplash from '@/components/uikit/initial-splash';
import PageTransition from '@/components/page-transition';
import ToastHost from '@/components/toast-host';
import FaviconBadge from '@/components/favicon-badge';
import PushPrompt from '@/components/push-prompt';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const user = session?.user;
  const role = user?.role;
  const showLeadBadge = role === 'director' || role === 'manager';

  // Параллельно: два последовательных count'а добавляли лишние десятки мс TTFB
  // на каждую загрузку любой админ-страницы.
  const [pendingClosures, newLeads] = await Promise.all([
    role === 'director'
      ? prisma.order.count({ where: { stage: 'pending_closure' } }).catch((e) => {
          console.error('[ADMIN_LAYOUT_CLOSURES_ERROR]', e);
          return 0;
        })
      : Promise.resolve(0),
    role === 'director' || role === 'manager'
      ? prisma.lead.count({ where: { stage: 'new' } }).catch((e) => {
          console.error('[ADMIN_LAYOUT_LEADS_ERROR]', e);
          return 0;
        })
      : Promise.resolve(0),
  ]);

  return (
    <AppShell
      role={role ?? 'installer'}
      user={{ name: user?.name ?? '—', email: user?.email ?? '' }}
      pendingClosures={pendingClosures}
      newLeads={newLeads}
    >
      {/* MotionConfig reducedMotion="user": framer-motion анимирует инлайн-стили и
          НЕ подчиняется CSS-гарду prefers-reduced-motion из globals.css. */}
      <MotionConfig reducedMotion="user">
        <PageTransition>{children}</PageTransition>
      </MotionConfig>
      <Suspense fallback={null}><ToastHost /></Suspense>
      <FaviconBadge enabled={showLeadBadge} />
      <PushPrompt />
      <InitialSplash />
    </AppShell>
  );
}
