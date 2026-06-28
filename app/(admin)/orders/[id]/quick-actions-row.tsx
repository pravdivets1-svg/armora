'use client';

// Быстрые действия по заказу прямо под HeroStage:
//   • Позвонить — tel:
//   • Карта — Яндекс.Карты (поиск по адресу)
//   • Маршрут — Яндекс.Навигатор / Maps с проложенным маршрутом из текущей точки
//
// На мобиле iOS будет открывать встроенные приложения, на десктопе — браузер.
// Большие тач-таргеты (минимум 56pt), стеклянные плитки.

import { Phone, MapPin, Navigation } from 'lucide-react';

function phoneDigits(p: string): string {
  return p.replace(/\D/g, '');
}

export function QuickActionsRow({
  clientPhone,
  clientAddress,
}: {
  clientPhone: string;
  clientAddress: string;
}) {
  const tel = clientPhone ? `tel:+${phoneDigits(clientPhone)}` : null;
  const mapsSearch = clientAddress
    ? `https://yandex.ru/maps/?text=${encodeURIComponent(clientAddress)}`
    : null;
  const navigate = clientAddress
    ? `https://yandex.ru/maps/?mode=routes&rtext=~${encodeURIComponent(clientAddress)}&rtt=auto`
    : null;

  const items = [
    {
      key: 'phone',
      href: tel,
      icon: Phone,
      label: 'Позвонить',
      disabled: !tel,
    },
    {
      key: 'map',
      href: mapsSearch,
      icon: MapPin,
      label: 'На карте',
      target: '_blank' as const,
      disabled: !mapsSearch,
    },
    {
      key: 'navigate',
      href: navigate,
      icon: Navigation,
      label: 'Маршрут',
      target: '_blank' as const,
      disabled: !navigate,
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {items.map((it) => {
        const Icon = it.icon;
        if (it.disabled) {
          return (
            <span
              key={it.key}
              aria-disabled
              className="glass-surface rounded-2xl flex flex-col items-center justify-center
                         h-[76px] gap-1.5 text-text3 opacity-50 cursor-not-allowed"
            >
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-subtle">
                <Icon size={18} strokeWidth={2} />
              </span>
              <span className="text-meta font-medium">{it.label}</span>
            </span>
          );
        }
        return (
          <a
            key={it.key}
            href={it.href!}
            target={it.target}
            rel={it.target === '_blank' ? 'noreferrer' : undefined}
            className="glass-surface rounded-2xl flex flex-col items-center justify-center
                       h-[76px] gap-1.5 text-text1
                       transition-transform duration-fast ease-soft
                       active:scale-[0.97] hover:bg-white/40
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-accent/10 text-accent">
              <Icon size={18} strokeWidth={2} />
            </span>
            <span className="text-meta font-medium">{it.label}</span>
          </a>
        );
      })}
    </div>
  );
}
