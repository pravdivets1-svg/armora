// UI-примитивы. 2026-style: spacious, тонкие границы, индиго-акцент.

import { forwardRef } from 'react';

const inputBase =
  'block w-full min-w-0 max-w-full box-border ' +
  'bg-white/45 backdrop-blur-md border border-ink-900/10 text-ink-900 rounded-md ' +
  'shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_1px_2px_rgba(15,15,15,0.04)] ' +
  'px-3.5 py-2 text-[14px] leading-6 placeholder:text-ink-400 ' +
  'focus:outline-none focus:border-ink-900/40 focus:ring-4 focus:ring-ink-900/5 focus:bg-white/70 ' +
  'disabled:bg-ink-900/[0.03] disabled:text-ink-500 disabled:backdrop-blur-0';

export const FieldLabel = ({ children }: { children: React.ReactNode }) => (
  <span className="text-[11px] tracking-wide text-ink-500 font-medium uppercase">
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
  primary:   'bg-ink-900 hover:bg-black text-white font-medium',
  secondary: 'bg-white hover:bg-canvas text-ink-900 border border-line',
  ghost:     'text-ink-700 hover:bg-canvas',
  success:   'bg-ok hover:bg-[#166534] text-white font-medium',
  danger:    'text-bad hover:bg-bad/5 border border-transparent',
};

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

export function Button({ variant = 'primary', className = '', children, ...rest }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md
                  text-[14px] disabled:opacity-50 disabled:cursor-not-allowed
                  ${BTN_VARIANT[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

// =====================================================================
// Card — белый блок с тонкой рамкой и большим скруглением
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
    <section className={`bg-white border border-line rounded-lg p-5 ${className}`}>
      {title && (
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide
                        text-ink-500 font-medium mb-4">
          {icon}
          {title}
        </div>
      )}
      {children}
    </section>
  );
}
