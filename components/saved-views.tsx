'use client';

// Saved views (pinned filters) для /orders.
// Хранение: localStorage. Ключ: 'armora.savedViews'.
// Каждый view = { id, label, query }, где query — закодированные searchParams
// (например "stage=production&user=abc-123").
//
// UI: ряд chip'ов под Toolbar'ом. Активный chip — тот, чей query совпадает
// с текущим pathname?search. «+ Сохранить» добавляет текущие фильтры,
// если что-то задано (q/stage/user). Long-press / X на chip — удалить.

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Pin, X as XIcon, Plus } from 'lucide-react';

type View = { id: string; label: string; query: string };

const STORAGE_KEY = 'armora.savedViews';
const MAX_VIEWS = 6;

function loadViews(): View[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v) => v && typeof v.id === 'string').slice(0, MAX_VIEWS);
  } catch {
    return [];
  }
}

function saveViews(views: View[]) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(views)); } catch {}
}

function buildQueryFromParams(sp: URLSearchParams): string {
  const keys = ['q', 'stage', 'user'];
  const parts: string[] = [];
  for (const k of keys) {
    const v = sp.get(k);
    if (v) parts.push(`${k}=${encodeURIComponent(v)}`);
  }
  return parts.join('&');
}

function describeQuery(query: string, stageLabels: Record<string, string>, userMap: Record<string, string>): string {
  const params = new URLSearchParams(query);
  const parts: string[] = [];
  const q = params.get('q');
  const stage = params.get('stage');
  const user = params.get('user');
  if (q) parts.push(`«${q}»`);
  if (stage) parts.push(stageLabels[stage] ?? stage);
  if (user) parts.push(userMap[user] ?? 'сотрудник');
  return parts.join(' · ') || 'без фильтра';
}

export default function SavedViews({
  stageLabels,
  userMap,
}: {
  stageLabels: Record<string, string>;
  userMap: Record<string, string>;
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const [views, setViews] = useState<View[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setViews(loadViews());
    setHydrated(true);
  }, []);

  const currentQuery = useMemo(() => buildQueryFromParams(sp), [sp]);
  const canSave = currentQuery.length > 0;
  const alreadySaved = views.some((v) => v.query === currentQuery);

  function applyView(v: View) {
    router.push(`/orders?${v.query}`);
  }

  function saveCurrent() {
    if (!canSave || alreadySaved) return;
    const label = describeQuery(currentQuery, stageLabels, userMap);
    const nextView: View = { id: Date.now().toString(36), label, query: currentQuery };
    const next = [nextView, ...views].slice(0, MAX_VIEWS);
    setViews(next);
    saveViews(next);
  }

  function removeView(id: string) {
    const next = views.filter((v) => v.id !== id);
    setViews(next);
    saveViews(next);
  }

  // До hydration рендерим пустую полоску, чтобы layout не прыгал
  if (!hydrated || (views.length === 0 && !canSave)) return null;

  return (
    <div className="flex items-center gap-1.5 flex-wrap text-[12px]">
      <Pin size={12} className="text-text3" />
      {views.map((v) => {
        const active = v.query === currentQuery;
        return (
          <span
            key={v.id}
            className={`inline-flex items-center gap-1.5 rounded-full pl-3 pr-1 py-1
                        border transition-colors
                        ${active
                          ? 'bg-text1 border-text1 text-white'
                          : 'bg-card border-borderc text-text2 hover:border-text2/40'}`}
          >
            <button
              type="button"
              onClick={() => applyView(v)}
              className="text-[12px] font-medium"
            >
              {v.label}
            </button>
            <button
              type="button"
              onClick={() => removeView(v.id)}
              aria-label="Удалить view"
              className={`inline-flex items-center justify-center w-5 h-5 rounded-full
                          ${active ? 'hover:bg-white/20' : 'hover:bg-subtle text-text3'}`}
            >
              <XIcon size={11} />
            </button>
          </span>
        );
      })}
      {canSave && !alreadySaved && views.length < MAX_VIEWS && (
        <button
          type="button"
          onClick={saveCurrent}
          className="inline-flex items-center gap-1 px-3 py-1 rounded-full
                     border border-dashed border-borderc text-text2 hover:bg-subtle/60
                     text-[12px] font-medium transition-colors"
        >
          <Plus size={11} /> Сохранить вид
        </button>
      )}
    </div>
  );
}
