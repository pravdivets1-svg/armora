// Список заказов — modern 2026 style.

import Link from 'next/link';
import { Plus, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Stage } from '@prisma/client';

import { requireUser } from '@/lib/auth-helpers';
import { listOrders, listAssignableUsers } from '@/lib/orders';
import { STAGE_LABEL, STAGE_ORDER, ROLE_LABEL } from '@/lib/labels';
import { fmtMoney, fmtDateTime, shortName } from '@/lib/format';
import { StageBadge } from '@/components/stage-badge';
import { Button } from '@/components/ui';

export const metadata = { title: 'Заказы — Armora' };

type Search = { q?: string; stage?: string; user?: string; page?: string };

export default async function OrdersPage({ searchParams }: { searchParams: Search }) {
  const me = await requireUser();

  const stage = (STAGE_ORDER as string[]).includes(searchParams.stage ?? '')
    ? (searchParams.stage as Stage)
    : undefined;

  const { items, total, page, pageCount } = await listOrders(me, {
    q: searchParams.q,
    stage,
    userId: searchParams.user,
    page: Number(searchParams.page) || 1,
  });

  const assignable = await listAssignableUsers();

  return (
    <main className="max-w-6xl mx-auto px-6 py-12 space-y-8">
      {/* Заголовок: большой, с подзаголовком */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-display text-ink-900">Заказы</h1>
          <div className="text-[14px] text-ink-500 mt-2">
            {total} {total === 1 ? 'заказ' : total < 5 ? 'заказа' : 'заказов'} в работе
          </div>
        </div>
        {(me.role === 'director' || me.role === 'manager') && (
          <Link href="/orders/new">
            <Button variant="primary">
              <Plus size={15} /> Новый заказ
            </Button>
          </Link>
        )}
      </div>

      {/* Фильтры — белая панель */}
      <form
        method="get"
        className="bg-white border border-line rounded-lg p-2 flex flex-col md:flex-row gap-2"
      >
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            type="search"
            name="q"
            defaultValue={searchParams.q ?? ''}
            placeholder="Поиск по ФИО или телефону"
            className="w-full bg-transparent text-ink-900 rounded-md pl-10 pr-3 py-2 text-[14px]
                       placeholder:text-ink-400 focus:outline-none"
          />
        </div>
        <select
          name="stage"
          defaultValue={searchParams.stage ?? ''}
          className="field bg-canvas border-0 text-ink-900 rounded-md px-3 py-2 text-[14px]
                     md:w-52 focus:outline-none"
        >
          <option value="">Все этапы</option>
          {STAGE_ORDER.map((s) => (
            <option key={s} value={s}>{STAGE_LABEL[s]}</option>
          ))}
        </select>
        <select
          name="user"
          defaultValue={searchParams.user ?? ''}
          className="field bg-canvas border-0 text-ink-900 rounded-md px-3 py-2 text-[14px]
                     md:w-56 focus:outline-none"
        >
          <option value="">Все сотрудники</option>
          {assignable.map((u) => (
            <option key={u.id} value={u.id}>
              {u.fullName} ({ROLE_LABEL[u.role].toLowerCase()})
            </option>
          ))}
        </select>
        <button type="submit" className="hidden" />
      </form>

      {/* Десктоп-таблица — внутри карточки с тонкой рамкой */}
      <div className="hidden md:block bg-white border border-line rounded-lg overflow-hidden">
        <table className="w-full text-[14px]">
          <thead>
            <tr className="border-b border-line text-ink-500 text-left">
              <th className="px-5 py-3 font-medium w-14 text-[12px]">№</th>
              <th className="px-5 py-3 font-medium text-[12px]">Клиент</th>
              <th className="px-5 py-3 font-medium text-[12px]">Телефон</th>
              <th className="px-5 py-3 font-medium text-[12px]">Этап</th>
              <th className="px-5 py-3 font-medium text-[12px]">Замер</th>
              <th className="px-5 py-3 font-medium text-[12px]">Установка</th>
              <th className="px-5 py-3 font-medium text-[12px] text-right">Сумма</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-20 text-center text-ink-400">
                  Заказов нет
                </td>
              </tr>
            )}
            {items.map((o) => (
              <tr key={o.id} className="border-b border-line/60 last:border-0 hover-row">
                <td className="px-5 py-3.5 text-ink-500 tabular-nums">
                  <Link href={`/orders/${o.id}`} className="block">{o.number}</Link>
                </td>
                <td className="px-5 py-3.5 font-medium text-ink-900">
                  <Link href={`/orders/${o.id}`} className="block">{o.clientName}</Link>
                </td>
                <td className="px-5 py-3.5 text-ink-700 tabular-nums">{o.clientPhone}</td>
                <td className="px-5 py-3.5"><StageBadge stage={o.stage} /></td>
                <td className="px-5 py-3.5 text-ink-700">
                  {o.surveyAt ? (
                    <>
                      {fmtDateTime(o.surveyAt)}
                      {o.surveyor && <span className="text-ink-500"> · {shortName(o.surveyor.fullName)}</span>}
                    </>
                  ) : (
                    <span className="text-ink-400">—</span>
                  )}
                </td>
                <td className="px-5 py-3.5 text-ink-700">
                  {o.installAt ? (
                    <>
                      {fmtDateTime(o.installAt)}
                      {o.installer && <span className="text-ink-500"> · {shortName(o.installer.fullName)}</span>}
                    </>
                  ) : (
                    <span className="text-ink-400">—</span>
                  )}
                </td>
                <td className="px-5 py-3.5 text-right font-medium text-ink-900 tabular-nums">
                  {Number(o.totalAmount) > 0 ? (
                    fmtMoney(o.totalAmount as unknown as number)
                  ) : (
                    <span className="text-ink-400 font-normal">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Мобильные карточки */}
      <div className="md:hidden space-y-2">
        {items.length === 0 && (
          <div className="text-center text-ink-400 py-12">Заказов нет</div>
        )}
        {items.map((o) => (
          <Link
            key={o.id}
            href={`/orders/${o.id}`}
            className="block bg-white border border-line rounded-lg p-4"
          >
            <div className="flex justify-between items-start gap-3">
              <div className="min-w-0">
                <div className="text-[11px] text-ink-500 uppercase tracking-wide">№ {o.number}</div>
                <div className="font-medium truncate text-ink-900 mt-0.5">{o.clientName}</div>
                <div className="text-[13px] text-ink-500 tabular-nums">{o.clientPhone}</div>
              </div>
              <StageBadge stage={o.stage} />
            </div>
            {(o.surveyAt || o.installAt) && (
              <div className="mt-3 text-[12px] text-ink-500 pt-3 border-t border-line">
                {o.surveyAt && (
                  <>Замер {fmtDateTime(o.surveyAt)}{o.surveyor && ` · ${shortName(o.surveyor.fullName)}`}</>
                )}
                {o.installAt && (
                  <>{o.surveyAt && <br />}Установка {fmtDateTime(o.installAt)}</>
                )}
              </div>
            )}
          </Link>
        ))}
      </div>

      {pageCount > 1 && (
        <div className="flex justify-between items-center text-[13px] text-ink-500">
          <div>Страница {page} из {pageCount}</div>
          <div className="flex gap-1">
            <PageLink page={page - 1} disabled={page <= 1} searchParams={searchParams}>
              <ChevronLeft size={14} />
            </PageLink>
            <PageLink page={page + 1} disabled={page >= pageCount} searchParams={searchParams}>
              <ChevronRight size={14} />
            </PageLink>
          </div>
        </div>
      )}
    </main>
  );
}

function PageLink({
  page,
  disabled,
  searchParams,
  children,
}: {
  page: number;
  disabled?: boolean;
  searchParams: Search;
  children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <span className="inline-flex items-center justify-center w-8 h-8 rounded-md text-ink-300 border border-line">
        {children}
      </span>
    );
  }
  const sp = new URLSearchParams();
  if (searchParams.q) sp.set('q', searchParams.q);
  if (searchParams.stage) sp.set('stage', searchParams.stage);
  if (searchParams.user) sp.set('user', searchParams.user);
  sp.set('page', String(page));
  return (
    <Link
      href={`/orders?${sp.toString()}`}
      className="inline-flex items-center justify-center w-8 h-8 rounded-md text-ink-700 hover:bg-ink-900/[0.04] border border-line"
    >
      {children}
    </Link>
  );
}
