'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { motion } from 'framer-motion';
import { AlertCircle, ArrowRight, Lock } from 'lucide-react';
import { loginAction, type LoginState } from '../actions';

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending}
      className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-md
                 bg-accent hover:bg-accent-hover text-white font-medium text-[14px]
                 shadow-e1 disabled:opacity-60 disabled:pointer-events-none
                 transition-colors duration-150 ease-smooth
                 focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_rgb(var(--color-base)),0_0_0_4px_rgb(var(--color-accent)/0.55)]"
    >
      {pending ? 'Входим…' : (
        <>
          Войти <ArrowRight size={14} strokeWidth={2} />
        </>
      )}
    </button>
  );
}

export default function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const [state, formAction] = useFormState<LoginState, FormData>(loginAction, undefined);

  return (
    <motion.form
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
      action={formAction}
      className="w-full max-w-[400px] rounded-lg border border-border bg-surface/95 backdrop-blur-xl
                 p-7 space-y-5 shadow-e3"
    >
      <input type="hidden" name="callbackUrl" value={callbackUrl} />

      {/* Brand */}
      <div className="flex items-center gap-3 pb-2">
        <div className="w-9 h-9 rounded-md bg-accent-gradient flex items-center justify-center text-white font-mono font-semibold text-[16px]">
          A
        </div>
        <div>
          <div className="text-[16px] font-semibold tracking-tight text-fg">Armora</div>
          <div className="text-[12px] text-muted">Учёт заказов</div>
        </div>
      </div>

      {state?.error && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-2 rounded-md bg-bad-soft border border-bad/25 px-3 py-2 text-[13px] text-bad"
        >
          <AlertCircle size={14} strokeWidth={2} className="mt-0.5 shrink-0" />
          <span>{state.error}</span>
        </motion.div>
      )}

      <label className="block">
        <span className="text-[11px] uppercase tracking-wider text-muted font-medium">Логин</span>
        <input
          type="text"
          name="email"
          required
          minLength={3}
          maxLength={32}
          autoComplete="username"
          autoCapitalize="off"
          spellCheck={false}
          className="mt-1.5 w-full bg-base border border-border text-fg
                     rounded-md px-3 py-2 text-[14px] font-mono
                     placeholder:text-subtle focus:outline-none focus:border-accent
                     transition-colors duration-150"
        />
      </label>

      <label className="block">
        <span className="text-[11px] uppercase tracking-wider text-muted font-medium">Пароль</span>
        <input
          type="password"
          name="password"
          required
          autoComplete="current-password"
          className="mt-1.5 w-full bg-base border border-border text-fg
                     rounded-md px-3 py-2 text-[14px] font-mono
                     placeholder:text-subtle focus:outline-none focus:border-accent
                     transition-colors duration-150"
        />
      </label>

      <SubmitBtn />

      <div className="flex items-center justify-center gap-1.5 text-[12px] text-muted pt-1">
        <Lock size={11} strokeWidth={1.75} />
        <span>Забыли пароль — обратитесь к директору</span>
      </div>
    </motion.form>
  );
}
