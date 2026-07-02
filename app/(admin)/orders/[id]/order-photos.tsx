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
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // kind — АРГУМЕНТОМ, не через state: setState не меняет замыкание текущего
  // рендера, и первое фото после переключения плитки уходило с предыдущим kind
  // (акт сохранялся как «Договор»).
  async function handleFiles(files: FileList | null, kind: PhotoMeta['kind']) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const f of Array.from(files)) {
        if (f.size > 5 * 1024 * 1024) {
          toast.error(`Файл «${f.name}» больше 5 МБ`);
          continue;
        }
        // Пофайловый try/catch: обрыв сети на 3-м файле из 6 не должен молча
        // отбрасывать остальные — замерщик должен видеть, что не загрузилось.
        try {
          const fd = new FormData();
          fd.append('file', f);
          fd.append('kind', kind);
          const r = await fetch(`/api/orders/${orderId}/photos`, { method: 'POST', body: fd });
          const j = await r.json().catch(() => ({}));
          if (!r.ok || !j.photo) {
            toast.error(`Не удалось загрузить «${f.name}»: ${j?.error ?? r.status}`);
            continue;
          }
          setPhotos((prev) => [j.photo, ...prev]);
        } catch {
          toast.error(`Сеть: не удалось загрузить «${f.name}»`);
        }
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
      {/* Загрузка: 4 большие плитки, каждая → камера телефона напрямую.
          Тап по плитке открывает заднюю камеру iPhone (capture="environment"),
          снял — автозагрузка с правильным kind. Никаких dropdown'ов. */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
        {KINDS.map((k) => (
          <label
            key={k}
            className={`flex flex-col items-center justify-center gap-1.5 h-20
                        rounded-md border border-borderc bg-subtle/40
                        text-text1 text-[13px] font-medium
                        cursor-pointer transition-colors
                        hover:bg-subtle hover:border-text2/40
                        active:scale-[0.98]
                        ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
          >
            <Camera size={20} className="text-text2" strokeWidth={1.75} />
            <span>{KIND_LABEL[k]}</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              className="sr-only"
              onChange={(e) => handleFiles(e.target.files, k)}
              disabled={uploading}
            />
          </label>
        ))}
      </div>
      <div className="flex items-center justify-between gap-3 mb-3 text-[11px] text-text3">
        <span>JPEG/PNG/WebP · до 5 МБ</span>
        {uploading && (
          <span className="inline-flex items-center gap-1.5 text-text2">
            <Loader2 size={12} className="animate-spin" /> Загрузка…
          </span>
        )}
        {/* Галерея грузит с kind='other' — тип виден в подписи фото.
            min-h 44px: раньше это была 11px-ссылка с тач-зоной ~16px. */}
        <label className="inline-flex items-center gap-1.5 min-h-[44px] px-3 -mr-3 -my-3
                          text-[13px] text-text2 cursor-pointer rounded-md
                          hover:text-text1 active:bg-subtle/60 transition-colors">
          <FileImage size={14} /> из галереи
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="sr-only"
            onChange={(e) => handleFiles(e.target.files, 'other')}
            disabled={uploading}
          />
        </label>
      </div>

      {/* Сетка */}
      {photos.length === 0 ? (
        <div className="text-[13px] text-text3">Фото пока нет — снимите договор или замер плитками выше.</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
          {photos.map((p) => {
            const src = `/api/orders/${orderId}/photos/${p.id}`;
            return (
              <figure
                key={p.id}
                className="relative group rounded-md overflow-hidden border border-borderc bg-subtle"
              >
                <button
                  type="button"
                  onClick={() => setLightbox(src)}
                  className="block w-full aspect-[4/3] bg-subtle focus:outline-none focus:ring-2 focus:ring-text1/15"
                  aria-label="Открыть фото"
                >
                  <img
                    src={src}
                    alt={p.caption || KIND_LABEL[p.kind]}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </button>
                <figcaption className="px-2 py-1.5 text-[11px] text-text3 flex items-center justify-between gap-2 bg-card border-t border-borderc/60">
                  <span className="truncate">
                    <span className="text-text1 font-medium">{KIND_LABEL[p.kind]}</span>
                    {p.author && <> · {p.author.fullName.split(' ').slice(-1)[0]}</>}
                    <span className="block text-text3 tabular-nums">{fmtDateTime(p.createdAt)}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => remove(p.id)}
                    className="shrink-0 w-10 h-10 -my-1 -mr-1 inline-flex items-center justify-center rounded
                               text-text3 hover:text-bad2 hover:bg-bad2-soft active:bg-bad2-soft transition-colors"
                    aria-label="Удалить фото"
                    title="Удалить"
                  >
                    <Trash2 size={16} />
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
