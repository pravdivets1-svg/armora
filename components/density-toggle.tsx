'use client';

// Density toggle для таблицы заказов: comfortable / compact.
// Состояние хранится в localStorage, применяется через CSS-переменную
// на <html> элементе, чтобы строки таблицы могли подхватить через
// data-density атрибут на ближайшем родителе.
//
// Логика: при clicke переключаем data-density на html и пишем в localStorage.
// При SSR: data-density читается из localStorage в inline-script (ниже),
// чтобы не было flash при загрузке.

import { useEffect, useState } from 'react';
import { Rows3, Rows2 } from 'lucide-react';

type Density = 'comfortable' | 'compact';

export default function DensityToggle() {
  const [density, setDensity] = useState<Density>('comfortable');

  useEffect(() => {
    const stored = (localStorage.getItem('armora-density') as Density | null) ?? 'comfortable';
    setDensity(stored);
    document.documentElement.dataset.density = stored;
  }, []);

  function toggle() {
    const next: Density = density === 'comfortable' ? 'compact' : 'comfortable';
    setDensity(next);
    localStorage.setItem('armora-density', next);
    document.documentElement.dataset.density = next;
  }

  return (
    <button
      type="button"
      onClick={toggle}
      title={density === 'comfortable' ? 'Компактный режим' : 'Просторный режим'}
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md
                 text-[12px] text-text3 hover:text-text1
                 border border-borderc hover:border-text2/40 bg-card transition-colors"
    >
      {density === 'comfortable' ? <Rows3 size={13} /> : <Rows2 size={13} />}
      <span className="hidden md:inline">{density === 'comfortable' ? 'Просторно' : 'Компактно'}</span>
    </button>
  );
}
