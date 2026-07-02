'use client';

import { useState } from 'react';
import { Link2, Copy, Check, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '@/components/ui';
import { phoneDigits } from '@/lib/format';

export default function PublicLinkBlock({
  url,
  clientPhone,
}: {
  url: string;
  clientPhone?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Молчаливый отказ хуже всего: менеджер уверен, что ссылка в буфере.
      toast.error('Не удалось скопировать — выделите ссылку в поле вручную');
    }
  }

  // Прямая отправка клиенту в WhatsApp — избавляет от цепочки
  // «скопировать → открыть мессенджер → найти чат → вставить».
  const digits = clientPhone ? phoneDigits(clientPhone) : '';
  const waHref = digits.length >= 10
    ? `https://wa.me/${digits}?text=${encodeURIComponent(`Статус вашего заказа: ${url}`)}`
    : null;

  return (
    <Card title="Ссылка для клиента" icon={<Link2 size={12} />}>
      <div className="flex flex-col md:flex-row gap-2">
        <input
          readOnly
          value={url}
          onClick={(e) => (e.target as HTMLInputElement).select()}
          className="flex-1 bg-subtle border border-borderc/70 text-text2
                     rounded-md px-3 py-2 text-[13px] font-mono
                     focus:outline-none focus:border-text1/20 focus:ring-2 focus:ring-text1/5"
          aria-label="Ссылка для клиента"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={copy}
            className="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 px-4 h-11 lg:h-10 rounded-md
                       text-[13px] border border-borderc text-text2
                       hover:bg-subtle/70 hover:text-text1 active:bg-subtle transition-colors"
          >
            {copied ? <><Check size={14} /> Скопировано</> : <><Copy size={14} /> Скопировать</>}
          </button>
          {waHref && (
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 px-4 h-11 lg:h-10 rounded-md
                         text-[13px] font-medium bg-whatsapp hover:bg-whatsapp-hover active:bg-whatsapp-hover
                         text-white transition-colors"
            >
              <MessageCircle size={14} /> В WhatsApp
            </a>
          )}
        </div>
      </div>
    </Card>
  );
}
