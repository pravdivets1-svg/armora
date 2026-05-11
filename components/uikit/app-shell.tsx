'use client';

import type { Role } from '@prisma/client';
import { DesktopSidebar } from './desktop-sidebar';
import { MobileTabBar } from './mobile-tab-bar';

export function AppShell({
  role,
  user,
  pendingClosures,
  newLeads,
  children,
}: {
  role: Role;
  user: { name: string; email: string };
  pendingClosures: number;
  newLeads: number;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-app text-text1">
      <DesktopSidebar
        role={role}
        user={user}
        pendingClosures={pendingClosures}
        newLeads={newLeads}
      />
      <div className="min-h-screen lg:ml-sidebar pb-[calc(64px+env(safe-area-inset-bottom)+8px)] lg:pb-0">
        {children}
      </div>
      <MobileTabBar
        role={role}
        pendingClosures={pendingClosures}
        newLeads={newLeads}
      />
    </div>
  );
}
