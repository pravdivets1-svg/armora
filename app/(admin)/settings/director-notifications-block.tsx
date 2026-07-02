'use client';

// Матрица «роль × событие» для директора. Mobile-first:
// каждая роль — отдельная карточка с группой событий и iOS-style свитчами.

import { useState } from 'react';
import type { Role } from '@prisma/client';
import { SectionCard, Toggle } from '@/components/uikit';
import { ROLE_LABEL } from '@/lib/labels';
import { EVENT_KEYS, EVENT_META, ROLE_RELEVANT, type EventKey } from '@/lib/notification-events';
import { toggleRolePrefAction } from './director-notifications-actions';

const ROLE_ORDER: Role[] = ['director', 'manager', 'surveyor', 'installer'];

export default function DirectorNotificationsBlock({
  initialMatrix,
}: {
  initialMatrix: Record<Role, Record<string, boolean>>;
}) {
  const [matrix, setMatrix] = useState(initialMatrix);
  // Пер-ключевой pending: одна глобальная блокировка (if (pending) return)
  // МОЛЧА теряла тапы по другим свитчам, пока летел предыдущий запрос —
  // директор прощёлкивал матрицу, и часть переключений не применялась.
  const [saving, setSaving] = useState<Set<string>>(new Set());
  const [errorRow, setErrorRow] = useState<string | null>(null);
  // По дефолту показываем только «свои» для роли события — чтобы не перегружать
  // экран. Toggle расширенного режима даёт доступ ко всем 8 событиям для всех ролей.
  const [showAll, setShowAll] = useState(false);

  function flip(role: Role, event: EventKey) {
    const key = `${role}.${event}`;
    if (saving.has(key)) return; // блокируем только ЭТОТ свитч
    const prev = !!matrix[role]?.[event];
    const next = !prev;
    // Оптимистично
    setMatrix((m) => ({ ...m, [role]: { ...m[role], [event]: next } }));
    setErrorRow(null);
    setSaving((s) => new Set(s).add(key));
    void toggleRolePrefAction(role, event, next)
      .then((res) => {
        if (!res.ok) {
          // Откат
          setMatrix((m) => ({ ...m, [role]: { ...m[role], [event]: prev } }));
          setErrorRow(key);
        }
      })
      .catch(() => {
        setMatrix((m) => ({ ...m, [role]: { ...m[role], [event]: prev } }));
        setErrorRow(key);
      })
      .finally(() => {
        setSaving((s) => { const n = new Set(s); n.delete(key); return n; });
      });
  }

  return (
    <>
      <SectionCard title="Уведомления — режим">
        <div className="flex items-center justify-between gap-3 min-h-[44px]">
          <div className="flex-1 min-w-0">
            <div className="text-text1 text-[14px]">Показывать все события</div>
            <div className="text-meta text-text3 mt-0.5">
              Включи, чтобы добавить роли в события за пределами их базовой ответственности
            </div>
          </div>
          <Toggle
            checked={showAll}
            onChange={setShowAll}
            ariaLabel="Расширенный режим"
          />
        </div>
      </SectionCard>
      {ROLE_ORDER.map((role) => {
        const list: EventKey[] = showAll ? [...EVENT_KEYS] : ROLE_RELEVANT[role];
        if (list.length === 0) return null;
        return (
          <SectionCard key={role} title={`Уведомления · ${ROLE_LABEL[role]}`}>
            <ul className="-mx-1">
              {list.map((event) => {
                const checked = !!matrix[role]?.[event];
                const meta = EVENT_META[event];
                const isCore = ROLE_RELEVANT[role].includes(event);
                const errKey = `${role}.${event}`;
                return (
                  <li
                    key={event}
                    className="flex items-center gap-3 px-1 py-2 min-h-[44px]"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-text1 text-[14px] leading-snug">
                          {meta.label}
                        </span>
                        {!isCore && (
                          <span className="text-[11px] text-text2 px-1.5 py-0.5
                                           rounded bg-subtle uppercase tracking-wide">
                            доп
                          </span>
                        )}
                      </div>
                      {errorRow === errKey && (
                        <div className="text-meta text-bad2-text mt-0.5">
                          Не удалось сохранить — попробуйте ещё
                        </div>
                      )}
                    </div>
                    <Toggle
                      checked={checked}
                      disabled={saving.has(errKey)}
                      onChange={() => flip(role, event)}
                      ariaLabel={`${ROLE_LABEL[role]}: ${meta.label}`}
                    />
                  </li>
                );
              })}
            </ul>
          </SectionCard>
        );
      })}
    </>
  );
}
