// Страница логина. Серверный компонент: достаёт callbackUrl из URL и редиректит,
// если пользователь уже авторизован.

import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import LoginForm from './login-form';

export const metadata = { title: 'Вход — Armora' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { callbackUrl?: string };
}) {
  const session = await auth();
  if (session?.user) redirect(searchParams.callbackUrl || '/orders');

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-page">
      <LoginForm callbackUrl={searchParams.callbackUrl ?? '/orders'} />
    </main>
  );
}
