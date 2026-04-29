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
                     rounded-md px-3 py-1.5 text-xs font-mono"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={copy}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md
                       text-sm bg-white hover:bg-canvas text-ink-900 border border-line"
          >
            {copied ? <><Check size={14} /> Скопировано</> : <><Copy size={14} /> Скопировать</>}
          </button>
          <a
            href={waUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md
                       text-sm bg-notion-green hover:bg-[#3a6f52] text-white font-medium"
          >
            <MessageCircle size={14} /> WhatsApp
          </a>
        </div>
      </div>
    </Card>
  );
}
