'use client';

export default function CalendarUserFilter({
  users,
  selected,
}: {
  users: { id: string; fullName: string; role: 'surveyor' | 'installer' }[];
  selected: string;
}) {
  return (
    <form method="get" className="bg-white border border-line rounded-lg p-2">
      <select
        name="user"
        defaultValue={selected}
        onChange={(e) => (e.currentTarget.form as HTMLFormElement).submit()}
        className="field bg-canvas border-0 text-ink-900 rounded-md px-3 py-2 text-[14px]
                   w-full md:w-72 focus:outline-none"
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
