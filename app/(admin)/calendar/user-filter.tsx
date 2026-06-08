'use client';

import { useRouter, useSearchParams } from 'next/navigation';

// Фильтр сотрудников в стиле PillTabs (uikit): hairline-пиллы, активный —
// тёмная заливка text1, неактивный — card с border-borderc. Геометрия
// один-в-один с PillTabs из uikit, чтобы не плодить визуальные диалекты.

export default function CalendarUserFilter({
  users,
  selected,
}: {
  users: { id: string; fullName: string; role: 'surveyor' | 'installer' }[];
  selected: string;
}) {
  const router = useRouter();
  const params = useSearchParams();

  function navigate(userId: string) {
    const sp = new URLSearchParams(params.toString());
    if (userId) sp.set('user', userId);
    else sp.delete('user');
    const qs = sp.toString();
    router.push(qs ? `/calendar?${qs}` : '/calendar');
  }

  const surveyors = users.filter((u) => u.role === 'surveyor');
  const installers = users.filter((u) => u.role === 'installer');

  return (
    <div
      className="flex gap-1.5 overflow-x-auto scrollbar-none -mx-4 px-4 pb-1"
      style={{
        maskImage: 'linear-gradient(to right, black 0%, black calc(100% - 24px), transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to right, black 0%, black calc(100% - 24px), transparent 100%)',
      }}
    >
      <Pill active={!selected} onClick={() => navigate('')}>
        Все
      </Pill>

      {surveyors.length > 0 && <GroupLabel>Замер</GroupLabel>}
      {surveyors.map((u) => (
        <Pill key={u.id} active={selected === u.id} onClick={() => navigate(u.id)}>
          {u.fullName.split(' ')[0]}
        </Pill>
      ))}

      {installers.length > 0 && <GroupLabel>Монтаж</GroupLabel>}
      {installers.map((u) => (
        <Pill key={u.id} active={selected === u.id} onClick={() => navigate(u.id)}>
          {u.fullName.split(' ')[0]}
        </Pill>
      ))}
    </div>
  );
}

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 inline-flex items-center h-9 px-3.5 rounded-md text-[13px] font-medium
                  transition-colors duration-fast ease-soft whitespace-nowrap
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-accent
                  ${active
                    ? 'bg-text1 text-card'
                    : 'bg-card border border-borderc text-text2 hover:text-text1'}`}
    >
      {children}
    </button>
  );
}

function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="shrink-0 flex items-center self-center px-1 text-[11px] uppercase tracking-wider text-text3">
      {children}
    </span>
  );
}
