'use client';

export default function CalendarUserFilter({
  users,
  selected,
}: {
  users: { id: string; fullName: string; role: 'surveyor' | 'installer' }[];
  selected: string;
}) {
  return (
    <form method="get" className="rounded-md border border-border bg-surface p-1.5">
      <select
        name="user"
        defaultValue={selected}
        onChange={(e) => (e.currentTarget.form as HTMLFormElement).submit()}
        className="field bg-base border border-border text-fg rounded-md px-3 py-2 text-[13px]
                   w-full md:w-72 hover:border-borderHover focus:outline-none focus:border-accent transition-colors duration-150"
      >
        <option value="">Все сотрудники</option>
        {users.map((u) => (
          <option key={u.id} value={u.id}>
            {u.fullName} ({u.role === 'surveyor' ? 'замерщик' : 'установщик'})
          </option>
        ))}
      </select>
    </form>
  );
}
