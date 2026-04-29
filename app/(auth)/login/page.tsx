// Страница логина — premium dark, без sidebar.

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
    <main className="min-h-screen relative bg-base text-fg overflow-hidden">
      {/* Фон-картинка с глубоким overlay (только на /login) */}
      <div
        aria-hidden
        className="absolute inset-0 bg-page"
      />

      {/* Декоративные градиент-ауры */}
      <div aria-hidden className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-accent/20 blur-3xl pointer-events-none" />
      <div aria-hidden className="absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full bg-accent/10 blur-3xl pointer-events-none" />

      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-12">
        <LoginForm callbackUrl={searchParams.callbackUrl ?? '/orders'} />
      </div>
    </main>
  );
}
