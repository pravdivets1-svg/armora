// Панель директора: заказы, ожидающие подтверждения закрытия.
// Доступ только для роли director.

import Link from 'next/link';
import { CheckCircle2, XCircle, AlertTriangle, ChevronRight } from 'lucide-react';

import { requireRole } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { fmtMoney, fmtDateTime } from '@/lib/format';
import { Metric, MetricCard } from '@/components/metric';
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
    <main className="max-w-5xl mx-auto px-6 py-12 space-y-8">
      <div>
        <h1 className="text-display text-ink-900">На закрытие</h1>
        <div className="text-[14px] text-ink-500 mt-2">
          Заказы, поданные на подтверждение. Только директор может закрыть.
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="bg-white border border-line rounded-lg p-16 text-center">
          <CheckCircle2 size={28} className="mx-auto text-emerald-500 mb-4" />
          <div className="text-ink-900 font-medium">Очередь пустая</div>
          <div className="text-ink-500 text-[13px] mt-1">Нет заказов, ожидающих закрытия</div>
        </div>
      ) : (
        <>
          {/* Stat-ряд: единый стиль через MetricCard, без 3 разных цветных tinted-фонов */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <MetricCard>
              <Metric label="В очереди" value={orders.length} size="lg" tone="default" />
            </MetricCard>
            <MetricCard>
              <Metric label="Сумма по договорам" value={fmtMoney(totalSum)} size="lg" tone="default" />
            </MetricCard>
            <MetricCard>
              <Metric
                label="Совокупная маржа"
                value={(totalMargin >= 0 ? '+' : '') + fmtMoney(totalMargin)}
                size="lg"
                tone={totalMargin >= 0 ? 'ok' : 'bad'}
              />
            </MetricCard>
          </div>

          <div className="space-y-3">
            {orders.map((o) => {
              const remainingForClient = Math.max(0, Number(o.totalAmount) - Number(o.prepayment) - Number(o.finalPayment));
              const margin = Number(o.totalAmount) - Number(o.costAmount);
              const negativeMargin = Number(o.costAmount) > Number(o.totalAmount);
              const incompleteFinances =
                Number(o.totalAmount) <= 0 ||
                Number(o.prepayment) <= 0 ||
                Number(o.finalPayment) <= 0 ||
                Number(o.costAmount) <= 0;

              return (
                <div key={o.id} className="bg-white border border-line rounded-lg overflow-hidden">
                  {/* Шапка карточки: слева клиент, справа hero-маржа */}
                  <div className="flex items-stretch justify-between gap-4 px-5 py-4 border-b border-line">
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] text-ink-500 uppercase tracking-wider">№ {o.number}</div>
                      <Link
                        href={`/orders/${o.id}`}
                        className="font-semibold text-ink-900 truncate block hover:underline mt-0.5"
                      >
                        {o.clientName}
                      </Link>
                      <div className="text-[12px] text-ink-500 truncate mt-0.5">{o.clientAddress}</div>
                    </div>
                    {/* Hero маржа — самое важное число для директора */}
                    <Metric
                      label="Маржа"
                      value={(margin >= 0 ? '+' : '') + fmtMoney(margin)}
                      tone={margin >= 0 ? 'ok' : 'bad'}
                      size="md"
                      className="text-right items-end shrink-0"
                    />
                  </div>

                  {/* Финансы — все в одном весе, маржа выше */}
                  <div className="px-5 py-3 grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 text-[13px] border-b border-line/60">
                    <Cell label="Договор"        value={fmtMoney(o.totalAmount as any)} />
                    <Cell label="Аванс"          value={fmtMoney(o.prepayment as any)} />
                    <Cell label="Остаток получен" value={fmtMoney(o.finalPayment as any)} />
                    <Cell label="Себестоимость"  value={fmtMoney(o.costAmount as any)} muted />
                  </div>

                  {/* Алармы */}
                  {(incompleteFinances || negativeMargin || remainingForClient > 0) && (
                    <div className="px-5 py-3 space-y-1.5 bg-canvas/50">
                      {incompleteFinances && (
                        <div className="flex items-center gap-2 text-[12px] text-bad">
                          <AlertTriangle size={12} />
                          Не все 4 финансовых поля заполнены — закрытие невозможно
                        </div>
                      )}
                      {negativeMargin && (
                        <div className="flex items-center gap-2 text-[12px] text-amber-700">
                          <AlertTriangle size={12} />
                          Себестоимость выше цены — заказ убыточен на {fmtMoney(Number(o.costAmount) - Number(o.totalAmount))}
                        </div>
                      )}
                      {remainingForClient > 0 && (
                        <div className="flex items-center gap-2 text-[12px] text-amber-700">
                          <AlertTriangle size={12} />
                          Клиент должен ещё {fmtMoney(remainingForClient)}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Назначения */}
                  <div className="px-5 py-2.5 text-[12px] text-ink-500 flex items-center gap-2 flex-wrap">
                    <span>Замер: <span className="text-ink-700">{o.surveyor?.fullName ?? '—'}</span></span>
                    {o.surveyAt && <span className="text-ink-400">· {fmtDateTime(o.surveyAt)}</span>}
                    <span className="text-ink-300">|</span>
                    <span>Установка: <span className="text-ink-700">{o.installer?.fullName ?? '—'}</span></span>
                    {o.installAt && <span className="text-ink-400">· {fmtDateTime(o.installAt)}</span>}
                    <Link
                      href={`/orders/${o.id}`}
                      className="ml-auto inline-flex items-center gap-1 text-ink-700 hover:text-ink-900 font-medium"
                    >
                      Открыть карточку <ChevronRight size={12} />
                    </Link>
                  </div>

                  {/* Действия — sticky-стиль bottom bar */}
                  <div className="px-5 py-3 border-t border-line bg-canvas/40 flex gap-2">
                    <form action={approveAction.bind(null, o.id)} className="flex-1">
                      <button
                        type="submit"
                        disabled={incompleteFinances}
                        className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md
                                   bg-ok hover:bg-[#166534] text-white font-medium text-[14px]
                                   disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <CheckCircle2 size={14} /> Подтвердить и закрыть
                      </button>
                    </form>
                    <form action={rejectAction.bind(null, o.id)}>
                      <button
                        type="submit"
                        title="Вернуть в «Установлена» для доработки"
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md
                                   bg-white hover:bg-canvas text-ink-700 border border-line text-[14px]"
                      >
                        <XCircle size={14} /> Вернуть
                      </button>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </main>
  );
}

function Cell({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-ink-500 font-medium">{label}</div>
      <div className={`mt-0.5 font-semibold tabular-nums ${muted ? 'text-ink-700' : 'text-ink-900'}`}>
        {value}
      </div>
    </div>
  );
}
