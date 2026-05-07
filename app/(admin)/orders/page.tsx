// Список заказов — modern editorial 2026.
// Sticky фильтр-бар, тихие бейджи этапов (без заливки кроме pending),
// единая иерархия: title → meta → action.

import Link from 'next/link';
import { Plus, ChevronLeft, ChevronRight, X, Inbox } from 'lucide-react';
import type { Stage } from '@prisma/client';

import { requireUser } from '@/lib/auth-helpers';
import { listOrders, listAssignableUsers } from '@/lib/orders';
import { STAGE_LABEL, STAGE_ORDER, ROLE_LABEL } from '@/lib/labels';
import { fmtDateTime, fmtInterval, shortName } from '@/lib/format';
import { StageBadge } from '@/components/stage-badge';
import { awaitingStateOf } from '@/lib/awaiting';
import { Clock, AlertCircle as AlertCircleIcon } from 'lucide-react';
import { EmptyState } from '@/components/empty-state';
import DensityToggle from '@/components/density-toggle';
import { Button } from '@/components/ui';
import { PageShell, PageHeader, Toolbar } from '@/components/page-shell';
import SavedViews from '@/components/saved-views';
import LiveSearch from '@/components/live-search';
import CopyPhone from '@/components/copy-phone';
import AutoSubmitSelect from '@/components/auto-submit-select';

export const metadata = { title: 'Заказы — Armora' };
// Всегда свежий список: после смены этапа в карточке заказа
// revalidatePath('/orders') должен мгновенно обновить таблицу.
// Без force-dynamic Next.js кэширует страницу и показывает старые этапы.
export const dynamic = 'force-dynamic';

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
    <main className="max-w-6xl mx-auto px-6 py-6 space-y-5">
      {/* Заголовок */}
      <PageHeader
        title="Заказы"
        sub={`${total} ${total === 1 ? 'заказ' : total < 5 ? 'заказа' : 'заказов'} в работе`}
        actions={
          <>
            <DensityToggle />
            {(me.role === 'director' || me.role === 'manager') && (
              <Link href="/orders/new">
                <Button variant="primary">
                  <Plus size={15} /> Новый заказ
                </Button>
              </Link>
            )}
          </>
        }
      />

      {/* Sticky фильтр-бар. На скролле остаётся под шапкой (h-16=64px). */}
      <Toolbar>
        <LiveSearch
          defaultValue={searchParams.q ?? ''}
          placeholder="Поиск: № / ФИО / телефон / адрес"
          preserve={['stage', 'user']}
        />
        <AutoSubmitSelect
          name="stage"
          defaultValue={searchParams.stage ?? ''}
          preserve={['q', 'user']}
          aria-label="Фильтр по этапу"
          className="md:w-52"
        >
          <option value="">Все этапы</option>
          {STAGE_ORDER.map((s) => (
            <option key={s} value={s}>{STAGE_LABEL[s]}</option>
          ))}
        </AutoSubmitSelect>
        <AutoSubmitSelect
          name="user"
          defaultValue={searchParams.user ?? ''}
          preserve={['q', 'stage']}
          aria-label="Фильтр по сотруднику"
          className="md:w-56"
        >
          <option value="">Все сотрудники</option>
          {assignable.map((u) => (
            <option key={u.id} value={u.id}>
              {u.fullName} ({ROLE_LABEL[u.role].toLowerCase()})
            </option>
          ))}
        </AutoSubmitSelect>
        {activeFilters > 0 && (
          <Link
            href="/orders"
            className="inline-flex items-center justify-center gap-1.5 px-3 h-10 rounded-md text-[13px]
                       text-ink-700 hover:text-ink-900 hover:bg-ink-900/[0.04] border border-transparent
                       transition-colors"
          >
            <X size={13} /> Сбросить
          </Link>
        )}
      </Toolbar>

      {/* Saved views — закреплённые комбинации фильтров */}
      <SavedViews
        stageLabels={STAGE_LABEL as Record<string, string>}
        userMap={Object.fromEntries(assignable.map((u) => [u.id, u.fullName]))}
      />

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
            {items.map((o) => {
              const aw = awaitingStateOf(o);
              const muted = aw.kind === 'silent';
              return (
              <tr
                key={o.id}
                className={`relative border-b border-line/60 last:border-0 hover-row ${muted ? 'opacity-50 [&_*]:!text-ink-400' : ''}`}
              >
                <td className="px-5 py-3.5 text-ink-500 tabular-nums">
                  <Link
                    href={`/orders/${o.id}`}
                    className="absolute inset-0 z-10"
                    aria-label={`Заказ № ${o.number}, ${o.clientName}`}
                  />
                  <span className="relative">{o.number}</span>
                </td>
                <td className="px-5 py-3.5 font-medium text-ink-900">
                  {o.clientName}
                  {aw.kind === 'overdue' && (
                    <span className="ml-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider font-semibold bg-bad/10 text-bad align-middle">
                      <AlertCircleIcon size={10} /> просрочен {aw.overdueDays}д
                    </span>
                  )}
                  {aw.kind === 'silent' && (
                    <span className="ml-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider bg-ink-900/[0.05] align-middle">
                      <Clock size={10} /> ждём клиента {aw.daysLeft}д
                    </span>
                  )}
                </td>
                <td className="px-5 py-3.5 text-ink-700 tabular-nums">
                  <CopyPhone phone={o.clientPhone} />
                </td>
                <td className="px-5 py-3.5 text-ink-700 max-w-[260px]">
                  <span className="block truncate" title={o.clientAddress}>{o.clientAddress}</span>
                </td>
                <td className="px-5 py-3.5"><StageBadge stage={o.stage} /></td>
                <td className="px-5 py-3.5 text-ink-700">
                  {o.surveyAt ? (
                    <>
                      <span className="tabular-nums">{fmtInterval(o.surveyAt, o.surveyEndAt)}</span>
                      {o.surveyor && <span className="text-ink-500"> · {shortName(o.surveyor.fullName)}</span>}
                    </>
                  ) : (
                    <span className="text-ink-400">—</span>
                  )}
                </td>
                <td className="px-5 py-3.5 text-ink-700">
                  {o.installAt ? (
                    <>
                      <span className="tabular-nums">{fmtInterval(o.installAt, o.installEndAt)}</span>
                      {o.installer && <span className="text-ink-500"> · {shortName(o.installer.fullName)}</span>}
                    </>
                  ) : (
                    <span className="text-ink-400">—</span>
                  )}
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Мобильные карточки */}
      <div className="md:hidden space-y-2">
        {items.length === 0 && (
          <EmptyState
            icon={Inbox}
            title="Заказов нет"
            description={searchParams.q || stage || searchParams.user ? 'Попробуйте сбросить фильтры' : undefined}
          />
        )}
        {items.map((o) => {
          const aw = awaitingStateOf(o);
          const muted = aw.kind === 'silent';
          return (
          <Link
            key={o.id}
            href={`/orders/${o.id}`}
            className={`block bg-white border border-line rounded-lg p-4 hover:border-ink-900/20 ${muted ? 'opacity-50' : ''}`}
          >
            <div className="flex justify-between items-start gap-3">
              <div className="min-w-0">
                <div className="text-[11px] text-ink-500 uppercase tracking-wider">№ {o.number}</div>
                <div className="font-medium truncate text-ink-900 mt-0.5">
                  {o.clientName}
                </div>
                {aw.kind === 'overdue' && (
                  <div className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider font-semibold bg-bad/10 text-bad">
                    <AlertCircleIcon size={10} /> просрочен {aw.overdueDays}д
                  </div>
                )}
                {aw.kind === 'silent' && (
                  <div className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider bg-ink-900/[0.05] text-ink-500">
                    <Clock size={10} /> ждём клиента {aw.daysLeft}д
                  </div>
                )}
                <div className="text-[13px] text-ink-500 tabular-nums mt-0.5">{o.clientPhone}</div>
                <div className="text-[13px] text-ink-500 truncate mt-0.5">{o.clientAddress}</div>
              </div>
              <StageBadge stage={o.stage} />
            </div>
            {(o.surveyAt || o.installAt) && (
              <div className="mt-3 text-[12px] text-ink-500 pt-3 border-t border-line space-y-0.5">
                {o.surveyAt && (
                  <div>Замер <span className="tabular-nums">{fmtInterval(o.surveyAt, o.surveyEndAt)}</span>{o.surveyor && ` · ${shortName(o.surveyor.fullName)}`}</div>
                )}
                {o.installAt && (
                  <div>Установка <span className="tabular-nums">{fmtInterval(o.installAt, o.installEndAt)}</span>{o.installer && ` · ${shortName(o.installer.fullName)}`}</div>
                )}
              </div>
            )}
          </Link>
          );
        })}
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
      <span className="inline-flex items-center justify-center w-10 h-10 rounded-md text-ink-300 border border-line">
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
      className="inline-flex items-center justify-center w-10 h-10 rounded-md text-ink-700 hover:bg-ink-900/[0.04] border border-line hover:border-ink-900/20 transition-colors"
    >
      {children}
    </Link>
  );
}
