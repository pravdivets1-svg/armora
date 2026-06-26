// Панель директора: заказы, ожидающие подтверждения закрытия.
// Доступ только для роли director.

import Link from 'next/link';
import { CheckCircle2, XCircle, AlertTriangle, ChevronRight } from 'lucide-react';

import { requireRole } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { fmtMoney, fmtDateTime } from '@/lib/format';
import { Empty, PageHeader, Button } from '@/components/uikit';
import { approveAction, rejectAction } from './actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'На закрытие — Armora' };

export default async function ClosuresPage() {
  await requireRole(['director']);

  const [orders, agg] = await Promise.all([
    prisma.order.findMany({
      where: { stage: 'pending_closure' },
      orderBy: { updatedAt: 'asc' },
      include: {
        surveyor:  { select: { fullName: true } },
        installer: { select: { fullName: true } },
      },
    }),
    prisma.order.aggregate({
      where: { stage: 'pending_closure' },
      _sum: { totalAmount: true, costAmount: true },
    }),
  ]);

  const totalSum    = Number(agg._sum.totalAmount ?? 0);
  const totalCost   = Number(agg._sum.costAmount ?? 0);
  const totalMargin = totalSum - totalCost;

  return (
    <>
      <PageHeader
        title="На закрытие"
        sub="Заказы, поданные на подтверждение"
      />

      <main className="max-w-5xl mx-auto px-4 lg:px-6 py-4 space-y-3 pb-12">
        {orders.length === 0 ? (
          <Empty
            icon={CheckCircle2}
            title="Очередь пустая"
            hint="Нет заказов, ожидающих закрытия"
          />
        ) : (
          <>
            {/* Сводка — плоский ряд, без цветных tinted-фонов */}
            <div className="bg-card border border-borderc rounded-lg grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-borderc/60">
              <SummaryCell label="В очереди" value={String(orders.length)} />
              <SummaryCell label="Сумма договоров" value={fmtMoney(totalSum)} />
              <SummaryCell
                label="Совокупная маржа"
                value={(totalMargin >= 0 ? '+' : '') + fmtMoney(totalMargin)}
                tone={totalMargin >= 0 ? 'ok' : 'bad'}
              />
            </div>

            <ul className="bg-card border border-borderc rounded-lg divide-y divide-borderc/60">
              {orders.map((o) => {
                const remainingForClient = Math.max(
                  0,
                  Number(o.totalAmount) - Number(o.prepayment) - Number(o.finalPayment),
                );
                const margin = Number(o.totalAmount) - Number(o.costAmount);
                const negativeMargin = Number(o.costAmount) > Number(o.totalAmount);
                const incompleteFinances =
                  Number(o.totalAmount) <= 0 ||
                  Number(o.prepayment) <= 0 ||
                  Number(o.finalPayment) <= 0 ||
                  Number(o.costAmount) <= 0;

                const warnings: { text: string; tone: 'bad' | 'warn' }[] = [];
                if (incompleteFinances) {
                  warnings.push({ text: 'Не все 4 финансовых поля заполнены — закрытие невозможно', tone: 'bad' });
                }
                if (negativeMargin) {
                  warnings.push({
                    text: `Себестоимость выше цены — убыток ${fmtMoney(Number(o.costAmount) - Number(o.totalAmount))}`,
                    tone: 'warn',
                  });
                }
                if (remainingForClient > 0) {
                  warnings.push({ text: `Клиент должен ещё ${fmtMoney(remainingForClient)}`, tone: 'warn' });
                }

                return (
                  <li key={o.id} className="px-4 lg:px-5 py-3.5 hover:bg-subtle/60 transition-colors">
                    {/* Шапка: клиент слева, сумма + маржа справа */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2">
                          <span className="text-meta text-text3 tabular-nums">№ {o.number}</span>
                        </div>
                        <Link
                          href={`/orders/${o.id}`}
                          className="block mt-0.5 text-text1 font-medium truncate hover:underline"
                        >
                          {o.clientName}
                        </Link>
                        <div className="text-meta text-text2 truncate mt-0.5">{o.clientAddress}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-h2 tabular-nums text-text1">{fmtMoney(o.totalAmount as any)}</div>
                        <div
                          className={`text-meta tabular-nums mt-0.5 ${
                            margin >= 0 ? 'text-ok2' : 'text-bad2'
                          }`}
                        >
                          маржа {(margin >= 0 ? '+' : '') + fmtMoney(margin)}
                        </div>
                      </div>
                    </div>

                    {/* Финансы — компактный inline-ряд */}
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-meta text-text3">
                      <FinCell label="Аванс" value={fmtMoney(o.prepayment as any)} />
                      <FinCell label="Остаток" value={fmtMoney(o.finalPayment as any)} />
                      <FinCell label="Себест." value={fmtMoney(o.costAmount as any)} />
                      <FinCell
                        label="Назначения"
                        value={`${o.surveyor?.fullName ?? '—'} · ${o.installer?.fullName ?? '—'}`}
                      />
                      {o.installAt && (
                        <FinCell label="Установка" value={fmtDateTime(o.installAt)} />
                      )}
                    </div>

                    {/* Алармы */}
                    {warnings.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {warnings.map((w, i) => (
                          <div
                            key={i}
                            className={`flex items-start gap-1.5 text-meta ${
                              w.tone === 'bad' ? 'text-bad2' : 'text-warn2'
                            }`}
                          >
                            <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                            <span>{w.text}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Действия */}
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <Link
                        href={`/orders/${o.id}`}
                        className="inline-flex items-center gap-1 text-meta text-text2 hover:text-text1"
                      >
                        Открыть карточку
                        <ChevronRight size={12} />
                      </Link>
                      <div className="flex gap-2">
                        <form action={rejectAction.bind(null, o.id)}>
                          <Button
                            type="submit"
                            variant="secondary"
                            size="sm"
                            title="Вернуть в «Установлена» для доработки"
                          >
                            <XCircle size={14} /> Вернуть
                          </Button>
                        </form>
                        <form action={approveAction.bind(null, o.id)}>
                          <Button
                            type="submit"
                            variant="accent"
                            size="sm"
                            disabled={incompleteFinances}
                          >
                            <CheckCircle2 size={14} /> Закрыть заказ
                          </Button>
                        </form>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </main>
    </>
  );
}

function SummaryCell({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'ok' | 'bad';
}) {
  const cls =
    tone === 'ok' ? 'text-ok2' : tone === 'bad' ? 'text-bad2' : 'text-text1';
  return (
    <div className="px-4 py-3 min-w-0">
      <div className="text-meta text-text3">{label}</div>
      <div className={`mt-0.5 text-h2 tabular-nums ${cls}`}>{value}</div>
    </div>
  );
}

function FinCell({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-baseline gap-1">
      <span className="text-text3">{label}</span>
      <span className="text-text1 tabular-nums">{value}</span>
    </span>
  );
}
