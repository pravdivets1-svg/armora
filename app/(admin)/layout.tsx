// Layout для админских роутов (всё, что в группе (admin)).
// Тут гарантированно есть сессия — middleware уже проверил.
//
// Фон — простой bg-canvas (тёплый кремовый). Фотофон убран:
// раньше он лежал под белыми карточками и был не виден, при этом
// `background-attachment: fixed` тормозил скролл на iOS.
// Фотофон оставили только на /login и публичной /order/[token].

import Header from '@/components/header';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas">
      <Header />
      {children}
    </div>
  );
}
