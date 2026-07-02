import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

// Высота и размер кнопки «Назад» — ЧИСТЫМ CSS (h-14 lg:h-16, w-11 lg:w-9):
// прежний JS-детект useIsDesktop стартовал с «десктопа», и на телефоне первый
// рендер рисовал шапку 64px, после гидрации сжимал до 56px — контент прыгал
// на 8px при каждой жёсткой загрузке. Заодно компонент стал серверным.
// «Назад» — ссылка со стилями кнопки: <button> внутри <a> невалиден
// (двойной таб-стоп, скринридер читал элемент дважды).
export function PageHeader({
  title,
  sub,
  backHref,
  actions,
}: {
  title: string;
  sub?: string;
  backHref?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-30 glass-strip border-b h-14 lg:h-16">
      <div className="flex items-center gap-2 h-full px-3 sm:px-4">
        {backHref && (
          <Link
            href={backHref}
            aria-label="Назад"
            className="-ml-1 inline-flex items-center justify-center shrink-0
                       w-11 h-11 lg:w-9 lg:h-9 rounded-md text-text2
                       hover:bg-subtle hover:text-text1 active:bg-subtle
                       transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <ArrowLeft size={18} />
          </Link>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="text-h1 text-text1 truncate" title={title}>{title}</h1>
          {sub && <p className="text-meta text-text3 truncate -mt-0.5" title={sub}>{sub}</p>}
        </div>
        <div className="flex items-center gap-1 shrink-0">{actions}</div>
      </div>
    </header>
  );
}
