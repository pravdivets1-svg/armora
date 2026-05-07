'use client';

import { useState } from 'react';
import Sidebar from './sidebar';
import type { Role } from '@prisma/client';

type AdminShellProps = {
  role: Role;
  pendingClosures: number;
  newLeads: number;
  children: React.ReactNode;
  topBar: React.ReactNode;
};

export default function AdminShell({
  role,
  pendingClosures,
  newLeads,
  children,
  topBar,
}: AdminShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-canvas flex">
      <Sidebar
        role={role}
        pendingClosures={pendingClosures}
        newLeads={newLeads}
        mobileOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Основной контент — смещён на ширину сайдбара на десктопе */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-sidebar">
        {/* Хедер с гамбургером */}
        <header className="sticky top-0 z-30 bg-white border-b border-line h-14 flex items-center px-4 gap-3 shrink-0">
          {/* Гамбургер — только мобильно */}
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Открыть меню"
            className="lg:hidden inline-flex items-center justify-center w-9 h-9 rounded-md text-ink-500 hover:text-ink-900 hover:bg-ink-900/[0.05] transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M2 4.5h14M2 9h14M2 13.5h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
          {/* Лого — только мобильно */}
          <span className="lg:hidden font-semibold text-[15px] text-ink-900 tracking-tight flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-accent text-white text-[11px] font-bold leading-none">A</span>
            Armora
          </span>
          {/* Правая часть хедера */}
          <div className="flex-1 flex items-center justify-end">
            {topBar}
          </div>
        </header>

        {/* Страница */}
        <div className="flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}
