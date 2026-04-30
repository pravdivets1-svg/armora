// Список заказов — modern editorial 2026.
// Sticky фильтр-бар, тихие бейджи этапов (без заливки кроме pending),
// единая иерархия: title → meta → action.

import Link from 'next/link';
import { Plus, Search, ChevronLeft, ChevronRight, X, Inbox } from 'lucide-react';
import type { Stage } from '@prisma/client';

import { requireUser } from '@/lib/auth-helpers';
import { listOrders, listAssignableUsers } from '@/lib/orders';
import { STAGE_LABEL, STAGE_ORDER, ROLE_LABEL } from '@/lib/labels';
import { fmtDateTime, shortName } from '@/lib/format';
import { StageBadge } from '@/components/stage-badge';
import { EmptyState } from '@/components/empty-state';
import DensityToggle from '@/components/density-toggle';
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
  const activeFilters = [searchParams.q, stage, searchParams.user].filter(Boolean).length;

  return (
    <main className="max-w-6xl mx-auto px-6 py-10 space-y-6">
      {/* Заголовок: большой, с подзаголовком и primary CTA */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-[56px] md:text-[64px] leading-[0.95] tracking-tight text-ink-900">Заказы</h1>
          <div className="text-[14px] text-ink-500 mt-2">
            {total} {total === 1 ? 'заказ' : total < 5 ? 'заказа' : 'заказов'} в работе
          </div>
        </div>
        {(me.role === 'director' || me.role === 'manager') && (
          <div className="flex items-center gap-2">
            <DensityToggle />
            <Link href="/orders/new">
              <Button variant="primary">
                <Plus size={15} /> Новый заказ
              </Button>
            </Link>
          </div>
        )}
        {!(me.role === 'director' || me.role === 'manager') && <DensityToggle />}
      </div>

      {/* Sticky фильтр-бар. На скролле остаётся под шапкой (h-16=64px). */}
      <form
        method="get"
        className="sticky top-16 z-20 -mx-6 px-6 py-3 bg-canvas/85 backdrop-blur-md border-y border-line"
      >
        <div className="flex flex-col md:flex-row gap-2 items-stretch">
          {/* Поиск */}
          <div className="relative flex-1 min-w-0">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none" />
            <input
              type="search"
              name="q"
              defaultValue={searchParams.q ?? ''}
              placeholder="Поиск: № / ФИО / телефон / адрес"
              className="w-full bg-white border border-line text-ink-900 rounded-md pl-10 pr-3 py-2 text-[14px]
                         placeholder:text-ink-400 hover:border-ink-900/20
                         focus:outline-none focus:border-ink-900/30"
            />
          </div>
          {/* Этап */}
          <select
            name="stage"
            defaultValue={searchParams.stage ?? ''}
            className="field bg-white border border-line text-ink-900 rounded-md px-3 py-2 text-[14px]
                       md:w-52 focus:outline-none hover:border-ink-900/20 focus:border-ink-900/30"
          >
            <option value="">Все этапы</option>
            {STAGE_ORDER.map((s) => (
              <option key={s} value={s}>{STAGE_LABEL[s]}</option>
            ))}
          </select>
          {/* Сотрудник */}
          <select
            name="user"
            defaultValue={searchParams.user ?? ''}
            className="field bg-white border border-line text-ink-900 rounded-md px-3 py-2 text-[14px]
                       md:w-56 focus:outline-none hover:border-ink-900/20 focus:border-ink-900/30"
          >
            <option value="">Все сотрудники</option>
            {assignable.map((u) => (
              <option key={u.id} value={u.id}>
                {u.fullName} ({ROLE_LABEL[u.role].toLowerCase()})
              </option>
            ))}
          </select>
          {activeFilters > 0 && (
            <Link
              href="/orders"
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-[13px]
                         text-ink-700 hover:text-ink-900 hover:bg-ink-900/[0.04] border border-transparent"
            >
              <X size={13} /> Сбросить
            </Link>
          )}
          <button type="submit" className="hidden" />
        </div>
      </form>

      {/* Десктоп-таблица */}
      <div className="hidden md:block bg-white border border-line rounded-2xl overflow-hidden shadow-soft">
        <table className="w-full text-[14px] table-density">
          <thead>
            <tr className="border-b border-line text-left bg-canvas/60">
              <th className="px-5 py-3 font-medium text-[11px] uppercase tracking-wider text-ink-500 w-14">№</th>
              <th className="px-5 py-3 font-medium text-[11px] uppercase tracking-wider text-ink-500">Клиент</th>
              <th className="px-5 py-3 font-medium text-[11px] uppercase tracking-wider text-ink-500">Телефон</th>
              <th className="px-5 py-3 font-medium text-[11px] uppercase tracking-wider text-ink-500">Адрес</th>
              <th className="px-5 py-3 font-medium text-[11px] uppercase tracking-wider text-ink-500">Этап</th>
              <th className="px-5 py-3 font-medium text-[11px] uppercase tracking-wider text-ink-500">Замер</th>
              <th className="px-5 py-3 font-medium text-[11px] uppercase tracking-wider text-ink-500">Установка</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td colSpan={7}>
                  <EmptyState
                    icon={Inbox}
                    variant="compact"
                    title="Заказов нет"
                    description={searchParams.q || stage || searchParams.user ? 'Попробуйте сбросить фильтры' : undefined}
                  />
                </td>
              </tr>
            )}
            {items.map((o) => (
              <tr key={o.id} className="relative border-b border-line/60 last:border-0 hover-row">
                <td className="px-5 py-3.5 text-ink-500 tabular-nums">
                  <Link
                    href={`/orders/${o.id}`}
                    className="absolute inset-0 z-10"
                    aria-label={`Заказ № ${o.number}, ${o.clientName}`}
                  />
                  <span className="relative">{o.number}</span>
                </td>
                <td className="px-5 py-3.5 font-medium text-ink-900">{o.clientName}</td>
                <td className="px-5 py-3.5 text-ink-700 tabular-nums">{o.clientPhone}</td>
                <td className="px-5 py-3.5 text-ink-700 max-w-[260px]">
                  <span className="block truncate" title={o.clientAddress}>{o.clientAddress}</span>
                </td>
                <td className="px-5 py-3.5"><StageBadge stage={o.stage} /></td>
                <td className="px-5 py-3.5 text-ink-700">
                  {o.surveyAt ? (
                    <>
                      <span className="tabular-nums">{fmtDateTime(o.surveyAt)}</span>
                      {o.surveyor && <span className="text-ink-500"> · {shortName(o.surveyor.fullName)}</span>}
                    </>
                  ) : (
                    <span className="text-ink-300">—</span>
                  )}
                </td>
                <td className="px-5 py-3.5 text-ink-700">
                  {o.installAt ? (
                    <>
                      <span className="tabular-nums">{fmtDateTime(o.installAt)}</span>
                      {o.installer && <span className="text-ink-500"> · {shortName(o.installer.fullName)}</span>}
                    </>
                  ) : (
                    <span className="text-ink-300">—</span>
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
            className="block bg-white border border-line rounded-lg p-4 hover:border-ink-900/20"
          >
            <div className="flex justify-between items-start gap-3">
              <div className="min-w-0">
                <div className="text-[11px] text-ink-500 uppercase tracking-wider">№ {o.number}</div>
                <div className="font-medium truncate text-ink-900 mt-0.5">{o.clientName}</div>
                <div className="text-[13px] text-ink-500 tabular-nums mt-0.5">{o.clientPhone}</div>
                <div className="text-[13px] text-ink-500 truncate mt-0.5">{o.clientAddress}</div>
              </div>
              <StageBadge stage={o.stage} />
            </div>
            {(o.surveyAt || o.installAt) && (
              <div className="mt-3 text-[12px] text-ink-500 pt-3 border-t border-line space-y-0.5">
                {o.surveyAt && (
                  <div>Замер <span className="tabular-nums">{fmtDateTime(o.surveyAt)}</span>{o.surveyor && ` · ${shortName(o.surveyor.fullName)}`}</div>
                )}
                {o.installAt && (
                  <div>Установка <span className="tabular-nums">{fmtDateTime(o.installAt)}</span>{o.installer && ` · ${shortName(o.installer.fullName)}`}</div>
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
      className="inline-flex items-center justify-center w-8 h-8 rounded-md text-ink-700 hover:bg-ink-900/[0.04] border border-line hover:border-ink-900/20"
    >
      {children}
    </Link>
  );
}
