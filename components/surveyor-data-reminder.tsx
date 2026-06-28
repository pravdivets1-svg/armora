import Link from 'next/link';
import { ClipboardList, ChevronRight } from 'lucide-react';
import type { Role } from '@prisma/client';

import { prisma } from '@/lib/prisma';

// Напоминание замерщику внести важные данные после замера: ФОТО ДОГОВОРА и ЦЕНУ.
// (Размеры/комментарий — не критичны, их здесь не проверяем.)
// Показываем ТОЛЬКО при наличии пробелов и если директор не выключил тумблер.
// Само исчезает, когда данные внесены — поэтому без крестика.
//
// Берём заказы на этапе «Замер сделан» (survey_done) этого замерщика, где
// не загружено фото договора ИЛИ не проставлена цена по договору (totalAmount = 0).
// Просроченные невыполненные замеры (survey_scheduled) сюда НЕ попадают —
// их уже показывает блок «Просрочено».
export async function SurveyorDataReminder({
  me,
}: {
  me: { id: string; role: Role };
}) {
  if (me.role !== 'surveyor') return null;

  const cfg = await prisma.controlReminderConfig.findUnique({
    where: { id: 'default' },
    select: { surveyorDataReminderEnabled: true },
  });
  // Нет ряда настроек = по умолчанию включено.
  if (cfg && cfg.surveyorDataReminderEnabled === false) return null;

  const orders = await prisma.order.findMany({
    where: {
      surveyorId: me.id,
      stage: 'survey_done',
      OR: [
        { totalAmount: { lte: 0 } },
        { photos: { none: { kind: 'contract' } } },
      ],
    },
    select: {
      id: true,
      number: true,
      clientName: true,
      clientAddress: true,
      totalAmount: true,
      photos: { where: { kind: 'contract' }, select: { id: true }, take: 1 },
    },
    orderBy: { updatedAt: 'asc' },
    take: 8,
  });

  if (orders.length === 0) return null;

  return (
    <section
      aria-label="Напоминание: внесите договор и цену"
      className="rounded-md border border-warn2/30 bg-warn2/[0.06] overflow-hidden"
    >
      <header className="flex items-start gap-2.5 px-4 pt-3 pb-2.5">
        <ClipboardList size={16} className="text-warn2 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <h2 className="text-h2 text-text1 leading-snug">Внесите договор и цену</h2>
          <p className="text-meta text-text3 mt-0.5 leading-snug">
            После замера загрузите фото договора и укажите цену — пока не забылось.
          </p>
        </div>
        <span className="shrink-0 text-meta tabular-nums font-semibold text-warn2">
          {orders.length}
        </span>
      </header>

      <ul className="divide-y divide-warn2/15 border-t border-warn2/15">
        {orders.map((o) => {
          const noPrice = Number(o.totalAmount) <= 0;
          const noContract = o.photos.length === 0;
          const reasonLabel =
            noContract && noPrice ? 'нет договора и цены' : noContract ? 'нет договора' : 'нет цены';
          // Отсутствие договора (юр. документ) — серьёзнее, красный чип; только цена — жёлтый.
          const reasonChip = noContract ? 'bg-bad2/10 text-bad2' : 'bg-warn2/15 text-warn2';
          return (
            <li key={o.id}>
              <Link
                href={`/orders/${o.id}`}
                className="flex items-center gap-3 px-4 py-2.5 min-h-[44px]
                           transition-colors duration-fast
                           hover:bg-warn2/[0.05] active:scale-[0.99]
                           focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset"
              >
                <span className="flex-1 min-w-0">
                  <span className="block text-[14px] text-text1 truncate">{o.clientName}</span>
                  {o.clientAddress && (
                    <span className="block text-[12.5px] text-text3 truncate">{o.clientAddress}</span>
                  )}
                </span>

                <span
                  className={`shrink-0 inline-flex items-center h-[18px] px-1.5 rounded
                              text-[11px] font-semibold ${reasonChip}`}
                >
                  {reasonLabel}
                </span>

                <span className="shrink-0 text-[12px] tabular-nums text-text3">№ {o.number}</span>
                <ChevronRight size={15} className="shrink-0 text-text3" />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
