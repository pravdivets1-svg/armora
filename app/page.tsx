import { redirect } from 'next/navigation';

// Корень — всегда уводим на список заказов; middleware попросит залогиниться, если не авторизован.
export default function Home() {
  redirect('/orders');
}
