'use client';

// AwaitingClientCard — блок «Ждём связи с клиентом».
// Вынесен из <OrderForm>, чтобы его события не всплывали в onInput/onChange
// формы и не запускали autosave. Вызывает setAwaitingAction напрямую.

import { useRef, useState } from 'react';
import { AlertCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { Card, Textarea } from '@/components/ui';
import { awaitingStateOf } from '@/lib/awaiting';
import {
  setAwaitingAction,
  extendAwaitingAction,
  resumeFromAwaitingAction,
  closeFromAwaitingAction,
} from '../actions';

export default function AwaitingClientCard({
  orderId,
  initial,
  initialNote,
  since,
  until,
  disabled,
  canSeeDecisions,
  canCloseAsRejection,
}: {
  orderId: string;
  initial: boolean;
  initialNote: string;
  since: Date | null;
  until: Date | null;
  disabled: boolean;
  canSeeDecisions: boolean;
  canCloseAsRejection: boolean;
}) {
  const [on, setOn] = useState(initial);
  const [note, setNote] = useState(initialNote);
  const [saving, setSaving] = useState(false);
  // Ref для актуального значения on — чтобы debounce не захватывал stale closure
  const onRef = useRef(initial);
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // awaitingStateOf опирается на on (не initial), чтобы отражать текущее состояние
  const state = awaitingStateOf({
    awaitingClient: on,
    awaitingClientSince: since,
    awaitingClientUntil: until,
  });

  async function save(nextOn: boolean, nextNote: string) {
    if (!orderId) return;
    setSaving(true);
    try {
      await setAwaitingAction(orderId, nextOn, nextNote);
    } catch {
      toast.error('Не удалось сохранить');
    } finally {
      setSaving(false);
    }
  }

  function handleToggle(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.checked;
    onRef.current = next;
    setOn(next);
    // Немедленно отменяем pending debounce заметки и сохраняем с актуальным on
    if (noteTimer.current) {
      clearTimeout(noteTimer.current);
      noteTimer.current = null;
    }
    save(next, note);
  }

  function handleNoteChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const v = e.target.value;
    setNote(v);
    if (noteTimer.current) clearTimeout(noteTimer.current);
    // Захватываем onRef.current (не on из closure) — актуальное значение
    noteTimer.current = setTimeout(() => save(onRef.current, v), 1000);
  }

  return (
    <Card title="Ждём связи с клиентом" icon={<Clock size={12} />}>
      <label className="flex items-start gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={on}
          disabled={disabled || saving}
          onChange={handleToggle}
          className="mt-0.5 w-4 h-4 accent-accent"
        />
        <span className="text-[13px] text-text2 leading-snug">
          Клиент должен дать связь / перезвонить / прислать данные
        </span>
        {saving && <span className="text-[11px] text-text3 ml-1">…</span>}
      </label>

      {state.kind === 'silent' && (
        <div className="mt-3 inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-subtle text-text2 text-[12px] tabular-nums">
          <Clock size={12} />
          Осталось {state.daysLeft} {plural(state.daysLeft, 'день', 'дня', 'дней')} тишины
        </div>
      )}
      {state.kind === 'overdue' && (
        <div className="mt-3 inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-bad2-soft text-bad2 text-[12px] font-medium tabular-nums">
          <AlertCircle size={12} />
          Просрочено на {state.overdueDays} {plural(state.overdueDays, 'день', 'дня', 'дней')} — нужно решение
        </div>
      )}

      <Textarea
        rows={2}
        value={note}
        disabled={disabled || !on}
        placeholder="Что именно ждём (перезвон, согласование даты, паспорт и т.п.)"
        className="mt-3"
        maxLength={500}
        onChange={handleNoteChange}
      />

      {canSeeDecisions && state.kind === 'overdue' && (
        <div className="mt-3 flex flex-wrap gap-2">
          <DecisionButton onClick={() => extendAwaitingAction(orderId)} label="Продлить +3 дня" />
          <DecisionButton onClick={() => resumeFromAwaitingAction(orderId)} label="Вернуть в работу" />
          {/* «Закрыть как отказ» переводит в pending_closure — серверный экшен gateит isStaff.
              Полевому (даже назначенному) кнопку не показываем: иначе клик → Forbidden. */}
          {canCloseAsRejection && (
            <DecisionButton onClick={() => closeFromAwaitingAction(orderId)} label="Закрыть как отказ" tone="bad" />
          )}
        </div>
      )}
    </Card>
  );
}

function DecisionButton({
  onClick,
  label,
  tone,
}: {
  onClick: () => Promise<void>;
  label: string;
  tone?: 'bad';
}) {
  const [pending, setPending] = useState(false);
  const cls =
    tone === 'bad'
      ? 'border-bad2/30 text-bad2 hover:bg-bad2-soft'
      : 'border-borderc text-text2 hover:bg-subtle/70 hover:text-text1';
  return (
    <button
      type="button"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        try { await onClick(); }
        catch { toast.error('Не удалось выполнить'); }
        finally { setPending(false); }
      }}
      className={`inline-flex items-center justify-center gap-1.5 px-3 h-9 rounded-md text-[12.5px] font-medium border bg-card transition-colors disabled:opacity-50 ${cls}`}
    >
      {pending ? '…' : label}
    </button>
  );
}

function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}
