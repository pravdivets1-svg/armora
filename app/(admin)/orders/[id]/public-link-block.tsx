'use client';

import { useState } from 'react';
import { Link2, Copy, Check, MessageCircle } from 'lucide-react';
import { Card } from '@/components/ui';
import { phoneDigits } from '@/lib/format';

export default function PublicLinkBlock({
  url,
  clientPhone,
}: {
  url: string;
  clientPhone: string;
}) {
  const [copied, setCopied] = useState(false);

  const waText = encodeURIComponent(`Здравствуйте! Статус вашего заказа: ${url}`);
  const waUrl = `https://wa.me/${phoneDigits(clientPhone)}?text=${waText}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  return (
    <Card title="Ссылка для клиента" icon={<Link2 size={12} />}>
      <div className="flex flex-col md:flex-row gap-2">
        <input
          readOnly
          value={url}
          onClick={(e) => (e.target as HTMLInputElement).select()}
          className="flex-1 bg-canvas border border-line text-ink-700
                     rounded-md px-3 py-2 text-[12px] font-mono
                     focus:outline-none focus:border-ink-900/25 focus:ring-4 focus:ring-ink-900/5"
          aria-label="Ссылка для клиента"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={copy}
            className="inline-flex items-center justify-center gap-1.5 px-4 h-10 rounded-md
                       text-[13px] bg-white hover:bg-canvas text-ink-900 border border-line
                       hover:border-ink-900/20 transition-colors"
          >
            {copied ? <><Check size={14} /> Скопировано</> : <><Copy size={14} /> Скопировать</>}
          </button>
          <a
            href={waUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-1.5 px-4 h-10 rounded-md
                       text-[13px] bg-whatsapp hover:bg-whatsapp-hover text-white font-medium
                       transition-colors"
          >
            <MessageCircle size={14} /> WhatsApp
          </a>
        </div>
      </div>
    </Card>
  );
}
