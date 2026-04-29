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
                 bg-ink-900 hover:bg-black text-white font-medium text-[15px] disabled:opacity-60"
    >
      {pending ? 'Входим…' : <>Войти <ArrowRight size={15} /></>}
    </button>
  );
}

export default function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const [state, formAction] = useFormState<LoginState, FormData>(loginAction, undefined);

  return (
    <form
      action={formAction}
      className="w-full max-w-[400px] bg-white/75 backdrop-blur-xl border border-white/40
                 rounded-lg p-8 space-y-5 shadow-[0_8px_40px_rgba(0,0,0,0.25)]"
    >
      <input type="hidden" name="callbackUrl" value={callbackUrl} />

      <div>
        <div className="text-2xl font-semibold tracking-tight text-ink-900">Armora</div>
        <div className="text-[14px] text-ink-700 mt-1">Вход для сотрудников</div>
      </div>

      {state?.error && (
        <div className="flex items-start gap-2 rounded-md bg-bad/10 border border-bad/30 px-3 py-2 text-[14px] text-bad">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}

      <label className="block">
        <span className="text-[12px] uppercase tracking-wide text-ink-700 font-semibold">Логин</span>
        <input
          type="text"
          name="email"
          required
          minLength={3}
          maxLength={32}
          autoComplete="username"
          autoCapitalize="off"
          spellCheck={false}
          className="mt-1.5 w-full bg-white/90 border border-line text-ink-900
                     rounded-md px-3.5 py-2.5 text-[15px] focus:outline-none focus:border-ink-900
                     focus:ring-4 focus:ring-ink-900/5"
        />
      </label>

      <label className="block">
        <span className="text-[12px] uppercase tracking-wide text-ink-700 font-semibold">Пароль</span>
        <input
          type="password"
          name="password"
          required
          autoComplete="current-password"
          className="mt-1.5 w-full bg-white/90 border border-line text-ink-900
                     rounded-md px-3.5 py-2.5 text-[15px] focus:outline-none focus:border-ink-900
                     focus:ring-4 focus:ring-ink-900/5"
        />
      </label>

      <SubmitBtn />

      <p className="text-[13px] text-ink-700 text-center">
        Забыли пароль — обратитесь к директору
      </p>
    </form>
  );
}
