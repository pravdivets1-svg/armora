import { forwardRef } from 'react';
import { cn } from '@/lib/cn';

const baseField = [
  'block w-full bg-surface text-fg',
  'border border-border rounded-md',
  'px-3 py-2 text-[14px] leading-tight',
  'placeholder:text-subtle',
  'transition-colors duration-150 ease-smooth',
  'hover:border-borderHover',
  'focus:outline-none focus:border-accent',
  'disabled:opacity-50 disabled:pointer-events-none',
];

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn(baseField, className)} {...props} />
  ),
);
Input.displayName = 'Input';

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea ref={ref} className={cn(baseField, 'min-h-[80px] resize-y', className)} {...props} />
  ),
);
Textarea.displayName = 'Textarea';

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select ref={ref} className={cn('field', baseField, className)} {...props}>
      {children}
    </select>
  ),
);
Select.displayName = 'Select';

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn('block text-[11px] uppercase tracking-wider text-muted font-medium mb-1.5', className)}
      {...props}
    />
  );
}

export function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label?: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('block', className)}>
      {label && <Label>{label}</Label>}
      {children}
      {hint && !error && <div className="mt-1 text-[12px] text-muted">{hint}</div>}
      {error && <div className="mt-1 text-[12px] text-bad">{error}</div>}
    </div>
  );
}
