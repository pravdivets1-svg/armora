'use client';

// iOS-style Toggle switch. Работает как контролируемый компонент.
//
// Пример:
//   <Toggle checked={on} onChange={setOn} label="Уведомления" />

import { useId } from 'react';

export function Toggle({
  checked,
  onChange,
  label,
  hint,
  disabled,
  name,
  ariaLabel,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: string;
  hint?: string;
  disabled?: boolean;
  name?: string;
  ariaLabel?: string;
}) {
  const id = useId();

  return (
    <label
      htmlFor={id}
      className={`flex items-center gap-3 select-none ${disabled ? 'opacity-50' : 'cursor-pointer'}`}
    >
      {label && (
        <span className="flex-1 min-w-0">
          <span className="block text-[14px] text-text1">{label}</span>
          {hint && <span className="block text-[12px] text-text3 mt-0.5">{hint}</span>}
        </span>
      )}
      <span className="relative shrink-0">
        <input
          id={id}
          type="checkbox"
          name={name}
          aria-label={ariaLabel}
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className="peer sr-only"
        />
        {/* Трек */}
        <span
          aria-hidden
          className={`block w-[44px] h-[26px] rounded-full transition-colors duration-fast
                      ${checked ? 'bg-ok2' : 'bg-borders'}`}
        />
        {/* Кружок */}
        <span
          aria-hidden
          className={`absolute top-[2px] left-[2px] w-[22px] h-[22px] rounded-full bg-white
                      shadow-[0_1px_2px_rgba(0,0,0,0.2),0_2px_4px_rgba(0,0,0,0.1)]
                      transition-transform duration-fast ease-soft
                      ${checked ? 'translate-x-[18px]' : 'translate-x-0'}`}
        />
      </span>
    </label>
  );
}
