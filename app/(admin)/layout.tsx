// Layout для админских роутов (всё, что в группе (admin)).
// Тут гарантированно есть сессия — middleware уже проверил.
//
// Фон — фотофон с белой вуалью (≈72%): текстура кирпича просвечивает,
// карточки и текст читаются. Фон лежит на fixed-слое (::before/::after
// в .bg-page-soft), так что на длинном скролле в iOS Safari нет тормозов
// от background-attachment: fixed.

import { Suspense } from 'react';
import Header from '@/components/header';
import PageTransition from '@/components/page-transition';
import ToastHost from '@/components/toast-host';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas bg-page-soft">
      <Header />
      <PageTransition>{children}</PageTransition>
      <Suspense fallback={null}>
        <ToastHost />
      </Suspense>
    </div>
  );
}
