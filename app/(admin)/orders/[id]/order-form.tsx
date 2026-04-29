'use client';

// Универсальная форма заказа, Notion-style.
// Поля без явных рамок-карточек — иерархия через секции с лейблами.

import { useFormState, useFormStatus } from 'react-dom';
import { Save, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { Stage } from '@prisma/client';
import { useMemo, useState } from 'react';

import { Card, Input, Textarea, Select, Button, FieldLabel } from '@/components/ui';
import { STAGE_ORDER, STAGE_LABEL } from '@/lib/labels';
import { fmtMoney } from '@/lib/format';
import { deleteOrderAction, type OrderActionState } from '../actions';
import AddressField from './address-field';

type UserOpt = { id: string; fullName: string };

type OrderData = {
  id: string;
  clientName: string;
  clientPhone: string;
  clientAddress: string;
  doorComment: string;
  widthMm: number | null;
  heightMm: number | null;
  totalAmount: any;
  prepayment: any;
  stage: Stage;
  surveyorId: string | null;
  installerId: string | null;
  surveyAt: Date | null;
  installAt: Date | null;
};

function toLocalInputValue(d: Date | null): string {
  if (!d) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function SaveButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      <Save size={14} /> {pending ? 'Сохранение…' : label}
    </Button>
  );
}

export default function OrderForm({
  order,
  action,
  surveyors,
  installers,
  canEditAll,
  canDelete,
  mode,
  comments,
}: {
  order?: OrderData;
  action: (state: OrderActionState, fd: FormData) => Promise<OrderActionState>;
  surveyors: UserOpt[];
  installers: UserOpt[];
  canEditAll: boolean;
  canDelete: boolean;
  mode: 'create' | 'edit';
  comments?: React.ReactNode;
}) {
  const [state, formAction] = useFormState<OrderActionState, FormData>(action, undefined);

  const [total, setTotal] = useState<number>(Number(order?.totalAmount ?? 0));
  const [prepay, setPrepay] = useState<number>(Number(order?.prepayment ?? 0));
  const remaining = useMemo(() => Math.max(0, total - prepay), [total, prepay]);

  const fe = (state && !state.ok ? state.fieldErrors : undefined) ?? {};
  const disableNonStage = !canEditAll;

  return (
    <form action={formAction} className="space-y-4">
      {state && !state.ok && (
        <div className="flex items-start gap-2 rounded-md bg-notion-redBg px-3 py-2 text-sm text-notion-red">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}
      {state?.ok && (
        <div className="flex items-start gap-2 rounded-md bg-notion-greenBg px-3 py-2 text-sm text-notion-green">
          <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
          <span>Сохранено</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Левая колонка */}
        <div className="md:col-span-2 space-y-4">

          <Card title="Клиент">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label>
                <FieldLabel>ФИО</FieldLabel>
                <Input name="clientName" defaultValue={order?.clientName} disabled={disableNonStage} className="mt-1" />
                {fe['clientName'] && <span className="text-xs text-notion-red mt-1 block">{fe['clientName']}</span>}
              </label>
              <label>
                <FieldLabel>Телефон</FieldLabel>
                <Input name="clientPhone" defaultValue={order?.clientPhone} disabled={disableNonStage} className="mt-1 tabular-nums" />
                {fe['clientPhone'] && <span className="text-xs text-notion-red mt-1 block">{fe['clientPhone']}</span>}
              </label>
              <label className="md:col-span-2">
                <FieldLabel>Адрес установки</FieldLabel>
                <AddressField defaultValue={order?.clientAddress} disabled={disableNonStage} />
                {fe['clientAddress'] && <span className="text-xs text-notion-red mt-1 block">{fe['clientAddress']}</span>}
              </label>
            </div>
          </Card>

          <Card title="Дверь">
            <label className="block">
              <FieldLabel>Комментарий по двери</FieldLabel>
              <Textarea
                name="doorComment"
                rows={3}
                defaultValue={order?.doorComment ?? ''}
                disabled={disableNonStage}
                placeholder="Цвет, фурнитура, особенности..."
                className="mt-1"
              />
            </label>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <label>
                <FieldLabel>Ширина, мм</FieldLabel>
                <Input type="number" name="widthMm" defaultValue={order?.widthMm ?? ''} disabled={disableNonStage} className="mt-1 tabular-nums" />
              </label>
              <label>
                <FieldLabel>Высота, мм</FieldLabel>
                <Input type="number" name="heightMm" defaultValue={order?.heightMm ?? ''} disabled={disableNonStage} className="mt-1 tabular-nums" />
              </label>
            </div>
          </Card>

          <Card title="Оплата">
            <div className="grid grid-cols-3 gap-3">
              <label>
                <FieldLabel>Сумма, ₽</FieldLabel>
                <Input
                  type="number" name="totalAmount" defaultValue={Number(order?.totalAmount ?? 0)}
                  disabled={disableNonStage}
                  onChange={(e) => setTotal(Number(e.target.value) || 0)}
                  className="mt-1 tabular-nums" min={0}
                />
              </label>
              <label>
                <FieldLabel>Аванс, ₽</FieldLabel>
                <Input
                  type="number" name="prepayment" defaultValue={Number(order?.prepayment ?? 0)}
                  disabled={disableNonStage}
                  onChange={(e) => setPrepay(Number(e.target.value) || 0)}
                  className="mt-1 tabular-nums" min={0}
                />
              </label>
              <div>
                <FieldLabel>Остаток</FieldLabel>
                <div className="mt-1 px-3 py-1.5 rounded-md bg-canvas text-ink-900 font-semibold tabular-nums text-sm">
                  {fmtMoney(remaining)}
                </div>
              </div>
            </div>
          </Card>

          {comments}
        </div>

        {/* Правая колонка */}
        <aside className="space-y-4">
          <Card title="Этап">
            <Select name="stage" defaultValue={order?.stage ?? 'new'}>
              {STAGE_ORDER.map((s, i) => (
                <option key={s} value={s}>{i + 1}. {STAGE_LABEL[s]}</option>
              ))}
            </Select>
          </Card>

          <Card title="Замер">
            <label className="block">
              <FieldLabel>Дата и время</FieldLabel>
              <Input
                type="datetime-local" name="surveyAt"
                defaultValue={toLocalInputValue(order?.surveyAt ?? null)}
                disabled={disableNonStage} className="mt-1"
              />
            </label>
            <label className="block mt-3">
              <FieldLabel>Замерщик</FieldLabel>
              <Select name="surveyorId" defaultValue={order?.surveyorId ?? ''} disabled={disableNonStage} className="mt-1">
                <option value="">— не назначен —</option>
                {surveyors.map((u) => (
                  <option key={u.id} value={u.id}>{u.fullName}</option>
                ))}
              </Select>
            </label>
          </Card>

          <Card title="Установка">
            <label className="block">
              <FieldLabel>Дата и время</FieldLabel>
              <Input
                type="datetime-local" name="installAt"
                defaultValue={toLocalInputValue(order?.installAt ?? null)}
                disabled={disableNonStage} className="mt-1"
              />
            </label>
            <label className="block mt-3">
              <FieldLabel>Установщик</FieldLabel>
              <Select name="installerId" defaultValue={order?.installerId ?? ''} disabled={disableNonStage} className="mt-1">
                <option value="">— не назначен —</option>
                {installers.map((u) => (
                  <option key={u.id} value={u.id}>{u.fullName}</option>
                ))}
              </Select>
            </label>
          </Card>

          <SaveButton label={mode === 'create' ? 'Создать' : 'Сохранить'} />

          {canDelete && order && <DeleteButton orderId={order.id} />}
        </aside>
      </div>
    </form>
  );
}

function DeleteButton({ orderId }: { orderId: string }) {
  return (
    <form
      action={async () => {
        if (!confirm('Удалить заказ безвозвратно?')) return;
        await deleteOrderAction(orderId);
      }}
    >
      <Button type="submit" variant="danger" className="w-full">
        <Trash2 size={14} /> Удалить заказ
      </Button>
    </form>
  );
}
