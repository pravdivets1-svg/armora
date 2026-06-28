// Legacy UI-примитивы. Linear/Vercel tokens: subtle borders, neutral palette.
// Используется в формах вне uikit-зоны (логин, /users, /orders/[id]).

import { forwardRef } from 'react';

// text-[16px] на мобиле — иначе iOS Safari зумит при фокусе.
// На lg+ возвращаем 14px для плотности.
const inputBase =
  'block w-full min-w-0 max-w-full box-border ' +
  'bg-card border border-borderc text-text1 rounded-md ' +
  'px-3 py-2 text-[16px] lg:text-[14px] leading-6 placeholder:text-text3 ' +
  'focus:outline-none focus:border-text2 focus:ring-1 focus:ring-text2/30 ' +
  'disabled:bg-subtle disabled:text-text3';

export const FieldLabel = ({ children }: { children: React.ReactNode }) => (
  <span className="text-[12px] tracking-wide text-text3 font-medium">
    {children}
  </span>
);

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className = '', ...rest },
  ref,
) {
  return <input ref={ref} className={`${inputBase} ${className}`} {...rest} />;
});

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;
export function Textarea({ className = '', ...rest }: TextareaProps) {
  return (
    <textarea className={`${inputBase} resize-y min-h-[5rem] py-2.5 ${className}`} {...rest} />
  );
}

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;
export function Select({ className = '', children, ...rest }: SelectProps) {
  return (
    <select className={`field ${inputBase} ${className}`} {...rest}>
      {children}
    </select>
  );
}

// =====================================================================
// Button (legacy — для форм вне uikit-зоны)
// =====================================================================

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'success' | 'danger' | 'accent';

const BTN_VARIANT: Record<ButtonVariant, string> = {
  // primary = нейтральный near-black, по дефолту
  primary:   'bg-accent hover:bg-accent/90 text-white font-medium',
  // accent = синий, только для критичных CTA
  accent:    'bg-accent hover:bg-accent-hover text-white font-medium',
  secondary: 'bg-card hover:bg-subtle text-text1 border border-borderc',
  ghost:     'text-text2 hover:bg-subtle hover:text-text1',
  success:   'bg-ok2 hover:bg-ok2/90 text-white font-medium',
  danger:    'text-bad2 hover:bg-bad2-soft border border-transparent',
};

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

export function Button({ variant = 'primary', className = '', children, ...rest }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-md
                  text-[13.5px] disabled:opacity-50 disabled:cursor-not-allowed
                  transition-colors duration-fast ease-soft
                  ${BTN_VARIANT[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

// =====================================================================
// Card — белый блок с тонкой рамкой (плоский, без тени)
// =====================================================================

export function Card({
  title,
  icon,
  children,
  className = '',
}: {
  title?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`glass-surface rounded-2xl p-4 ${className}`}>
      {title && (
        <div className="flex items-center gap-2 text-[12px] text-text3 font-medium mb-3 pb-2.5 border-b border-white/40">
          {icon}
          {title}
        </div>
      )}
      {children}
    </section>
  );
}
