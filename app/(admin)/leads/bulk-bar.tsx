'use client';

// Клиентская обёртка над списком лидов: чекбоксы + плавающий action bar.
// Передаём через children сам список (server-rendered) — для checkbox'ов
// добавляем data-attributes на корневой <li> сервером.
//
// Поведение: клик по чекбоксу в строке → активная строка добавляется в Set;
// при count>0 показывается фиксированный action-bar внизу с кнопками:
//   - Связались (set stage=contacted)
//   - На замер (scheduled)
//   - Отказ (rejected)
//   - Спам (spam)
//   - Удалить (только для директора)
// Действия отправляются обычной server-action формой с ids=csv.

import { useEffect, useRef, useState } from 'react';
import { Phone, CalendarClock, X, AlertOctagon, Trash2, Sparkles, CheckSquare, Square } from 'lucide-react';
import { bulkSetLeadStageAction, bulkDeleteLeadsAction } from './actions';

type Props = {
  isDirector: boolean;
  children: React.ReactNode;
};

export default function LeadsBulkBar({ isDirector, children }: Props) {
  const [ids, setIds] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  // Делегированный обработчик клика по чекбоксам.
  // Чекбокс рендерим серверно (input[type=checkbox] на каждой карточке),
  // здесь только синхронизируем ids.
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    function onChange(e: Event) {
      const t = e.target as HTMLInputElement;
      if (!t || t.tagName !== 'INPUT' || t.type !== 'checkbox') return;
      const id = t.dataset.leadId;
      if (!id) return;
      setIds((prev) => {
        const next = new Set(prev);
        if (t.checked) next.add(id);
        else next.delete(id);
        return next;
      });
    }
    root.addEventListener('change', onChange);
    return () => root.removeEventListener('change', onChange);
  }, []);

  // Снимаем выделение по Esc
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && ids.size > 0) clearAll();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ids.size]);

  function clearAll() {
    const root = containerRef.current;
    if (root) {
      root.querySelectorAll<HTMLInputElement>('input[type="checkbox"][data-lead-id]')
        .forEach((cb) => { cb.checked = false; });
    }
    setIds(new Set());
  }

  function toggleAll(checked: boolean) {
    const root = containerRef.current;
    if (!root) return;
    const next = new Set<string>();
    root.querySelectorAll<HTMLInputElement>('input[type="checkbox"][data-lead-id]')
      .forEach((cb) => {
        cb.checked = checked;
        const id = cb.dataset.leadId;
        if (checked && id) next.add(id);
      });
    setIds(next);
  }

  const count = ids.size;
  const idsCsv = [...ids].join(',');

  return (
    <div ref={containerRef} className="space-y-2.5">
      {/* «Выбрать все» — над списком, видна только когда есть items */}
      <div className="flex items-center gap-2 text-meta text-text3">
        <button
          type="button"
          onClick={() => toggleAll(count === 0)}
          className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-text2 hover:text-text1
                     hover:bg-subtle transition-colors"
        >
          {count > 0 ? <CheckSquare size={14} /> : <Square size={14} />}
          {count > 0 ? `Выбрано: ${count}` : 'Выбрать все'}
        </button>
        {count > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="text-text3 hover:text-text1 transition-colors"
          >
            Снять выделение
          </button>
        )}
      </div>

      {children}

      {/* Action bar — Linear-стиль: тёмная плашка text1, плотные кнопки */}
      {count > 0 && (
        <div className="fixed bottom-[calc(64px+env(safe-area-inset-bottom)+0.75rem)] lg:bottom-4 left-1/2 -translate-x-1/2 z-40
                        bg-text1 text-white rounded-lg shadow-popover
                        px-2 py-1.5 flex items-center gap-0.5 flex-wrap max-w-[calc(100vw-2rem)]
                        animate-[bar-in_0.18s_ease-out]">
          <span className="text-meta tabular-nums text-white/70 font-medium px-2">
            {count}
          </span>
          <BulkBtn icon={<Phone size={13} />} label="Связались" stage="contacted" idsCsv={idsCsv} />
          <BulkBtn icon={<CalendarClock size={13} />} label="На замер" stage="scheduled" idsCsv={idsCsv} />
          <BulkBtn icon={<X size={13} />} label="Отказ" stage="rejected" idsCsv={idsCsv} />
          <BulkBtn icon={<AlertOctagon size={13} />} label="Спам" stage="spam" idsCsv={idsCsv} />
          <BulkBtn icon={<Sparkles size={13} />} label="В новые" stage="new" idsCsv={idsCsv} />
          {isDirector && (
            <form
              action={bulkDeleteLeadsAction}
              onSubmit={(e) => {
                if (!confirm(`Удалить ${count} заявок? Действие необратимо.`)) e.preventDefault();
              }}
            >
              <input type="hidden" name="ids" value={idsCsv} />
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-2.5 h-11 rounded-md
                           text-[13px] text-bad2/90 hover:bg-bad2/15 transition-colors"
              >
                <Trash2 size={13} /> Удалить
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

function BulkBtn({
  icon, label, stage, idsCsv,
}: {
  icon: React.ReactNode;
  label: string;
  stage: string;
  idsCsv: string;
}) {
  return (
    <form action={bulkSetLeadStageAction}>
      <input type="hidden" name="stage" value={stage} />
      <input type="hidden" name="ids" value={idsCsv} />
      <button
        type="submit"
        className="inline-flex items-center gap-1.5 px-2.5 h-11 rounded-md
                   text-[13px] text-white/85 hover:bg-white/10 hover:text-white transition-colors"
      >
        {icon} {label}
      </button>
    </form>
  );
}
