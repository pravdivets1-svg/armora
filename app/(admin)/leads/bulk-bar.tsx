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
    <div ref={containerRef} className="space-y-3">
      {/* «Выбрать все» — над списком, видна только когда есть items */}
      <div className="flex items-center gap-2 text-[12px] text-ink-500">
        <button
          type="button"
          onClick={() => toggleAll(count === 0)}
          className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-ink-700 hover:text-ink-900
                     hover:bg-ink-900/[0.04] transition-colors"
        >
          {count > 0 ? <CheckSquare size={14} /> : <Square size={14} />}
          {count > 0 ? `Выбрано: ${count}` : 'Выбрать все'}
        </button>
        {count > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="text-ink-500 hover:text-ink-900 transition-colors"
          >
            Снять выделение
          </button>
        )}
      </div>

      {children}

      {/* Action bar */}
      {count > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40
                        bg-ink-900 text-white rounded-xl shadow-soft-lg
                        px-3 py-2 flex items-center gap-1 flex-wrap max-w-[calc(100vw-2rem)]
                        animate-[bar-in_0.18s_ease-out]">
          <span className="text-[12px] text-white/70 font-medium px-2">
            {count}
          </span>
          <BulkBtn icon={<Phone size={14} />} label="Связались" stage="contacted" idsCsv={idsCsv} />
          <BulkBtn icon={<CalendarClock size={14} />} label="На замер" stage="scheduled" idsCsv={idsCsv} />
          <BulkBtn icon={<X size={14} />} label="Отказ" stage="rejected" idsCsv={idsCsv} />
          <BulkBtn icon={<AlertOctagon size={14} />} label="Спам" stage="spam" idsCsv={idsCsv} />
          <BulkBtn icon={<Sparkles size={14} />} label="В новые" stage="new" idsCsv={idsCsv} />
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
                className="inline-flex items-center gap-1.5 px-3 h-9 rounded-md
                           text-[13px] text-bad/90 hover:bg-bad/20 transition-colors"
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
        className="inline-flex items-center gap-1.5 px-3 h-9 rounded-md
                   text-[13px] text-white/90 hover:bg-white/10 transition-colors"
      >
        {icon} {label}
      </button>
    </form>
  );
}
