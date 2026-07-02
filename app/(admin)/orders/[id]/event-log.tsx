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
  default: { dot: 'bg-subtle text-text2',           text: 'text-text1' },
  accent:  { dot: 'bg-subtle text-text2',           text: 'text-text1' },
  ok:      { dot: 'bg-ok2-soft text-ok2',           text: 'text-text1' },
  warn:    { dot: 'bg-warn2-soft text-warn2',       text: 'text-text1' },
  bad:     { dot: 'bg-bad2-soft text-bad2',         text: 'text-text1' },
} as const;

export default function EventLog({ events }: { events: Event[] }) {
  if (events.length === 0) {
    return (
      <Card title="История изменений" icon={<History size={12} />}>
        <div className="text-[13px] text-text3">Изменений пока нет.</div>
      </Card>
    );
  }

  return (
    <Card title="История изменений" icon={<History size={12} />}>
      <ol className="relative">
        {/* Вертикальная линия слева — едва заметная */}
        <div className="absolute left-[15px] top-3 bottom-3 w-px bg-borderc" aria-hidden />
        {events.map((e) => {
          const meta = KIND_META[e.kind];
          const tone = TONE_CLASSES[meta.tone];
          const Icon = meta.icon;
          return (
            <li key={e.id} className="relative flex items-start gap-3 pl-0 py-2 first:pt-0 last:pb-0">
              <div
                className={`relative z-10 inline-flex items-center justify-center
                            w-8 h-8 rounded-full ${tone.dot} shrink-0
                            ring-4 ring-card`}
              >
                <Icon size={13} />
              </div>
              <div className="flex-1 min-w-0 pt-1.5">
                <div className={`text-[13.5px] ${tone.text} ${meta.isFinance ? 'font-medium' : ''}`}>
                  {e.summary}
                </div>
                <div className="text-[11px] text-text3 mt-0.5 tabular-nums">
                  {e.author
                    ? <><span className="text-text2">{e.author.fullName}</span> · {ROLE_LABEL[e.author.role].toLowerCase()}</>
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
