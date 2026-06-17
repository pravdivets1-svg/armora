'use client';

// Быстрые действия в заявке: Позвонить / WhatsApp / На карте.
// WhatsApp deep-link через wa.me/<digits> — открывает приложение если установлено.

import { Phone, MessageCircle, MapPin } from 'lucide-react';

function phoneDigits(p: string): string {
  return p.replace(/\D/g, '');
}

export function LeadQuickActions({
  clientPhone,
  clientAddress,
}: {
  clientPhone: string;
  clientAddress: string | null;
}) {
  const digits = phoneDigits(clientPhone);
  const tel = digits ? `tel:+${digits}` : null;
  const wa = digits ? `https://wa.me/${digits}` : null;
  const map = clientAddress
    ? `https://yandex.ru/maps/?text=${encodeURIComponent(clientAddress)}`
    : null;

  const items = [
    { key: 'phone', href: tel, target: undefined as undefined, icon: Phone,          label: 'Позвонить' },
    { key: 'wa',    href: wa,  target: '_blank' as const,      icon: MessageCircle,  label: 'WhatsApp' },
    { key: 'map',   href: map, target: '_blank' as const,      icon: MapPin,         label: 'На карте' },
  ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {items.map((it) => {
        const Icon = it.icon;
        if (!it.href) {
          return (
            <span
              key={it.key}
              aria-disabled
              className="glass-surface rounded-2xl flex flex-col items-center justify-center
                         h-[72px] gap-1 text-text3 opacity-50 cursor-not-allowed"
            >
              <Icon size={20} strokeWidth={1.75} />
              <span className="text-meta">{it.label}</span>
            </span>
          );
        }
        return (
          <a
            key={it.key}
            href={it.href}
            target={it.target}
            rel={it.target === '_blank' ? 'noreferrer' : undefined}
            className="glass-surface rounded-2xl flex flex-col items-center justify-center
                       h-[72px] gap-1 text-text1
                       transition-transform duration-fast ease-soft
                       active:scale-[0.97] hover:bg-white/40
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <Icon size={20} strokeWidth={1.75} className="text-text2" />
            <span className="text-meta">{it.label}</span>
          </a>
        );
      })}
    </div>
  );
}
