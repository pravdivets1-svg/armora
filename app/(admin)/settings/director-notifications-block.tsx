'use client';

// Матрица «роль × событие» для директора. Mobile-first:
// каждая роль — отдельная карточка с группой событий и iOS-style свитчами.

import { useState, useTransition } from 'react';
import type { Role } from '@prisma/client';
import { SectionCard, Toggle } from '@/components/uikit';
import { ROLE_LABEL } from '@/lib/labels';
import { EVENT_META, ROLE_RELEVANT, type EventKey } from '@/lib/notification-events';
import { toggleRolePrefAction } from './director-notifications-actions';

const ROLE_ORDER: Role[] = ['director', 'manager', 'surveyor', 'installer'];

export default function DirectorNotificationsBlock({
  initialMatrix,
}: {
  initialMatrix: Record<Role, Record<string, boolean>>;
}) {
  const [matrix, setMatrix] = useState(initialMatrix);
  const [pending, start] = useTransition();
  const [errorRow, setErrorRow] = useState<string | null>(null);

  function flip(role: Role, event: EventKey) {
    if (pending) return;
    const prev = !!matrix[role]?.[event];
    const next = !prev;
    // Оптимистично
    setMatrix((m) => ({ ...m, [role]: { ...m[role], [event]: next } }));
    setErrorRow(null);
    start(async () => {
      const res = await toggleRolePrefAction(role, event, next);
      if (!res.ok) {
        // Откат
        setMatrix((m) => ({ ...m, [role]: { ...m[role], [event]: prev } }));
        setErrorRow(`${role}.${event}`);
      }
    });
  }

  return (
    <>
      {ROLE_ORDER.map((role) => {
        const relevant = ROLE_RELEVANT[role];
        if (relevant.length === 0) return null;
        return (
          <SectionCard key={role} title={`Уведомления · ${ROLE_LABEL[role]}`}>
            <ul className="-mx-1">
              {relevant.map((event) => {
                const checked = !!matrix[role]?.[event];
                const meta = EVENT_META[event];
                const errKey = `${role}.${event}`;
                return (
                  <li
                    key={event}
                    className="flex items-center gap-3 px-1 py-2 min-h-[44px]"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-text1 text-[14px] leading-snug">
                        {meta.label}
                      </div>
                      {errorRow === errKey && (
                        <div className="text-meta text-bad2 mt-0.5">
                          Не удалось сохранить — попробуйте ещё
                        </div>
                      )}
                    </div>
                    <Toggle
                      checked={checked}
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
