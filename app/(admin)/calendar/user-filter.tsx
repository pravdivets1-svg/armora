'use client';

import { useRouter, useSearchParams } from 'next/navigation';

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
    router.push(`/calendar?${sp.toString()}`);
  }

  const surveyors = users.filter((u) => u.role === 'surveyor');
  const installers = users.filter((u) => u.role === 'installer');

  const pill =
    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-medium transition-colors cursor-pointer whitespace-nowrap';
  const active = 'bg-ink-900 text-white shadow-soft';
  const inactive = 'bg-white border border-line text-ink-700 hover:border-ink-400 hover:text-ink-900';

  return (
    <div className="flex flex-wrap gap-1.5">
      <button type="button" onClick={() => navigate('')} className={`${pill} ${!selected ? active : inactive}`}>
        Все
      </button>
      {surveyors.length > 0 && (
        <span className="flex items-center self-center px-1 text-[11px] text-ink-400 uppercase tracking-wider">
          Замер
        </span>
      )}
      {surveyors.map((u) => (
        <button
          key={u.id}
          type="button"
          onClick={() => navigate(u.id)}
          className={`${pill} ${selected === u.id ? active : inactive}`}
        >
          {u.fullName.split(' ')[0]}
        </button>
      ))}
      {installers.length > 0 && (
        <span className="flex items-center self-center px-1 text-[11px] text-ink-400 uppercase tracking-wider">
          Монтаж
        </span>
      )}
      {installers.map((u) => (
        <button
          key={u.id}
          type="button"
          onClick={() => navigate(u.id)}
          className={`${pill} ${selected === u.id ? active : inactive}`}
        >
          {u.fullName.split(' ')[0]}
        </button>
      ))}
    </div>
  );
}
