'use server';

// Server Actions для логина/логаута.
// Использование в форме:  <form action={loginAction}>

import { signIn, signOut } from '@/auth';
import { AuthError } from 'next-auth';
import { redirect } from 'next/navigation';

export type LoginState = { error?: string } | undefined;

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const callbackUrl = String(formData.get('callbackUrl') ?? '/orders');

  try {
    await signIn('credentials', { email, password, redirectTo: callbackUrl });
  } catch (e) {
    if (e instanceof AuthError) {
      return { error: 'Неверный email или пароль' };
    }
    // signIn кидает NEXT_REDIRECT при успехе — пробрасываем дальше
    throw e;
  }
  return undefined;
}

export async function logoutAction() {
  await signOut({ redirectTo: '/login' });
  redirect('/login');
}
