'use client';

// Поле адреса с кнопкой «Показать на карте» (Яндекс.Карты).
// Управляемый input — значение остаётся в форме, кнопка использует текущий ввод.

import { useState } from 'react';
import { MapPin, ExternalLink } from 'lucide-react';
import { Input } from '@/components/ui';

export default function AddressField({
  defaultValue,
  disabled,
  name = 'clientAddress',
}: {
  defaultValue?: string;
  disabled?: boolean;
  name?: string;
}) {
  const [value, setValue] = useState<string>(defaultValue ?? '');

  const trimmed = value.trim();
  const mapUrl = trimmed
    ? `https://yandex.ru/maps/?text=${encodeURIComponent(trimmed)}`
    : '';

  function openMap() {
    if (!trimmed) return;
    window.open(mapUrl, '_blank', 'noopener,noreferrer');
  }

  return (
    <div className="mt-1 flex gap-2">
      <Input
        name={name}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={disabled}
        placeholder="г. Москва, ул. Ленина, 5, кв. 12"
        className="flex-1"
      />
      <button
        type="button"
        onClick={openMap}
        disabled={!trimmed}
        title={trimmed ? 'Открыть на Яндекс.Картах' : 'Введите адрес'}
        className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-[13.5px]
                   text-text2 hover:text-text1 border border-borderc hover:bg-subtle/70
                   disabled:opacity-40 disabled:pointer-events-none transition-colors"
      >
        <MapPin size={14} />
        На карте
        <ExternalLink size={12} className="text-text3" />
      </button>
    </div>
  );
}
