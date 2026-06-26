// Hero-блок «Свежие — нужен ответ» на верху /leads.
// Показывает 1-3 заявки stage=new, отсортированных по свежести.
// Цвет urgency-индикатора:
//   ok2   — <10 мин (свежак, успеваем)
//   warn2 — <60 мин (надо звонить)
//   bad2  — >60 мин (горит)
// Каждая заявка — отдельная карточка UrgentLeadCard с крупной кнопкой
// «Позвонить» (tel:) и действием «Связались» прямо из списка.

import { prisma } from '@/lib/prisma';
import { UrgentLeadCard } from '@/components/urgent-lead-card';

function urgency(createdAt: Date): { color: 'ok2' | 'warn2' | 'bad2'; label: string } {
  const minutes = (Date.now() - createdAt.getTime()) / 60_000;
  if (minutes < 10) return { color: 'ok2',  label: `${Math.max(0, Math.floor(minutes))} мин назад` };
  if (minutes < 60) return { color: 'warn2', label: `${Math.floor(minutes)} мин назад` };
  const hours = minutes / 60;
  if (hours < 24) return { color: 'bad2', label: `${Math.floor(hours)} ч назад` };
  return { color: 'bad2', label: `${Math.floor(hours / 24)} д назад` };
}

export async function FreshLeadsHero() {
  const fresh = await prisma.lead.findMany({
    where: { stage: 'new' },
    orderBy: { createdAt: 'desc' },
    take: 3,
    select: {
      id: true, number: true, clientName: true, clientPhone: true,
      clientAddress: true, createdAt: true,
    },
  });

  if (fresh.length === 0) return null;

  return (
    <section aria-label="Свежие заявки" className="space-y-2">
      <header className="flex items-center justify-between px-1">
        <h2 className="text-meta uppercase tracking-wide text-text2 font-semibold">
          Свежие — нужен ответ
        </h2>
        <span className="text-meta text-text2 tabular-nums">{fresh.length}</span>
      </header>

      <div className="space-y-2">
        {fresh.map((l) => {
          const u = urgency(l.createdAt);
          return (
            <UrgentLeadCard
              key={l.id}
              id={l.id}
              number={l.number}
              clientName={l.clientName}
              phone={l.clientPhone}
              address={l.clientAddress}
              color={u.color}
              ageLabel={u.label}
            />
          );
        })}
      </div>
    </section>
  );
}
