// Список заказов — premium B2B redesign.

import Link from 'next/link';
import { Plus, Search, ChevronLeft, ChevronRight, Inbox } from 'lucide-react';
import type { Stage } from '@prisma/client';

import { requireUser } from '@/lib/auth-helpers';
import { listOrders, listAssignableUsers } from '@/lib/orders';
import { logoutAction } from '@/app/(auth)/actions';
import { STAGE_LABEL, STAGE_ORDER, ROLE_LABEL } from '@/lib/labels';
import { fmtMoney, fmtDateTime, shortName } from '@/lib/format';
import { StageBadge } from '@/components/stage-badge';
import { Button } from '@/components/ds/button';
import { Topbar } from '@/components/ds/topbar';
import { PageEnter, StaggerList, StaggerItem } from '@/components/ds/motion';

export const metadata = { title: 'Заказы — Armora' };

type SearchT = { q?: string; stage?: string; user?: string; page?: string };

function declOrders(n: number) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'заказ';
  if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return 'заказа';
  return 'заказов';
}

export default async function OrdersPage({ searchParams }: { searchParams: SearchT }) {
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
  const canCreate = me.role === 'director' || me.role === 'manager';

  return (
    <>
      <Topbar
        title="Заказы"
        subtitle={`${total} ${declOrders(total)} в работе`}
        onLogout={logoutAction}
        actions={
          canCreate && (
            <Link href="/orders/new">
              <Button variant="primary" size="md">
                <Plus size={14} strokeWidth={2} /> Новый заказ
              </Button>
            </Link>
          )
        }
      />

      <PageEnter className="px-6 py-6 max-w-[1400px] w-full mx-auto space-y-5">
        {/* Фильтры */}
        <form
          method="get"
          className="rounded-md border border-border bg-surface p-1.5 flex flex-col md:flex-row gap-1.5"
        >
          <div className="relative flex-1">
            <Search size={14} strokeWidth={1.75} className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
            <input
              type="search"
              name="q"
              defaultValue={searchParams.q ?? ''}
              placeholder="Поиск по ФИО или телефону"
              className="w-full bg-transparent text-fg rounded-md pl-9 pr-3 py-2 text-[14px] placeholder:text-subtle focus:outline-none"
            />
          </div>
          <select
            name="stage"
            defaultValue={searchParams.stage ?? ''}
            className="field bg-base border border-border text-fg rounded-md px-3 py-2 text-[13px] md:w-52 hover:border-borderHover focus:outline-none focus:border-accent"
          >
            <option value="">Все этапы</option>
            {STAGE_ORDER.map((s) => (
              <option key={s} value={s}>{STAGE_LABEL[s]}</option>
            ))}
          </select>
          <select
            name="user"
            defaultValue={searchParams.user ?? ''}
            className="field bg-base border border-border text-fg rounded-md px-3 py-2 text-[13px] md:w-56 hover:border-borderHover focus:outline-none focus:border-accent"
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

        {/* Десктоп-таблица */}
        <div className="hidden md:block rounded-md border border-border bg-surface overflow-hidden">
          <table className="w-full text-[13.5px]">
            <thead className="bg-base/40 sticky top-14 z-10">
              <tr className="text-left">
                <th className="px-4 py-2.5 font-medium text-[11px] uppercase tracking-wider text-muted w-16">№</th>
                <th className="px-4 py-2.5 font-medium text-[11px] uppercase tracking-wider text-muted">Клиент</th>
                <th className="px-4 py-2.5 font-medium text-[11px] uppercase tracking-wider text-muted">Телефон</th>
                <th className="px-4 py-2.5 font-medium text-[11px] uppercase tracking-wider text-muted">Этап</th>
                <th className="px-4 py-2.5 font-medium text-[11px] uppercase tracking-wider text-muted">Замер</th>
                <th className="px-4 py-2.5 font-medium text-[11px] uppercase tracking-wider text-muted">Установка</th>
                <th className="px-4 py-2.5 font-medium text-[11px] uppercase tracking-wider text-muted text-right">Сумма</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-20 text-center">
                    <EmptyState />
                  </td>
                </tr>
              )}
              {items.map((o) => (
                <tr key={o.id} className="border-t border-border hover-row">
                  <td className="px-4 py-3 text-muted font-mono text-[12.5px] tnum">
                    <Link href={`/orders/${o.id}`} className="block">{o.number}</Link>
                  </td>
                  <td className="px-4 py-3 font-medium text-fg">
                    <Link href={`/orders/${o.id}`} className="block">{o.clientName}</Link>
                  </td>
                  <td className="px-4 py-3 text-fg/85 font-mono text-[12.5px] tnum">{o.clientPhone}</td>
                  <td className="px-4 py-3"><StageBadge stage={o.stage} /></td>
                  <td className="px-4 py-3 text-fg/85">
                    {o.surveyAt ? (
                      <>
                        <span className="text-fg">{fmtDateTime(o.surveyAt)}</span>
                        {o.surveyor && <span className="text-muted"> · {shortName(o.surveyor.fullName)}</span>}
                      </>
                    ) : (
                      <span className="text-subtle">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-fg/85">
                    {o.installAt ? (
                      <>
                        <span className="text-fg">{fmtDateTime(o.installAt)}</span>
                        {o.installer && <span className="text-muted"> · {shortName(o.installer.fullName)}</span>}
                      </>
                    ) : (
                      <span className="text-subtle">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-fg tnum">
                    {Number(o.totalAmount) > 0 ? (
                      fmtMoney(o.totalAmount as unknown as number)
                    ) : (
                      <span className="text-subtle font-sans">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Мобильные карточки */}
        <StaggerList className="md:hidden space-y-2">
          {items.length === 0 && (
            <div className="py-12"><EmptyState /></div>
          )}
          {items.map((o) => (
            <StaggerItem key={o.id}>
              <Link
                href={`/orders/${o.id}`}
                className="block rounded-md border border-border bg-surface p-4 hover:border-borderHover transition-colors duration-150"
              >
                <div className="flex justify-between items-start gap-3">
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-wider text-muted font-mono">№ {o.number}</div>
                    <div className="font-medium truncate text-fg mt-0.5">{o.clientName}</div>
                    <div className="text-[13px] text-muted font-mono tnum">{o.clientPhone}</div>
                  </div>
                  <StageBadge stage={o.stage} />
                </div>
                {(o.surveyAt || o.installAt) && (
                  <div className="mt-3 text-[12px] text-muted pt-3 border-t border-border space-y-0.5">
                    {o.surveyAt && (
                      <div>
                        <span className="text-subtle">Замер · </span>
                        <span className="text-fg/85">{fmtDateTime(o.surveyAt)}</span>
                        {o.surveyor && <span> · {shortName(o.surveyor.fullName)}</span>}
                      </div>
                    )}
                    {o.installAt && (
                      <div>
                        <span className="text-subtle">Установка · </span>
                        <span className="text-fg/85">{fmtDateTime(o.installAt)}</span>
                      </div>
                    )}
                  </div>
                )}
              </Link>
            </StaggerItem>
          ))}
        </StaggerList>

        {pageCount > 1 && (
          <div className="flex justify-between items-center text-[13px] text-muted">
            <div>Страница <span className="text-fg font-mono tnum">{page}</span> из <span className="text-fg font-mono tnum">{pageCount}</span></div>
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
      </PageEnter>
    </>
  );
}

function EmptyState() {
  return (
    <div className="text-center">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-base border border-border text-subtle mb-3">
        <Inbox size={18} strokeWidth={1.75} />
      </div>
      <div className="text-[14px] text-fg font-medium">Заказов нет</div>
      <div className="text-[12px] text-muted mt-1">По текущим фильтрам ничего не найдено</div>
    </div>
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
  searchParams: SearchT;
  children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <span className="inline-flex items-center justify-center w-8 h-8 rounded-md text-subtle border border-border">
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
      className="inline-flex items-center justify-center w-8 h-8 rounded-md text-fg/80 hover:text-fg hover:bg-fg/5 border border-border hover:border-borderHover transition-colors duration-150"
    >
      {children}
    </Link>
  );
}
