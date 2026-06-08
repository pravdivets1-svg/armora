// Аватар-инициалы с цветовой заливкой по роли.
// Используется в шапке + в списках сотрудников.

import type { Role } from '@prisma/client';

const ROLE_COLORS: Record<Role, { bg: string; text: string; ring: string }> = {
  director:  { bg: 'bg-text1',       text: 'text-white',         ring: 'ring-text1/10' },
  manager:   { bg: 'bg-accent',      text: 'text-white',         ring: 'ring-accent/10' },
  surveyor:  { bg: 'bg-info2/10',    text: 'text-info2',         ring: 'ring-info2/20' },
  installer: { bg: 'bg-ok2/10',      text: 'text-ok2',           ring: 'ring-ok2/20' },
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
