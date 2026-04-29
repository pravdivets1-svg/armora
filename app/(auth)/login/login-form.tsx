'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { AlertCircle, ArrowRight } from 'lucide-react';
import { loginAction, type LoginState } from '../actions';

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending}
      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md
                 bg-ink-900 hover:bg-black text-white font-medium text-[14px] disabled:opacity-60"
    >
      {pending ? 'Входим…' : <>Войти <ArrowRight size={14} /></>}
    </button>
  );
}

export default function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const [state, formAction] = useFormState<LoginState, FormData>(loginAction, undefined);

  return (
    <form
      action={formAction}
      className="w-full max-w-[380px] bg-white border border-line rounded-lg p-8 space-y-5"
    >
      <input type="hidden" name="callbackUrl" value={callbackUrl} />

      <div>
        <div className="text-xl font-semibold tracking-tight text-ink-900">Armora</div>
        <div className="text-[13px] text-ink-500 mt-1">Вход для сотрудников</div>
      </div>

      {state?.error && (
        <div className="flex items-start gap-2 rounded-md bg-bad/5 border border-bad/20 px-3 py-2 text-[13px] text-bad">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}

      <label className="block">
        <span className="text-[11px] uppercase tracking-wide text-ink-500 font-medium">Логин</span>
        <input
          type="text"
          name="email"
          required
          minLength={3}
          maxLength={32}
          autoComplete="username"
          autoCapitalize="off"
          spellCheck={false}
          className="mt-1.5 w-full bg-white border border-line text-ink-900
                     rounded-md px-3.5 py-2 text-[14px] focus:outline-none focus:border-ink-900
                     focus:ring-4 focus:ring-ink-900/5"
        />
      </label>

      <label className="block">
        <span className="text-[11px] uppercase tracking-wide text-ink-500 font-medium">Пароль</span>
        <input
          type="password"
          name="password"
          required
          autoComplete="current-password"
          className="mt-1.5 w-full bg-white border border-line text-ink-900
                     rounded-md px-3.5 py-2 text-[14px] focus:outline-none focus:border-ink-900
                     focus:ring-4 focus:ring-ink-900/5"
        />
      </label>

      <SubmitBtn />

      <p className="text-[12px] text-ink-500 text-center">
        Забыли пароль — обратитесь к директору
      </p>
    </form>
  );
}
