// Аватар-инициалы с цветовой заливкой по роли.
// Помогает мгновенно идентифицировать "кто я сейчас" в шапке + используется
// в списках сотрудников (назначения, комментарии).

import type { Role } from '@prisma/client';

const ROLE_COLORS: Record<Role, { bg: string; text: string; ring: string }> = {
  director:  { bg: 'bg-ink-900',     text: 'text-white',         ring: 'ring-ink-900/10' },
  manager:   { bg: 'bg-accent',      text: 'text-white',         ring: 'ring-accent/10' },
  surveyor:  { bg: 'bg-blue-100',    text: 'text-blue-800',      ring: 'ring-blue-200/40' },
  installer: { bg: 'bg-emerald-100', text: 'text-emerald-800',   ring: 'ring-emerald-200/40' },
};

const SIZES = {
  sm: 'w-7 h-7 text-[11px]',
  md: 'w-8 h-8 text-[12px]',
  lg: 'w-10 h-10 text-[14px]',
} as const;

export default function RoleAvatar({
  role,
  name,
  size = 'md',
}: {
  role: Role;
  name: string;
  size?: keyof typeof SIZES;
}) {
  const initials = name
    .trim()
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const c = ROLE_COLORS[role];
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-semibold leading-none
                  ring-2 ${c.bg} ${c.text} ${c.ring} ${SIZES[size]}`}
      title={name}
    >
      {initials}
    </span>
  );
}
