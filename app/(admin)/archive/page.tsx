// Архив — закрытые заказы. Доступен директору, менеджеру, замерщику.
// Установщик сюда не попадает: middleware/redirect → /orders.

import Link from 'next/link';
import { Archive as ArchiveIcon } from 'lucide-react';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth-helpers';
import { listClosedOrders } from '@/lib/orders';
import { PageHeader, OrderCard, Empty } from '@/components/uikit';
import LiveSearch from '@/components/live-search';

export const metadata = { title: 'Архив — Armora' };
export const dynamic = 'force-dynamic';

type Search = { q?: string; page?: string };

function daysSinceUpdate(updatedAt: Date | string): number {
  const t = typeof updatedAt === 'string' ? new Date(updatedAt).getTime() : updatedAt.getTime();
  return Math.max(0, Math.floor((Date.now() - t) / (1000 * 60 * 60 * 24)));
}

export default async function ArchivePage({ searchParams }: { searchParams: Search }) {
  const me = await requireUser();
  if (me.role === 'installer') {
    redirect('/orders');
  }

  const { items, total, page, pageCount } = await listClosedOrders(me, {
    q: searchParams.q,
    page: Number(searchParams.page) || 1,
  });

  const pluralize = (n: number) =>
    `${n} закрыт${n === 1 ? 'ый' : 'ых'} заказ${n === 1 ? '' : n < 5 ? 'а' : 'ов'}`;

  return (
    <>
      <PageHeader title="Архив" sub={pluralize(total)} backHref="/orders" />

      <div className="px-4 lg:px-6 pt-4 space-y-3 max-w-6xl mx-auto pb-[88px] lg:pb-12">
        <LiveSearch
          defaultValue={searchParams.q ?? ''}
          placeholder="Поиск: ФИО / телефон / адрес / №"
        />

        {items.length === 0 ? (
          <Empty
            icon={ArchiveIcon}
            title="Архив пуст"
            hint={searchParams.q ? 'По текущему фильтру ничего не найдено' : 'Сюда попадают заказы со статусом «Закрыт»'}
          />
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-2.5">
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
          <nav className="flex items-center justify-between text-meta text-text3" aria-label="Пагинация">
            <Link
              href={{ query: { ...searchParams, page: Math.max(1, page - 1) } }}
              aria-disabled={page === 1}
              className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-borderc/70
                          ${page === 1 ? 'opacity-40 pointer-events-none' : 'text-text2 hover:text-text1 hover:bg-subtle/70'}`}
            >
              <span aria-hidden>‹</span> Назад
            </Link>
            <span className="tabular-nums text-text2">{page} <span className="text-text3">/</span> {pageCount}</span>
            <Link
              href={{ query: { ...searchParams, page: Math.min(pageCount, page + 1) } }}
              aria-disabled={page === pageCount}
              className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-borderc/70
                          ${page === pageCount ? 'opacity-40 pointer-events-none' : 'text-text2 hover:text-text1 hover:bg-subtle/70'}`}
            >
              Вперёд <span aria-hidden>›</span>
            </Link>
          </nav>
        )}
      </div>
    </>
  );
}
