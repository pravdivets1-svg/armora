'use client';

// Секция «Фото» на карточке заказа.
// Замерщик/установщик/staff загружают фото договора, замера, акта и пр.
// Хранение — BYTEA в Postgres (см. /api/orders/[id]/photos).
//
// Превью: thumbnail = тот же binary endpoint, без отдельной превьюшки —
// браузер ужмёт через CSS. Если фото будет много, надо будет добавить
// генерацию thumb на сервере (sharp / @squoosh/lib).

import { useEffect, useRef, useState } from 'react';
import { Camera, Trash2, X, FileImage, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui';
import { fmtDateTime } from '@/lib/format';
import { toast } from 'sonner';

type PhotoMeta = {
  id: string;
  kind: 'contract' | 'survey' | 'act' | 'other';
  mime: string;
  size: number;
  width: number | null;
  height: number | null;
  caption: string;
  createdAt: string;
  author?: { id: string; fullName: string };
};

const KIND_LABEL: Record<PhotoMeta['kind'], string> = {
  contract: 'Договор',
  survey:   'Замер',
  act:      'Акт',
  other:    'Прочее',
};

const KINDS = (Object.keys(KIND_LABEL) as PhotoMeta['kind'][]);

export default function OrderPhotos({
  orderId,
  initial,
}: {
  orderId: string;
  initial: PhotoMeta[];
}) {
  const [photos, setPhotos] = useState<PhotoMeta[]>(initial);
  const [uploadKind, setUploadKind] = useState<PhotoMeta['kind']>('contract');
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const f of Array.from(files)) {
        if (f.size > 5 * 1024 * 1024) {
          toast.error(`Файл «${f.name}» больше 5 МБ`);
          continue;
        }
        const fd = new FormData();
        fd.append('file', f);
        fd.append('kind', uploadKind);
        const r = await fetch(`/api/orders/${orderId}/photos`, { method: 'POST', body: fd });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) {
          toast.error(`Не удалось загрузить «${f.name}»: ${j?.error ?? r.status}`);
          continue;
        }
        setPhotos((prev) => [j.photo, ...prev]);
      }
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function remove(id: string) {
    if (!confirm('Удалить фото?')) return;
    const r = await fetch(`/api/orders/${orderId}/photos/${id}`, { method: 'DELETE' });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      toast.error(`Не удалось удалить: ${j?.error ?? r.status}`);
      return;
    }
    setPhotos((prev) => prev.filter((p) => p.id !== id));
    toast.success('Фото удалено');
  }

  // Esc — закрыть лайтбокс
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setLightbox(null);
    }
    if (lightbox) {
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }
  }, [lightbox]);

  return (
    <Card title="Фото" icon={<FileImage size={12} />}>
      {/* Загрузка */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <select
          value={uploadKind}
          onChange={(e) => setUploadKind(e.target.value as PhotoMeta['kind'])}
          className="h-10 rounded-md border border-line bg-white px-3 text-[13px] text-ink-900
                     focus:outline-none focus:border-ink-900/25 focus:ring-4 focus:ring-ink-900/5"
          aria-label="Тип фото"
        >
          {KINDS.map((k) => (
            <option key={k} value={k}>{KIND_LABEL[k]}</option>
          ))}
        </select>
        <label
          className={`inline-flex items-center justify-center gap-2 px-4 h-10 rounded-md text-[13px]
                      bg-ink-900 hover:bg-ink-700 text-white font-medium transition-colors cursor-pointer
                      ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
        >
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
          {uploading ? 'Загрузка…' : 'Добавить фото'}
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </label>
        <span className="text-[11px] text-ink-400">JPEG/PNG/WebP · до 5 МБ</span>
      </div>

      {/* Сетка */}
      {photos.length === 0 ? (
        <div className="text-[13px] text-ink-400 italic">Фото пока нет.</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {photos.map((p) => {
            const src = `/api/orders/${orderId}/photos/${p.id}`;
            return (
              <figure
                key={p.id}
                className="relative group rounded-md overflow-hidden border border-line bg-canvas"
              >
                <button
                  type="button"
                  onClick={() => setLightbox(src)}
                  className="block w-full aspect-[4/3] bg-ink-900/[0.03] focus:outline-none focus:ring-4 focus:ring-ink-900/10"
                  aria-label="Открыть фото"
                >
                  <img
                    src={src}
                    alt={p.caption || KIND_LABEL[p.kind]}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </button>
                <figcaption className="px-2 py-1.5 text-[11px] text-ink-500 flex items-center justify-between gap-2 bg-white">
                  <span className="truncate">
                    <span className="text-ink-900 font-medium">{KIND_LABEL[p.kind]}</span>
                    {p.author && <> · {p.author.fullName.split(' ').slice(-1)[0]}</>}
                    <span className="block text-ink-400">{fmtDateTime(p.createdAt)}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => remove(p.id)}
                    className="shrink-0 w-7 h-7 inline-flex items-center justify-center rounded
                               text-ink-400 hover:text-bad hover:bg-bad/5 transition-colors"
                    aria-label="Удалить фото"
                    title="Удалить"
                  >
                    <Trash2 size={13} />
                  </button>
                </figcaption>
              </figure>
            );
          })}
        </div>
      )}

      {/* Лайтбокс */}
      {lightbox && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setLightbox(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setLightbox(null); }}
            className="absolute top-4 right-4 w-10 h-10 inline-flex items-center justify-center rounded-md
                       bg-white/10 hover:bg-white/20 text-white transition-colors"
            aria-label="Закрыть"
          >
            <X size={18} />
          </button>
          <img
            src={lightbox}
            alt=""
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </Card>
  );
}

// Фото отдаются с приватного API (через checkAccess по сессии). next/image
// здесь не подходит: оптимизатор шлёт картинки в _next/image анонимно и не
// получит cookie аутентификации. Используем простой <img>.
