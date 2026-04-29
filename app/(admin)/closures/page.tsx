// Панель директора: заказы, ожидающие подтверждения закрытия.
// Доступ только для роли director.

import Link from 'next/link';
import { CheckCircle2, XCircle, AlertTriangle, ChevronRight } from 'lucide-react';

import { requireRole } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { fmtMoney, fmtDateTime } from '@/lib/format';
import { approveAction, rejectAction } from './actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'На закрытие — Armora' };

export default async function ClosuresPage() {
  await requireRole(['director']);

  const orders = await prisma.order.findMany({
    where: { stage: 'pending_closure' },
    orderBy: { updatedAt: 'asc' },
    include: {
      surveyor:  { select: { fullName: true } },
      installer: { select: { fullName: true } },
    },
  });

  const totalSum = orders.reduce((s, o) => s + Number(o.totalAmount), 0);
  const totalMargin = orders.reduce((s, o) => s + (Number(o.totalAmount) - Number(o.costAmount)), 0);

  return (
    <main className="max-w-5xl mx-auto px-6 py-12 space-y-8">
      <div>
        <h1 className="text-display text-ink-900">На закрытие</h1>
        <div className="text-[14px] text-ink-500 mt-2">
          Заказы, поданные на подтверждение. Только директор может закрыть.
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="bg-white border border-line border-dashed rounded-lg p-12 text-center text-ink-400">
          Очередь пустая — нет заказов на подтверждение
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Stat label="В очереди" value={orders.length} tone="violet" />
            <Stat label="Сумма по договорам" value={fmtMoney(totalSum)} tone="indigo" />
            <Stat
              label="Совокупная маржа"
              value={fmtMoney(totalMargin)}
              tone={totalMargin >= 0 ? 'green' : 'red'}
            />
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
                  {/* Шапка карточки: клиент + ссылка */}
                  <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-line bg-canvas/40">
                    <div className="min-w-0">
                      <div className="text-[11px] text-ink-500 uppercase tracking-wide">№ {o.number}</div>
                      <Link href={`/orders/${o.id}`} className="font-semibold text-ink-900 truncate block hover:underline">
                        {o.clientName}
                      </Link>
                      <div className="text-[12px] text-ink-500 truncate">{o.clientAddress}</div>
                    </div>
                    <Link
                      href={`/orders/${o.id}`}
                      className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-[13px] text-ink-700 hover:bg-canvas border border-line"
                    >
                      Открыть карточку <ChevronRight size={13} />
                    </Link>
                  </div>

                  {/* Финансы */}
                  <div className="px-5 py-4 grid grid-cols-2 md:grid-cols-5 gap-3 text-[13px]">
                    <Cell label="Договор"      value={fmtMoney(o.totalAmount as any)} />
                    <Cell label="Аванс"        value={fmtMoney(o.prepayment as any)} />
                    <Cell label="Остаток получен" value={fmtMoney(o.finalPayment as any)} />
                    <Cell label="Себестоимость" value={fmtMoney(o.costAmount as any)} muted />
                    <Cell
                      label="Маржа"
                      value={(margin >= 0 ? '+' : '') + fmtMoney(margin)}
                      tone={margin >= 0 ? 'ok' : 'bad'}
                    />
                  </div>

                  {/* Алармы */}
                  {(incompleteFinances || negativeMargin || remainingForClient > 0) && (
                    <div className="px-5 pb-3 space-y-1">
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
                          Клиент должен ещё {fmtMoney(remainingForClient)} (договор минус аванс минус остаток)
                        </div>
                      )}
                    </div>
                  )}

                  {/* Назначения */}
                  <div className="px-5 pb-4 text-[12px] text-ink-500">
                    Замер: {o.surveyor?.fullName ?? '—'}
                    {o.surveyAt && <> · {fmtDateTime(o.surveyAt)}</>}
                    {' '}· Установка: {o.installer?.fullName ?? '—'}
                    {o.installAt && <> · {fmtDateTime(o.installAt)}</>}
                  </div>

                  {/* Действия */}
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

const STAT_TONE = {
  violet: 'bg-violet-500/5 border-violet-500/20 text-violet-700',
  indigo: 'bg-indigo-500/5 border-indigo-500/20 text-indigo-700',
  green:  'bg-emerald-500/5 border-emerald-500/20 text-emerald-700',
  red:    'bg-bad/5 border-bad/20 text-bad',
} as const;

function Stat({ label, value, tone }: { label: string; value: React.ReactNode; tone: keyof typeof STAT_TONE }) {
  return (
    <div className={`rounded-lg border bg-white p-4 ${STAT_TONE[tone]}`}>
      <div className="text-[12px] uppercase tracking-wide font-medium">{label}</div>
      <div className="mt-2 text-[20px] font-semibold tabular-nums text-ink-900 leading-tight">{value}</div>
    </div>
  );
}

function Cell({
  label,
  value,
  muted,
  tone,
}: {
  label: string;
  value: string;
  muted?: boolean;
  tone?: 'ok' | 'bad';
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-ink-500 font-medium">{label}</div>
      <div
        className={`mt-1 font-semibold tabular-nums ${
          tone === 'ok' ? 'text-ok' :
          tone === 'bad' ? 'text-bad' :
          muted ? 'text-ink-700' : 'text-ink-900'
        }`}
      >
        {value}
      </div>
    </div>
  );
}
