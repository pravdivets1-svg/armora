'use client';

import { useState, useTransition } from 'react';
import { SectionCard, Toggle } from '@/components/uikit';
import { saveSurveyorReminderAction } from './surveyor-reminder-actions';

export default function SurveyorReminderBlock({ initial }: { initial: boolean }) {
  const [enabled, setEnabled] = useState(initial);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function toggle(next: boolean) {
    const prev = enabled;
    setEnabled(next);
    setError(null);
    setSaved(false);
    start(async () => {
      const res = await saveSurveyorReminderAction(next);
      if (!res.ok) {
        setEnabled(prev); // откат при ошибке
        setError(res.error);
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 1500);
      }
    });
  }

  return (
    <SectionCard title="Напоминание замерщику">
      <div className="flex items-start gap-3 px-1 py-1">
        <div className="flex-1 min-w-0">
          <div className="text-text1 text-[14px] leading-snug">Внести договор и цену после замера</div>
          <div className="text-meta text-text3 mt-0.5">
            Баннер на экране замерщика по заказам со сделанным замером, где не загружено
            фото договора или не указана цена. Сам исчезает, когда данные внесены.
          </div>
        </div>
        <Toggle checked={enabled} onChange={toggle} ariaLabel="Напоминание замерщику" />
      </div>
      <div className="mt-2 flex items-center gap-2 text-meta px-1">
        {pending && <span className="text-text3">Сохранение…</span>}
        {saved && <span className="text-ok2">Сохранено</span>}
        {error && <span className="text-bad2">{error}</span>}
      </div>
    </SectionCard>
  );
}
