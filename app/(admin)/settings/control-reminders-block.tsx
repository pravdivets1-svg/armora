'use client';

// Блок «Контрольные напоминания» в /settings — только для директора.
// 3 триггера: production_stale / installed_no_close / pending_closure_stale.
// Каждый — переключатель + число дней. Оптимистичное сохранение по дебаунсу.

import { useState, useTransition } from 'react';
import { SectionCard, Toggle } from '@/components/uikit';
import { saveControlRemindersAction, type ControlRemindersInput } from './control-reminders-actions';

type State = ControlRemindersInput;

type RowKey = 'production' | 'installed' | 'pendingClosure';

const ROWS: Array<{
  key: RowKey;
  title: string;
  hint: string;
  flagName: keyof State;
  daysName: keyof State;
}> = [
  {
    key: 'production',
    title: 'Долго в производстве',
    hint: 'Push если заказ на стадии «В производстве» дольше указанного числа дней без изменений.',
    flagName: 'productionStaleEnabled',
    daysName: 'productionStaleDays',
  },
  {
    key: 'installed',
    title: 'Установлен, но не закрыт',
    hint: 'Push после фактической установки если заказ не переведён дальше за указанные дни.',
    flagName: 'installedNoCloseEnabled',
    daysName: 'installedNoCloseDays',
  },
  {
    key: 'pendingClosure',
    title: 'Долго на закрытии',
    hint: 'Push директору если заказ висит на «Ожидает закрытия» дольше указанного числа дней.',
    flagName: 'pendingClosureStaleEnabled',
    daysName: 'pendingClosureStaleDays',
  },
];

export default function ControlRemindersBlock({ initial }: { initial: State }) {
  const [state, setState] = useState<State>(initial);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function patch(next: Partial<State>) {
    const merged = { ...state, ...next };
    setState(merged);
    setError(null);
    setSaved(false);
    start(async () => {
      const res = await saveControlRemindersAction(merged);
      if (!res.ok) {
        setError(res.error);
        // Откатывать не будем — пользователь увидит ошибку и повторит
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 1500);
      }
    });
  }

  return (
    <SectionCard title="Контрольные напоминания">
      <p className="text-meta text-text3 mb-3">
        Push исполнителям/менеджеру/директору когда заказ слишком долго стоит на стадии без прогресса.
        Кто получит — определяется матрицей ниже (по умолчанию: производство → менеджер+директор,
        установка → установщик+менеджер, закрытие → директор).
      </p>
      <ul className="-mx-1">
        {ROWS.map((r) => {
          const checked = !!state[r.flagName];
          const days = state[r.daysName] as number;
          return (
            <li
              key={r.key}
              className="flex items-start gap-3 px-1 py-2.5"
            >
              <div className="flex-1 min-w-0">
                <div className="text-text1 text-[14px] leading-snug">{r.title}</div>
                <div className="text-meta text-text3 mt-0.5">{r.hint}</div>
                <label className="mt-2 inline-flex items-center gap-2 text-[13px] text-text2">
                  через
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={days}
                    disabled={!checked}
                    onChange={(e) => {
                      const v = Math.max(1, Math.min(365, Number(e.target.value) || 0));
                      patch({ [r.daysName]: v } as Partial<State>);
                    }}
                    className="w-14 h-8 px-2 rounded-md border border-borderc bg-card text-text1 tabular-nums text-center
                               focus:outline-none focus:border-text2/40 focus:ring-1 focus:ring-text2/20
                               disabled:opacity-40"
                  />
                  дней
                </label>
              </div>
              <Toggle
                checked={checked}
                onChange={(v) => patch({ [r.flagName]: v } as Partial<State>)}
                ariaLabel={r.title}
              />
            </li>
          );
        })}
      </ul>
      <div className="mt-2 flex items-center gap-2 text-meta">
        {pending && <span className="text-text3">Сохранение…</span>}
        {saved && <span className="text-ok2">Сохранено</span>}
        {error && <span className="text-bad2">{error}</span>}
      </div>
    </SectionCard>
  );
}
