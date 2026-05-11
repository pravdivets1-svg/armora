import Link from 'next/link';
import { Plus, Inbox } from 'lucide-react';
import type { Stage } from '@prisma/client';

import { requireUser } from '@/lib/auth-helpers';
import { listOrders, listAssignableUsers } from '@/lib/orders';
import { STAGE_LABEL, STAGE_ORDER } from '@/lib/labels';
import {
  PageHeader, Button, OrderCard, Empty, PillTabs,
} from '@/components/ui';
import LiveSearch from '@/components/live-search';
import AutoSubmitSelect from '@/components/auto-submit-select';

export const metadata = { title: 'Заказы — Armora' };
export const dynamic = 'force-dynamic';

type Search = { q?: string; stage?: string; user?: string; filter?: string; page?: string };

function daysSinceUpdate(updatedAt: Date | string): number {
  const t = typeof updatedAt === 'string' ? new Date(updatedAt).getTime() : updatedAt.getTime();
  return Math.max(0, Math.floor((Date.now() - t) / (1000 * 60 * 60 * 24)));
}

export default async function OrdersPage({ searchParams }: { searchParams: Search }) {
  const me = await requireUser();

  const stage = (STAGE_ORDER as string[]).includes(searchParams.stage ?? '')
    ? (searchParams.stage as Stage)
    : undefined;

  const filter = searchParams.filter ?? 'all';
  const userIdFilter = filter === 'mine' ? me.id : searchParams.user;

  const { items, total, page, pageCount } = await listOrders(me, {
    q: searchParams.q,
    stage,
    userId: userIdFilter,
    page: Number(searchParams.page) || 1,
  });

  const assignable = await listAssignableUsers();

  const pluralize = (n: number) =>
    `${n} ${n === 1 ? 'заказ' : n < 5 ? 'заказа' : 'заказов'}`;

  return (
    <>
      <PageHeader
        title="Заказы"
        sub={pluralize(total)}
        actions={
          (me.role === 'director' || me.role === 'manager') ? (
            <Link href="/orders/new">
              <Button size="sm"><Plus size={16} /> Новый</Button>
            </Link>
          ) : null
        }
      />

      <div className="px-4 lg:px-6 pt-4 space-y-4 max-w-6xl mx-auto">
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
          </div>
        </div>

        <PillTabs
          paramName="filter"
          preserve={['q', 'stage', 'user']}
          items={[
            { key: '',        label: 'Все',     count: total },
            { key: 'mine',    label: 'Мои' },
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
              (me.role === 'director' || me.role === 'manager') ? (
                <Link href="/orders/new">
                  <Button><Plus size={16} /> Новый заказ</Button>
                </Link>
              ) : null
            }
          />
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 pb-8">
            {items.map((o) => (
              <OrderCard
                key={o.id}
                href={`/orders/${o.id}`}
                number={String(o.number ?? '')}
                clientName={o.clientName ?? '—'}
                address={o.clientAddress}
                stage={o.stage}
                daysInStage={daysSinceUpdate(o.updatedAt)}
                phone={o.clientPhone}
                amount={Number(o.totalAmount)}
              />
            ))}
          </div>
        )}

        {pageCount > 1 && (
          <nav className="flex items-center justify-between text-meta text-text3 pb-8" aria-label="Пагинация">
            <Link
              href={{ query: { ...searchParams, page: Math.max(1, page - 1) } }}
              aria-disabled={page === 1}
              className={`${page === 1 ? 'opacity-40 pointer-events-none' : 'text-text2 hover:text-text1'}`}
            >
              ← Назад
            </Link>
            <span className="tabular-nums">{page} / {pageCount}</span>
            <Link
              href={{ query: { ...searchParams, page: Math.min(pageCount, page + 1) } }}
              aria-disabled={page === pageCount}
              className={`${page === pageCount ? 'opacity-40 pointer-events-none' : 'text-text2 hover:text-text1'}`}
            >
              Вперёд →
            </Link>
          </nav>
        )}
      </div>
    </>
  );
}
