import Link from 'next/link';
import { Plus, Inbox, Archive } from 'lucide-react';
import type { Stage } from '@prisma/client';

import { requireUser, isFieldWorker } from '@/lib/auth-helpers';
import { listOrders, listAssignableUsers } from '@/lib/orders';
import { STAGE_LABEL, STAGE_ORDER } from '@/lib/labels';
import {
  PageHeader, Button, OrderCard, Empty, PillTabs, HintCard,
} from '@/components/uikit';
import LiveSearch from '@/components/live-search';
import AutoSubmitSelect from '@/components/auto-submit-select';
import FilterSheet from './filter-sheet';
import { StaleTasksBanner, getStaleCounts } from '@/components/stale-tasks-banner';
import { MyUpcomingHero } from '@/components/my-upcoming-hero';

export const metadata = { title: 'Заказы — Armora' };
export const dynamic = 'force-dynamic';

type Search = { q?: string; stage?: string; user?: string; filter?: string; page?: string };

function daysSinceUpdate(updatedAt: Date | string): number {
  const t = typeof updatedAt === 'string' ? new Date(updatedAt).getTime() : updatedAt.getTime();
  return Math.max(0, Math.floor((Date.now() - t) / (1000 * 60 * 60 * 24)));
}

export default async function OrdersPage({ searchParams }: { searchParams: Search }) {
  const me = await requireUser();
  // Полевой видит только свои заказы (buildOrderWhere форсит OR по surveyorId/installerId,
  // а f.userId для не-staff игнорирует). Значит фильтр «исполнитель» и вкладка «Мои» — лишние.
  const isField = isFieldWorker(me.role);
  // Создавать заказы могут все, кроме установщика (директор / менеджер / замерщик).
  const canCreate = me.role !== 'installer';

  const stage = (STAGE_ORDER as string[]).includes(searchParams.stage ?? '')
    ? (searchParams.stage as Stage)
    : undefined;

  const filter = searchParams.filter ?? 'all';
  const userIdFilter = filter === 'mine' ? me.id : searchParams.user;
  const scope = filter === 'today' || filter === 'waiting' ? filter : undefined;

  const [{ items, total, page, pageCount }, assignable, staleCounts] = await Promise.all([
    listOrders(me, {
      q: searchParams.q,
      stage,
      userId: userIdFilter,
      scope,
      page: Number(searchParams.page) || 1,
    }),
    listAssignableUsers(),
    getStaleCounts(me),
  ]);

  const pluralize = (n: number) =>
    `${n} ${n === 1 ? 'заказ' : n < 5 ? 'заказа' : 'заказов'}`;

  return (
    <>
      <PageHeader
        title="Заказы"
        sub={pluralize(total)}
        actions={
          <>
            <FilterSheet activeCount={[searchParams.stage, searchParams.user].filter(Boolean).length}>
              <AutoSubmitSelect
                name="stage"
                defaultValue={searchParams.stage ?? ''}
                preserve={['q', 'user', 'filter']}
              >
                <option value="">Все этапы</option>
                {STAGE_ORDER.map((s) => (
                  <option key={s} value={s}>{STAGE_LABEL[s]}</option>
                ))}
              </AutoSubmitSelect>
              {!isField && (
                <AutoSubmitSelect
                  name="user"
                  defaultValue={searchParams.user ?? ''}
                  preserve={['q', 'stage', 'filter']}
                >
                  <option value="">Все исполнители</option>
                  {assignable.map((u) => (
                    <option key={u.id} value={u.id}>{u.fullName}</option>
                  ))}
                </AutoSubmitSelect>
              )}
            </FilterSheet>
            {me.role !== 'installer' && (
              <Link href="/archive" aria-label="Архив закрытых заказов">
                <Button size="sm" variant="secondary">
                  <Archive size={16} /> Архив
                </Button>
              </Link>
            )}
            {canCreate && (
              <Link href="/orders/new" className="hidden lg:block">
                <Button size="sm"><Plus size={16} /> Новый</Button>
              </Link>
            )}
          </>
        }
      />

      <div className="px-4 lg:px-6 pt-4 space-y-3 max-w-6xl mx-auto">
        <MyUpcomingHero me={me} />

        <StaleTasksBanner counts={staleCounts} />

        <HintCard hintId="orders-intro" title="Как работать с заказами">
          Полоска слева на карточке — цвет стадии. Сумма справа крупно — это цена по договору.
          Тап открывает карточку, этап меняется кликом по нему вверху.
        </HintCard>

        <div className="flex items-center gap-2">
          <div className="flex-1">
            <LiveSearch
              defaultValue={searchParams.q ?? ''}
              placeholder="Поиск: ФИО / телефон / адрес / №"
              preserve={['stage', 'user', 'filter']}
            />
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <AutoSubmitSelect
              name="stage"
              defaultValue={searchParams.stage ?? ''}
              preserve={['q', 'user', 'filter']}
            >
              <option value="">Все этапы</option>
              {STAGE_ORDER.map((s) => (
                <option key={s} value={s}>{STAGE_LABEL[s]}</option>
              ))}
            </AutoSubmitSelect>
            {!isField && (
              <AutoSubmitSelect
                name="user"
                defaultValue={searchParams.user ?? ''}
                preserve={['q', 'stage', 'filter']}
              >
                <option value="">Все исполнители</option>
                {assignable.map((u) => (
                  <option key={u.id} value={u.id}>{u.fullName}</option>
                ))}
              </AutoSubmitSelect>
            )}
          </div>
        </div>

        <PillTabs
          paramName="filter"
          preserve={['q', 'stage', 'user']}
          items={[
            { key: '',        label: 'Все',     count: total },
            // «Мои» бессмысленна для полевого — у него и так только свои заказы.
            ...(isField ? [] : [{ key: 'mine', label: 'Мои' }]),
            { key: 'today',   label: 'Сегодня' },
            { key: 'waiting', label: 'Ждут' },
          ]}
        />

        {items.length === 0 ? (
          <Empty
            icon={Inbox}
            title="Заказов нет"
            hint="Создайте новый заказ или измените фильтры."
            action={
              canCreate ? (
                <Link href="/orders/new">
                  <Button><Plus size={16} /> Новый заказ</Button>
                </Link>
              ) : null
            }
          />
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-2.5 pb-28 lg:pb-8">
            {/* pb-28 на мобиле — клиренс под FAB (зона ~80–136px от низа), иначе он
                накрывал кнопки звонка/маршрута последней карточки.
                daysInStage — от stageChangedAt: комментарий/правка не сбивают счётчик.
                amount || null — новые заказы показывают «—», а не «0 ₽ по договору». */}
            {items.map((o, i) => (
              // Каскад: первые ~10 карточек появляются с шагом 30мс
              <div key={o.id} className="card-in" style={{ animationDelay: `${Math.min(i, 10) * 30}ms` }}>
                <OrderCard
                  href={`/orders/${o.id}`}
                  number={String(o.number ?? '')}
                  clientName={o.clientName ?? '—'}
                  address={o.clientAddress}
                  stage={o.stage}
                  daysInStage={daysSinceUpdate(o.stageChangedAt)}
                  phone={o.clientPhone}
                  amount={Number(o.totalAmount) || null}
                />
              </div>
            ))}
          </div>
        )}

        {pageCount > 1 && (
          <nav className="flex items-center justify-between text-meta text-text3 pb-28 lg:pb-8 pr-20 lg:pr-0" aria-label="Пагинация">
            {/* h-11 на мобиле — тач-таргет; pr-20 — «Вперёд» не уходит под FAB. */}
            <Link
              href={{ query: { ...searchParams, page: Math.max(1, page - 1) } }}
              aria-disabled={page === 1}
              tabIndex={page === 1 ? -1 : undefined}
              className={`inline-flex items-center gap-1.5 h-11 lg:h-9 px-4 lg:px-3 rounded-md border border-borderc/70
                          ${page === 1 ? 'opacity-40 pointer-events-none' : 'text-text2 hover:text-text1 hover:bg-subtle/70 active:bg-subtle'}`}
            >
              <span aria-hidden>‹</span> Назад
            </Link>
            <span className="tabular-nums text-text2">{page} <span className="text-text3">/</span> {pageCount}</span>
            <Link
              href={{ query: { ...searchParams, page: Math.min(pageCount, page + 1) } }}
              aria-disabled={page === pageCount}
              tabIndex={page === pageCount ? -1 : undefined}
              className={`inline-flex items-center gap-1.5 h-11 lg:h-9 px-4 lg:px-3 rounded-md border border-borderc/70
                          ${page === pageCount ? 'opacity-40 pointer-events-none' : 'text-text2 hover:text-text1 hover:bg-subtle/70 active:bg-subtle'}`}
            >
              Вперёд <span aria-hidden>›</span>
            </Link>
          </nav>
        )}
      </div>

      {/* FAB на мобильном — быстрый доступ к созданию заказа.
          Скрыт на десктопе (там кнопка в шапке). */}
      {canCreate && (
        <Link
          href="/orders/new"
          aria-label="Новый заказ"
          className="lg:hidden fixed right-4 z-30
                     w-14 h-14 inline-flex items-center justify-center rounded-full
                     glass-button-dark text-white shadow-soft-lg
                     active:scale-[0.96] transition-transform duration-fast"
          style={{ bottom: 'calc(64px + env(safe-area-inset-bottom) + 16px)' }}
        >
          <Plus size={24} strokeWidth={2.25} />
        </Link>
      )}
    </>
  );
}
