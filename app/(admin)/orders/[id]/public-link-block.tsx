'use client';

import { useState } from 'react';
import { Link2, Copy, Check } from 'lucide-react';
import { Card } from '@/components/ui';

export default function PublicLinkBlock({
  url,
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
    } catch {}
  }

  return (
    <Card title="Ссылка для клиента" icon={<Link2 size={12} />}>
      <div className="flex flex-col md:flex-row gap-2">
        <input
          readOnly
          value={url}
          onClick={(e) => (e.target as HTMLInputElement).select()}
          className="flex-1 bg-subtle border border-borderc/70 text-text2
                     rounded-md px-3 py-2 text-[12px] font-mono
                     focus:outline-none focus:border-text1/20 focus:ring-2 focus:ring-text1/5"
          aria-label="Ссылка для клиента"
        />
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center justify-center gap-1.5 px-4 h-10 rounded-md
                     text-[13px] border border-borderc text-text2
                     hover:bg-subtle/70 hover:text-text1 transition-colors"
        >
          {copied ? <><Check size={14} /> Скопировано</> : <><Copy size={14} /> Скопировать</>}
        </button>
      </div>
    </Card>
  );
}
