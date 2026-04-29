// Layout для админских роутов (всё, что в группе (admin)).
// Тут гарантированно есть сессия — middleware уже проверил.

import Header from '@/components/header';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      {children}
    </div>
  );
}
