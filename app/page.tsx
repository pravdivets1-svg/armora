import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { isFieldWorker } from '@/lib/auth-helpers';

// Корень — ролевой home.
// Полевые (замерщик/установщик) → /calendar: их «день» (следующее событие + маршрут).
// Staff (директор/менеджер) → /orders: рабочий список.
// Неавторизованных middleware уже увёл на /login; на всякий случай fallback на /orders.
export default async function Home() {
  const session = await auth();
  const role = session?.user?.role;
  if (role && isFieldWorker(role)) redirect('/calendar');
  redirect('/orders');
}
