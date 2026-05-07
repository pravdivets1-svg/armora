// UI-примитивы. OkoCRM-style: синий акцент, чистые карточки.

import { forwardRef } from 'react';

const inputBase =
  'block w-full min-w-0 max-w-full box-border ' +
  'bg-white border border-line text-ink-900 rounded-md ' +
  'px-3 py-2 text-[14px] leading-6 placeholder:text-ink-400 ' +
  'focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 ' +
  'disabled:bg-canvas disabled:text-ink-500';

export const FieldLabel = ({ children }: { children: React.ReactNode }) => (
  <span className="text-[12px] tracking-wide text-ink-500 font-medium">
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
// Button
// =====================================================================

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'success' | 'danger';

const BTN_VARIANT: Record<ButtonVariant, string> = {
  primary:   'bg-accent hover:bg-accent-hover text-white font-medium',
  secondary: 'bg-white hover:bg-canvas text-ink-900 border border-line',
  ghost:     'text-ink-700 hover:bg-canvas',
  success:   'bg-ok hover:bg-[#15803d] text-white font-medium',
  danger:    'text-bad hover:bg-bad/5 border border-transparent',
};

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

export function Button({ variant = 'primary', className = '', children, ...rest }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-md
                  text-[13.5px] disabled:opacity-50 disabled:cursor-not-allowed
                  ${BTN_VARIANT[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

// =====================================================================
// Card — белый блок с тонкой рамкой
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
    <section className={`bg-white border border-line rounded-lg p-5 shadow-soft ${className}`}>
      {title && (
        <div className="flex items-center gap-2 text-[12px] text-ink-500 font-medium mb-4 pb-3 border-b border-line">
          {icon}
          {title}
        </div>
      )}
      {children}
    </section>
  );
}
