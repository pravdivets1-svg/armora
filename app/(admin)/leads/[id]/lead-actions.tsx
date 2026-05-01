'use client';

// Правая колонка карточки лида: смена этапа, назначение менеджера, конверсия в Order, удаление.

import { useFormState, useFormStatus } from 'react-dom';
import Link from 'next/link';
import { CheckCircle2, Phone, CalendarClock, X, AlertOctagon, Trash2, Sparkles, UserCheck } from 'lucide-react';
import type { LeadStage } from '@prisma/client';

import { Card, Button, Input, Select, FieldLabel } from '@/components/ui';
import { fmtMoney } from '@/lib/format';
import {
  setLeadStageAction,
  assignLeadAction,
  deleteLeadAction,
  convertLeadToOrderAction,
  type ConvertActionState,
} from '../actions';

type Manager = { id: string; fullName: string };

export default function LeadActions({
  leadId,
  currentStage,
  estimatedPrice,
  assignedToId,
  assignedToName,
  managers,
  isDirector,
  convertedOrderId,
}: {
  leadId: string;
  currentStage: LeadStage;
  estimatedPrice: number;
  assignedToId: string | null;
  assignedToName: string | null;
  managers: Manager[];
  isDirector: boolean;
  convertedOrderId: string | null;
}) {
  const isFinal = currentStage === 'converted' || currentStage === 'rejected' || currentStage === 'spam';

  return (
    <div className="space-y-4 sticky top-20">
      {/* Конверсия в заказ — главное действие */}
      {!convertedOrderId && currentStage !== 'spam' && (
        <Card title="Создать заказ">
          <ConvertForm leadId={leadId} estimatedPrice={estimatedPrice} />
          <div className="text-[11px] text-ink-500 mt-2 leading-snug">
            Создаст заказ с этими данными и отметит заявку как «В заказе».
            Цену и остальные поля можно дополнить в карточке заказа.
          </div>
        </Card>
      )}

      {/* Этапы воронки */}
      {!isFinal && (
        <Card title="Статус">
          <div className="space-y-1.5">
            {currentStage !== 'contacted' && (
              <StageBtn leadId={leadId} stage="contacted" icon={<Phone size={14} />} label="Связались с клиентом" />
            )}
            {currentStage !== 'scheduled' && (
              <StageBtn leadId={leadId} stage="scheduled" icon={<CalendarClock size={14} />} label="Договорились на замер" />
            )}
            <StageBtn leadId={leadId} stage="rejected" icon={<X size={14} />} label="Отказ клиента" variant="ghost" />
            <StageBtn leadId={leadId} stage="spam" icon={<AlertOctagon size={14} />} label="Это спам" variant="ghost" />
          </div>
        </Card>
      )}

      {/* Возврат из финальных в активные — для случая, когда отметили "отказ" по ошибке */}
      {isFinal && !convertedOrderId && (
        <Card title="Вернуть в работу">
          <StageBtn leadId={leadId} stage="new" icon={<Sparkles size={14} />} label="Снова в «Новые»" />
        </Card>
      )}

      {/* Назначение менеджера */}
      <Card title="Ответственный">
        <form action={assignLeadAction.bind(null, leadId, null)} className="hidden" id={`unassign-${leadId}`} />
        <AssignForm leadId={leadId} assignedToId={assignedToId} managers={managers} />
        {assignedToName && (
          <div className="text-[12px] text-ink-500 mt-2">
            Сейчас ведёт: <span className="text-ink-900 font-medium">{assignedToName}</span>
          </div>
        )}
      </Card>

      {/* Удаление — только директор */}
      {isDirector && (
        <form action={deleteLeadAction.bind(null, leadId)}>
          <button
            type="submit"
            onClick={(e) => {
              if (!confirm('Удалить заявку? Действие необратимо.')) e.preventDefault();
            }}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md
                       text-bad hover:bg-bad/5 text-[13px] font-medium"
          >
            <Trash2 size={13} /> Удалить заявку
          </button>
        </form>
      )}
    </div>
  );
}

function ConvertForm({ leadId, estimatedPrice }: { leadId: string; estimatedPrice: number }) {
  const [, formAction] = useFormState<ConvertActionState, FormData>(
    convertLeadToOrderAction.bind(null, leadId),
    undefined,
  );
  return (
    <form action={formAction} className="space-y-2.5">
      <label className="block">
        <FieldLabel>Цена по договору, ₽</FieldLabel>
        <Input
          type="number"
          name="totalAmount"
          defaultValue={estimatedPrice > 0 ? estimatedPrice : ''}
          placeholder="0"
          min={0}
          className="mt-1 tabular-nums"
        />
      </label>
      <ConvertSubmit />
    </form>
  );
}

function ConvertSubmit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="primary" disabled={pending} className="w-full">
      <CheckCircle2 size={14} />
      {pending ? 'Создаём…' : 'Создать заказ'}
    </Button>
  );
}

function StageBtn({
  leadId, stage, icon, label, variant = 'secondary',
}: {
  leadId: string;
  stage: LeadStage;
  icon: React.ReactNode;
  label: string;
  variant?: 'primary' | 'secondary' | 'ghost';
}) {
  return (
    <form action={setLeadStageAction.bind(null, leadId, stage)}>
      <Button type="submit" variant={variant} className="w-full justify-start">
        {icon} {label}
      </Button>
    </form>
  );
}

function AssignForm({
  leadId, assignedToId, managers,
}: {
  leadId: string;
  assignedToId: string | null;
  managers: Manager[];
}) {
  // Используем server action через onChange — без явной кнопки.
  // Отдельная маленькая form, которая submit'ится скриптом ниже.
  return (
    <form
      action={async (fd: FormData) => {
        const value = String(fd.get('userId') ?? '');
        await assignLeadAction(leadId, value || null);
      }}
    >
      <Select
        name="userId"
        defaultValue={assignedToId ?? ''}
        onChange={(e) => {
          // Submit на change (форма родительская)
          (e.currentTarget.form as HTMLFormElement | null)?.requestSubmit();
        }}
      >
        <option value="">— не назначен —</option>
        {managers.map((m) => (
          <option key={m.id} value={m.id}>{m.fullName}</option>
        ))}
      </Select>
    </form>
  );
}
