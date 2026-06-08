import { Suspense } from 'react';
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
    <AppShell
      role={role ?? 'installer'}
      user={{ name: user?.name ?? '—', email: user?.email ?? '' }}
      pendingClosures={pendingClosures}
      newLeads={newLeads}
    >
      <PageTransition>{children}</PageTransition>
      <Suspense fallback={null}><ToastHost /></Suspense>
      <FaviconBadge enabled={showLeadBadge} />
      <PushPrompt />
      <InitialSplash />
    </AppShell>
  );
}
