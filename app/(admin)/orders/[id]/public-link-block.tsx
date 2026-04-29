'use client';

import { useState } from 'react';
import { Link2, Copy, Check, MessageCircle } from 'lucide-react';
import { Card, CardHeader, CardBody, CardTitle } from '@/components/ds/card';
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5">
          <Link2 size={11} strokeWidth={1.75} /> Ссылка для клиента
        </CardTitle>
      </CardHeader>
      <CardBody className="flex flex-col md:flex-row gap-2">
        <input
          readOnly
          value={url}
          onClick={(e) => (e.target as HTMLInputElement).select()}
          className="flex-1 bg-base border border-border text-fg/85
                     rounded-md px-3 h-9 text-[12px] font-mono focus:outline-none focus:border-accent"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={copy}
            className="inline-flex items-center justify-center gap-1.5 px-3 h-9 rounded-md text-[13px]
                       bg-surface hover:bg-fg/5 text-fg border border-border hover:border-borderHover transition-colors duration-150"
          >
            {copied ? <><Check size={14} strokeWidth={2} /> Скопировано</> : <><Copy size={14} strokeWidth={2} /> Скопировать</>}
          </button>
          <a
            href={waUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-1.5 px-3 h-9 rounded-md text-[13px]
                       bg-ok hover:bg-ok/90 text-white font-medium transition-colors duration-150"
          >
            <MessageCircle size={14} strokeWidth={2} /> WhatsApp
          </a>
        </div>
      </CardBody>
    </Card>
  );
}
