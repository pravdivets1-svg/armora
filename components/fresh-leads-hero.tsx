// Hero-блок «Свежие — нужен ответ» на верху /leads.
// Показывает 1-3 заявки stage=new, отсортированных по свежести.
// Цвет urgency-индикатора:
//   ok2  — <10 мин (свежак, успеваем)
//   warn2 — <60 мин (надо звонить)
//   bad2 — >60 мин (горит)
// Большая кнопка «Позвонить» — tel: на телефон клиента, в один тап.

import Link from 'next/link';
import { Phone, ChevronRight } from 'lucide-react';
import { prisma } from '@/lib/prisma';

function phoneDigits(p: string): string {
  return p.replace(/\D/g, '');
}

function fmtPhone(p: string): string {
  return p.replace(/(\+7)(\d{3})(\d{3})(\d{2})(\d{2})/, '$1 $2 $3-$4-$5');
}

function urgency(createdAt: Date): { color: 'ok2' | 'warn2' | 'bad2'; label: string } {
  const minutes = (Date.now() - createdAt.getTime()) / 60_000;
  if (minutes < 10) return { color: 'ok2',  label: `${Math.max(0, Math.floor(minutes))} мин назад` };
  if (minutes < 60) return { color: 'warn2', label: `${Math.floor(minutes)} мин назад` };
  const hours = minutes / 60;
  if (hours < 24) return { color: 'bad2', label: `${Math.floor(hours)} ч назад` };
  return { color: 'bad2', label: `${Math.floor(hours / 24)} д назад` };
}

const URGENCY_RING: Record<'ok2' | 'warn2' | 'bad2', string> = {
  ok2:   'ring-ok2/30',
  warn2: 'ring-warn2/40',
  bad2:  'ring-bad2/45',
};

const URGENCY_STRIPE: Record<'ok2' | 'warn2' | 'bad2', string> = {
  ok2:   'bg-ok2',
  warn2: 'bg-warn2',
  bad2:  'bg-bad2',
};

const URGENCY_TEXT: Record<'ok2' | 'warn2' | 'bad2', string> = {
  ok2:   'text-ok2',
  warn2: 'text-warn2',
  bad2:  'text-bad2',
};

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
    <section
      aria-label="Свежие заявки"
      className="glass-surface-strong rounded-2xl overflow-hidden"
    >
      <header className="flex items-center justify-between px-4 pt-3.5 pb-2.5">
        <h2 className="text-meta uppercase tracking-wide text-text3 font-semibold">
          Свежие — нужен ответ
        </h2>
        <span className="text-meta text-text3 tabular-nums">{fresh.length}</span>
      </header>
      <ul className="divide-y divide-white/30">
        {fresh.map((l) => {
          const u = urgency(l.createdAt);
          const tel = `tel:+${phoneDigits(l.clientPhone)}`;
          return (
            <li key={l.id} className={`relative ring-1 ${URGENCY_RING[u.color]} ring-inset`}>
              <span aria-hidden className={`absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full ${URGENCY_STRIPE[u.color]}`} />
              <div className="flex items-center gap-3 px-4 py-3 pl-5 min-h-[68px]">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-meta font-semibold uppercase tracking-wide ${URGENCY_TEXT[u.color]}`}>
                      {u.label}
                    </span>
                    <span className="text-meta text-text3 tabular-nums">№ {l.number}</span>
                  </div>
                  <Link
                    href={`/leads/${l.id}`}
                    className="block text-[14px] text-text1 font-medium truncate
                               hover:underline focus:outline-none focus-visible:underline"
                  >
                    {l.clientName}
                  </Link>
                  <div className="text-meta text-text3 tabular-nums truncate">
                    {fmtPhone(l.clientPhone)}
                    {l.clientAddress && <> · {l.clientAddress}</>}
                  </div>
                </div>
                {/* Большой Call-кнопка */}
                <a
                  href={tel}
                  aria-label={`Позвонить ${l.clientName}`}
                  className="shrink-0 inline-flex items-center justify-center
                             w-12 h-12 rounded-full glass-button-dark text-white
                             active:scale-[0.95] transition-transform duration-fast
                             focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <Phone size={18} />
                </a>
                <Link
                  href={`/leads/${l.id}`}
                  aria-label="Открыть"
                  className="shrink-0 inline-flex items-center justify-center w-8 h-8
                             rounded-full text-text3 hover:text-text1 transition-colors"
                >
                  <ChevronRight size={16} />
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
