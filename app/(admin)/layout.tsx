// Layout для админских роутов (всё, что в группе (admin)).
// Тут гарантированно есть сессия — middleware уже проверил.
//
// Фон — фотофон с белой вуалью (≈72%): текстура кирпича просвечивает,
// карточки и текст читаются. Фон лежит на fixed-слое (::before/::after
// в .bg-page-soft), так что на длинном скролле в iOS Safari нет тормозов
// от background-attachment: fixed.

import { Suspense } from 'react';
import { auth } from '@/auth';
import Header from '@/components/header';
import PageTransition from '@/components/page-transition';
import ToastHost from '@/components/toast-host';
import FaviconBadge from '@/components/favicon-badge';

const LAYOUT_BUILD_MARKER = 'admin-layout-debug-v3';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  try {
    const session = await auth();
    const role = session?.user?.role;
    const showLeadBadge = role === 'director' || role === 'manager';

    return (
      <div className="min-h-screen bg-canvas bg-page-soft">
        <Header />
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
