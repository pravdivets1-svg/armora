// Лента событий заказа (audit log).
// Показывает кто/когда/что изменил. Финансы выделены акцентом, закрытие — успехом.

import type { OrderEventKind } from '@prisma/client';
import { History, ChevronRight, Tag, User, CalendarClock, Banknote, MessageSquare, CheckCircle2, FilePlus2, UserCog } from 'lucide-react';
import { fmtDateTime } from '@/lib/format';
import { Card } from '@/components/ui';
import { ROLE_LABEL } from '@/lib/labels';
import type { Role } from '@prisma/client';

type Event = {
  id: string;
  kind: OrderEventKind;
  summary: string;
  createdAt: Date;
  author: { fullName: string; role: Role } | null;
};

// Соответствие kind → иконка + цветовой тон + флаг "это финансы"
const KIND_META: Record<OrderEventKind, { icon: typeof History; tone: 'default' | 'accent' | 'ok' | 'warn' | 'bad'; isFinance?: boolean }> = {
  created:          { icon: FilePlus2,    tone: 'default' },
  stage:            { icon: Tag,          tone: 'accent' },
  assign_surveyor:  { icon: UserCog,      tone: 'default' },
  assign_installer: { icon: UserCog,      tone: 'default' },
  date_survey:      { icon: CalendarClock,tone: 'default' },
  date_install:     { icon: CalendarClock,tone: 'default' },
  money_total:      { icon: Banknote,     tone: 'warn', isFinance: true },
  money_prepay:     { icon: Banknote,     tone: 'warn', isFinance: true },
  money_final:      { icon: Banknote,     tone: 'warn', isFinance: true },
  money_cost:       { icon: Banknote,     tone: 'warn', isFinance: true },
  client_data:      { icon: User,         tone: 'default' },
  comment:          { icon: MessageSquare,tone: 'default' },
  closed:           { icon: CheckCircle2, tone: 'ok' },
};

const TONE_CLASSES = {
  default: { dot: 'bg-ink-900/[0.08] text-ink-700', text: 'text-ink-900' },
  accent:  { dot: 'bg-accent-soft text-accent-softText', text: 'text-ink-900' },
  ok:      { dot: 'bg-ok-soft text-ok', text: 'text-ink-900' },
  warn:    { dot: 'bg-warn-soft text-warn-softText', text: 'text-ink-900' },
  bad:     { dot: 'bg-bad-soft text-bad', text: 'text-ink-900' },
} as const;

export default function EventLog({ events }: { events: Event[] }) {
  if (events.length === 0) {
    return (
      <Card title="История изменений" icon={<History size={12} />}>
        <div className="text-[13px] text-ink-400">Изменений пока нет</div>
      </Card>
    );
  }

  return (
    <Card title="История изменений" icon={<History size={12} />}>
      <ol className="relative space-y-3">
        {/* Вертикальная линия слева */}
        <div className="absolute left-[15px] top-2 bottom-2 w-px bg-line" aria-hidden />
        {events.map((e) => {
          const meta = KIND_META[e.kind];
          const tone = TONE_CLASSES[meta.tone];
          const Icon = meta.icon;
          return (
            <li key={e.id} className="relative flex items-start gap-3 pl-0">
              <div
                className={`relative z-10 inline-flex items-center justify-center
                            w-8 h-8 rounded-full ${tone.dot} shrink-0
                            ${meta.isFinance ? 'ring-2 ring-warn-soft' : ''}`}
              >
                <Icon size={14} />
              </div>
              <div className="flex-1 min-w-0 pt-1">
                <div className={`text-[14px] ${tone.text} ${meta.isFinance ? 'font-medium' : ''}`}>
                  {e.summary}
                </div>
                <div className="text-[11px] text-ink-500 mt-0.5">
                  {e.author
                    ? <><span className="text-ink-700">{e.author.fullName}</span> · {ROLE_LABEL[e.author.role].toLowerCase()}</>
                    : <span>система</span>}
                  {' · '}
                  {fmtDateTime(e.createdAt)}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
