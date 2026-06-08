// Хвосты — баннер-напоминание на верху /orders.
// Серверно подсчитываем категории "требуют внимания":
//   - просроченные замеры (survey_scheduled и surveyAt < вчера)
//   - просроченные установки (ready_to_install и installAt < вчера)
//   - застрявшие в производстве (production > 14 дней)
//   - застрявшие на закрытии (pending_closure > 3 дней, только директор)
// Каждый пункт — ссылка с фильтром.

import Link from 'next/link';
import { Bell, ChevronRight } from 'lucide-react';
import type { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { isStaff } from '@/lib/auth-helpers';
import { mskDayStart } from '@/lib/format';

type StaleCounts = {
  overdueSurveys:   number;
  overdueInstalls:  number;
  stuckProduction:  number;
  stuckClosure:     number;
};

export async function getStaleCounts(me: { id: string; role: Role }): Promise<StaleCounts> {
  const now = new Date();
  const todayStart = mskDayStart(now);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const threeDaysAgo    = new Date(now.getTime() - 3  * 24 * 60 * 60 * 1000);

  // Для нестаффа считаем только то, что назначено на меня.
  const mineOrAny = (asField: 'surveyorId' | 'installerId') =>
    isStaff(me.role) ? {} : { [asField]: me.id };

  const [overdueSurveys, overdueInstalls, stuckProduction, stuckClosure] = await Promise.all([
    prisma.order.count({
      where: {
        stage: 'survey_scheduled',
        surveyAt: { lt: todayStart },
        ...mineOrAny('surveyorId'),
      },
    }),
    prisma.order.count({
      where: {
        stage: 'ready_to_install',
        installAt: { lt: todayStart },
        ...mineOrAny('installerId'),
      },
    }),
    isStaff(me.role)
      ? prisma.order.count({
          where: { stage: 'production', updatedAt: { lt: fourteenDaysAgo } },
        })
      : Promise.resolve(0),
    me.role === 'director'
      ? prisma.order.count({
          where: { stage: 'pending_closure', updatedAt: { lt: threeDaysAgo } },
        })
      : Promise.resolve(0),
  ]);

  return { overdueSurveys, overdueInstalls, stuckProduction, stuckClosure };
}

export function StaleTasksBanner({ counts }: { counts: StaleCounts }) {
  const items: Array<{ key: string; label: string; href: string; n: number }> = [];

  if (counts.overdueSurveys > 0) {
    items.push({
      key: 'survey',
      label: `Просрочен${counts.overdueSurveys === 1 ? ' замер' : 'о замеров'}`,
      href: '/orders?stage=survey_scheduled',
      n: counts.overdueSurveys,
    });
  }
  if (counts.overdueInstalls > 0) {
    items.push({
      key: 'install',
      label: `Просрочен${counts.overdueInstalls === 1 ? 'а установка' : 'о установок'}`,
      href: '/orders?stage=ready_to_install',
      n: counts.overdueInstalls,
    });
  }
  if (counts.stuckProduction > 0) {
    items.push({
      key: 'prod',
      label: `Долго в производстве (>14 дн)`,
      href: '/orders?stage=production',
      n: counts.stuckProduction,
    });
  }
  if (counts.stuckClosure > 0) {
    items.push({
      key: 'closure',
      label: `Ждут вашего закрытия`,
      href: '/closures',
      n: counts.stuckClosure,
    });
  }

  if (items.length === 0) return null;

  const total = items.reduce((s, i) => s + i.n, 0);

  return (
    <section
      aria-label="Хвосты — задачи требуют внимания"
      className="rounded-md border border-warn2/25 bg-warn2/[0.05] overflow-hidden"
    >
      <header className="flex items-center gap-2 px-4 pt-3 pb-2">
        <Bell size={14} className="text-warn2 shrink-0" />
        <h2 className="text-meta text-warn2 font-semibold uppercase tracking-wide">
          Хвосты
        </h2>
        <span className="text-meta text-text3 tabular-nums">{total}</span>
      </header>
      <ul className="divide-y divide-warn2/15">
        {items.map((it) => (
          <li key={it.key}>
            <Link
              href={it.href}
              className="flex items-center gap-3 px-4 py-2.5 min-h-[44px]
                         transition-colors duration-fast
                         hover:bg-warn2/[0.04]
                         focus:outline-none focus-visible:ring-2 focus-visible:ring-warn2 focus-visible:ring-inset"
            >
              <span className="text-[14px] text-text1 flex-1 truncate">{it.label}</span>
              <span className="text-[14px] tabular-nums text-warn2 font-semibold shrink-0">
                {it.n}
              </span>
              <ChevronRight size={14} className="text-text3 shrink-0" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
