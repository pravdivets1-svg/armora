'use client';

import { forwardRef } from 'react';

type Variant = 'primary' | 'dark' | 'accent' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

// primary = графит-стекло (gradient + inset highlight) — main CTA в Liquid Glass.
// dark    = алиас primary.
// accent  = синий glass, для критичных stage-CTA.
const VARIANT: Record<Variant, string> = {
  primary:   'glass-button-dark text-white',
  dark:      'glass-button-dark text-white',
  accent:    'bg-accent text-white hover:bg-accent-deep active:bg-accent-deep',
  secondary: 'glass-surface text-text1',
  ghost:     'text-text2 hover:bg-white/30 hover:text-text1',
  danger:    'text-bad2 hover:bg-bad2-soft',
};

const SIZE: Record<Size, string> = {
  sm: 'h-9 px-3 text-[13px]',
  md: 'h-10 px-4 text-[14px]',
  lg: 'h-12 px-5 text-[15px]',
};

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  block?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', block, className = '', children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={`inline-flex items-center justify-center gap-2 rounded-md font-medium
                  transition-[transform,background-color,color,border-color] duration-fast ease-soft
                  active:scale-[0.98]
                  disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2
                  ${VARIANT[variant]} ${SIZE[size]} ${block ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
});

type IconButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  size?: 36 | 40 | 44;
  variant?: 'ghost' | 'secondary';
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { size = 40, variant = 'ghost', className = '', children, ...rest },
  ref,
) {
  const dim = `${size}px`;
  const look = variant === 'secondary'
    ? 'bg-card border border-borderc text-text2 hover:bg-subtle hover:text-text1'
    : 'text-text2 hover:bg-subtle hover:text-text1';
  return (
    <button
      ref={ref}
      style={{ width: dim, height: dim }}
      className={`inline-flex items-center justify-center rounded-md
                  transition-colors duration-fast ease-soft
                  disabled:opacity-50
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-accent
                  ${look} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
});
