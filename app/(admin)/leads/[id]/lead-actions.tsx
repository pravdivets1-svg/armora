'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import {
  CheckCircle2, Phone, CalendarClock, X, AlertOctagon,
  Sparkles, Loader2,
} from 'lucide-react';
import type { LeadStage } from '@prisma/client';

import {
  SectionCard, Button, IconButton, Sheet,
} from '@/components/uikit';
import UndoDeleteButton from '@/components/undo-delete-button';
import {
  setLeadStageAction,
  assignLeadAction,
  deleteLeadAction,
  convertLeadToOrderAction,
  type ConvertActionState,
} from '../actions';

type Manager = { id: string; fullName: string };
type Surveyor = { id: string; fullName: string };

export default function LeadActions({
  leadId,
  currentStage,
  estimatedPrice,
  clientAddress,
  assignedToId,
  managers,
  surveyors,
  isDirector,
  convertedOrderId,
}: {
  leadId: string;
  currentStage: LeadStage;
  estimatedPrice: number;
  clientAddress: string;
  assignedToId: string | null;
  managers: Manager[];
  surveyors: Surveyor[];
  isDirector: boolean;
  convertedOrderId: string | null;
}) {
  const isFinal = currentStage === 'converted' || currentStage === 'rejected' || currentStage === 'spam';
  const [convertOpen, setConvertOpen] = useState(false);

  return (
    <div className="space-y-2.5">
      {/* Главный CTA — sticky на мобиле. Accent оставлен — это ключевая конверсия. */}
      {!convertedOrderId && currentStage !== 'spam' && (
        <>
          <div className="lg:hidden fixed inset-x-0 z-30 px-4 pt-2 pb-3 bg-app/95 backdrop-blur border-t border-borderc"
               style={{ bottom: 'calc(64px + env(safe-area-inset-bottom))' }}>
            <Button size="lg" block onClick={() => setConvertOpen(true)}>
              <CheckCircle2 size={18} /> Создать заказ
            </Button>
          </div>
          <SectionCard title="Создать заказ">
            <p className="text-[13px] text-text2">
              Заведёт заказ с данными клиента. Можно сразу назначить замерщика и время — он получит уведомление.
            </p>
            <Button block onClick={() => setConvertOpen(true)}>
              <CheckCircle2 size={16} /> Создать заказ
            </Button>
          </SectionCard>

          <ConvertSheet
            open={convertOpen}
            onClose={() => setConvertOpen(false)}
            leadId={leadId}
            estimatedPrice={estimatedPrice}
            clientAddress={clientAddress}
            surveyors={surveyors}
          />
        </>
      )}

      {/* Этапы воронки */}
      {!isFinal && (
        <SectionCard title="Статус заявки">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {currentStage !== 'contacted' && (
              <StageBtn leadId={leadId} stage="contacted" icon={<Phone size={16} />} label="Связались" />
            )}
            {currentStage !== 'scheduled' && (
              <StageBtn leadId={leadId} stage="scheduled" icon={<CalendarClock size={16} />} label="Договорились на замер" />
            )}
            <StageBtn leadId={leadId} stage="rejected" icon={<X size={16} />} label="Отказ" variant="secondary" />
            <StageBtn leadId={leadId} stage="spam" icon={<AlertOctagon size={16} />} label="Это спам" variant="secondary" />
          </div>
        </SectionCard>
      )}

      {/* Возврат из финальных */}
      {isFinal && !convertedOrderId && (
        <SectionCard title="Вернуть в работу">
          <StageBtn leadId={leadId} stage="new" icon={<Sparkles size={16} />} label="Снова в «Новые»" />
        </SectionCard>
      )}

      {/* Ответственный */}
      <SectionCard title="Ответственный менеджер">
        <AssignForm leadId={leadId} assignedToId={assignedToId} managers={managers} />
      </SectionCard>

      {/* Удаление */}
      {isDirector && (
        <SectionCard title="Опасная зона">
          <UndoDeleteButton
            action={() => deleteLeadAction(leadId)}
            successMessage="Заявка удалена"
            label="Удалить заявку"
            className="w-full"
          />
        </SectionCard>
      )}
    </div>
  );
}

// ------------------------------------------------------------------
// Convert sheet — bottom-sheet с полями: сумма, замерщик, дата+время, адрес
// ------------------------------------------------------------------

function ConvertSheet({
  open, onClose, leadId, estimatedPrice, clientAddress, surveyors,
}: {
  open: boolean;
  onClose: () => void;
  leadId: string;
  estimatedPrice: number;
  clientAddress: string;
  surveyors: Surveyor[];
}) {
  const [state, formAction] = useFormState<ConvertActionState, FormData>(
    convertLeadToOrderAction.bind(null, leadId),
    undefined,
  );

  return (
    <Sheet open={open} onClose={onClose} title="Создать заказ">
      <form action={formAction} className="space-y-3.5">
        <div>
          <label className="block text-meta text-text3 mb-1">Цена по договору, ₽</label>
          <input
            type="number"
            name="totalAmount"
            defaultValue={estimatedPrice > 0 ? estimatedPrice : ''}
            placeholder="0"
            min={0}
            className="w-full h-10 px-3 rounded-md bg-card border border-borderc text-[16px] lg:text-[14px] tabular-nums font-medium
                       focus:outline-none focus:border-text2 focus:ring-1 focus:ring-text2/20
                       transition-colors duration-fast"
          />
        </div>

        <div>
          <label className="block text-meta text-text3 mb-1">Адрес клиента</label>
          <input
            type="text"
            name="clientAddress"
            defaultValue={clientAddress}
            placeholder="Город, улица, дом, квартира"
            className="w-full h-10 px-3 rounded-md bg-card border border-borderc text-[16px] lg:text-[14px]
                       focus:outline-none focus:border-text2 focus:ring-1 focus:ring-text2/20
                       transition-colors duration-fast"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-meta text-text3 mb-1">Замерщик</label>
            <select
              name="surveyorId"
              className="w-full h-10 px-3 rounded-md bg-card border border-borderc text-[16px] lg:text-[14px]
                         focus:outline-none focus:border-text2 focus:ring-1 focus:ring-text2/20
                         transition-colors duration-fast"
              defaultValue=""
            >
              <option value="">— не назначать —</option>
              {surveyors.map((s) => (
                <option key={s.id} value={s.id}>{s.fullName}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-meta text-text3 mb-1">Дата и время замера</label>
            <input
              type="datetime-local"
              name="surveyAt"
              className="w-full h-10 px-3 rounded-md bg-card border border-borderc text-[16px] lg:text-[14px] tabular-nums
                         focus:outline-none focus:border-text2 focus:ring-1 focus:ring-text2/20
                         transition-colors duration-fast"
            />
          </div>
        </div>

        <p className="text-meta text-text3">
          Если замерщик и время указаны — заказ создастся сразу в этапе «Замер назначен», и замерщик получит уведомление.
        </p>

        {state && !state.ok && (
          <p className="text-meta text-bad2">{state.error}</p>
        )}

        <ConvertSubmit />
      </form>
    </Sheet>
  );
}

function ConvertSubmit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" block disabled={pending}>
      {pending ? (
        <><Loader2 size={18} className="animate-spin" /> Создаём заказ…</>
      ) : (
        <><CheckCircle2 size={18} /> Создать заказ</>
      )}
    </Button>
  );
}

// ------------------------------------------------------------------
// Stage button
// ------------------------------------------------------------------

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
      <StageSubmit icon={icon} label={label} variant={variant} />
    </form>
  );
}

// pending-состояние (как у ConvertSubmit): без него кнопка была активна до
// ответа сервера — двойной тап отправлял действие дважды.
function StageSubmit({
  icon, label, variant,
}: {
  icon: React.ReactNode;
  label: string;
  variant: 'primary' | 'secondary' | 'ghost';
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} block disabled={pending} className="justify-start">
      {pending ? <Loader2 size={16} className="animate-spin" /> : icon} {label}
    </Button>
  );
}

// ------------------------------------------------------------------
// Assign manager
// ------------------------------------------------------------------

function AssignForm({
  leadId, assignedToId, managers,
}: {
  leadId: string;
  assignedToId: string | null;
  managers: Manager[];
}) {
  return (
    <form
      action={async (fd: FormData) => {
        const value = String(fd.get('userId') ?? '');
        await assignLeadAction(leadId, value || null);
      }}
    >
      <select
        name="userId"
        defaultValue={assignedToId ?? ''}
        onChange={(e) => (e.currentTarget.form as HTMLFormElement | null)?.requestSubmit()}
        className="w-full h-10 px-3 rounded-md bg-card border border-borderc text-[16px] lg:text-[14px]
                   focus:outline-none focus:border-text2 focus:ring-1 focus:ring-text2/20
                   transition-colors duration-fast"
      >
        <option value="">— не назначен —</option>
        {managers.map((m) => (
          <option key={m.id} value={m.id}>{m.fullName}</option>
        ))}
      </select>
    </form>
  );
}
