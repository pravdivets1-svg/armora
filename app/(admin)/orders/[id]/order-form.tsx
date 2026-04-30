'use client';

// Универсальная форма заказа.
// Финансовые поля — с разграничением по ролям и алармом маржи.

import { useFormState, useFormStatus } from 'react-dom';
import { Save, Trash2, AlertCircle, CheckCircle2, AlertTriangle } from 'lucide-react';
import type { Stage, Role } from '@prisma/client';
import { useMemo, useState, useTransition } from 'react';

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
  finalPayment: any;
  costAmount: any;
  stage: Stage;
  surveyorId: string | null;
  installerId: string | null;
  surveyAt: Date | null;
  installAt: Date | null;
};

function toLocalInputValue(d: Date | null): string {
  if (!d) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  // Принудительно МСК (UTC+3) — иначе на Timeweb-сервере (UTC) при SSR
  // d.getHours() вернёт UTC-час, и поле покажет 14:00 вместо 17:00.
  // На клиенте в России getHours() и так вернёт МСК — результат совпадёт.
  const t = d.getTime() + 3 * 3600 * 1000;
  const u = new Date(t);
  return `${u.getUTCFullYear()}-${pad(u.getUTCMonth() + 1)}-${pad(u.getUTCDate())}T${pad(u.getUTCHours())}:${pad(u.getUTCMinutes())}`;
}

function SaveButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      <Save size={14} /> {pending ? 'Сохранение…' : label}
    </Button>
  );
}

// Что роль может редактировать
function permsFor(role: Role) {
  const fullEditor = role === 'director' || role === 'manager' || role === 'surveyor';
  return {
    isStaff:        role === 'director' || role === 'manager',
    canEditClient:  fullEditor,                                    // ФИО/телефон/адрес/дверь/даты/назначения
    canEditTotal:   fullEditor,                                    // цена + аванс
    canEditCost:    role === 'director' || role === 'surveyor',    // себестоимость — только директор + замерщик
    canSeeCost:     role === 'director' || role === 'surveyor',    // менеджер НЕ видит себестоимость
    canEditFinal:   true,                                          // остаток — все могут
    canCloseDirect: role === 'director',                           // только директор сразу в closed
    canDelete:      role === 'director',
  };
}

export default function OrderForm({
  order,
  action,
  surveyors,
  installers,
  role,
  mode,
  comments,
}: {
  order?: OrderData;
  action: (state: OrderActionState, fd: FormData) => Promise<OrderActionState>;
  surveyors: UserOpt[];
  installers: UserOpt[];
  role: Role;
  mode: 'create' | 'edit';
  comments?: React.ReactNode;
}) {
  const [state, formAction] = useFormState<OrderActionState, FormData>(action, undefined);
  const p = permsFor(role);

  const [total, setTotal] = useState<number>(Number(order?.totalAmount ?? 0));
  const [prepay, setPrepay] = useState<number>(Number(order?.prepayment ?? 0));
  const [finalPay, setFinalPay] = useState<number>(Number(order?.finalPayment ?? 0));
  const [cost, setCost] = useState<number>(Number(order?.costAmount ?? 0));

  // Остаток к оплате клиентом = договор - аванс - факт остаток
  const remaining = useMemo(() => Math.max(0, total - prepay - finalPay), [total, prepay, finalPay]);
  // Маржа = договор - себестоимость
  const margin = useMemo(() => total - cost, [total, cost]);
  const negativeMargin = total > 0 && cost > 0 && cost > total;

  const fe = (state && !state.ok ? state.fieldErrors : undefined) ?? {};

  // Какие этапы доступны в селекте (закрыть может только директор)
  const availableStages: Stage[] = STAGE_ORDER.filter((s) => {
    if (s === 'closed' && !p.canCloseDirect) return false;
    return true;
  });

  // Disabled-флаг для общих полей: если этап closed — может только директор
  const lockedClosed = order?.stage === 'closed' && role !== 'director';
  const disableClient = !p.canEditClient || lockedClosed;
  const disableTotal  = !p.canEditTotal  || lockedClosed;
  const disableCost   = !p.canEditCost   || lockedClosed;
  const disableFinal  = !p.canEditFinal  || lockedClosed;
  const disableStage  = lockedClosed;

  return (
    <form action={formAction} className="space-y-4">
      {state && !state.ok && (
        <div className="flex items-start gap-2 rounded-md bg-bad/5 border border-bad/20 px-3 py-2 text-[14px] text-bad">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}
      {state?.ok && (
        <div className="flex items-start gap-2 rounded-md bg-ok/5 border border-ok/20 px-3 py-2 text-[14px] text-ok">
          <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
          <span>Сохранено</span>
        </div>
      )}

      {negativeMargin && p.canSeeCost && (
        <div className="flex items-start gap-2 rounded-md bg-amber-500/10 border border-amber-500/30 px-3 py-2 text-[14px] text-amber-800">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span>
            <strong>Внимание:</strong> себестоимость ({fmtMoney(cost)}) выше цены по договору ({fmtMoney(total)}).
            Заказ убыточен на {fmtMoney(cost - total)}.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Левая колонка */}
        <div className="md:col-span-2 space-y-4">

          <Card title="Клиент">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label>
                <FieldLabel>ФИО</FieldLabel>
                <Input name="clientName" defaultValue={order?.clientName} disabled={disableClient} className="mt-1" />
                {fe['clientName'] && <span className="text-xs text-bad mt-1 block">{fe['clientName']}</span>}
              </label>
              <label>
                <FieldLabel>Телефон</FieldLabel>
                <Input name="clientPhone" defaultValue={order?.clientPhone} disabled={disableClient} className="mt-1 tabular-nums" />
                {fe['clientPhone'] && <span className="text-xs text-bad mt-1 block">{fe['clientPhone']}</span>}
              </label>
              <label className="md:col-span-2">
                <FieldLabel>Адрес установки</FieldLabel>
                <AddressField defaultValue={order?.clientAddress} disabled={disableClient} />
                {fe['clientAddress'] && <span className="text-xs text-bad mt-1 block">{fe['clientAddress']}</span>}
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
                disabled={disableClient}
                placeholder="Цвет, фурнитура, особенности..."
                className="mt-1"
              />
            </label>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <label>
                <FieldLabel>Ширина, мм</FieldLabel>
                <Input type="number" name="widthMm" defaultValue={order?.widthMm ?? ''} disabled={disableClient} className="mt-1 tabular-nums" />
              </label>
              <label>
                <FieldLabel>Высота, мм</FieldLabel>
                <Input type="number" name="heightMm" defaultValue={order?.heightMm ?? ''} disabled={disableClient} className="mt-1 tabular-nums" />
              </label>
            </div>
          </Card>

          {/* Финансы */}
          <Card title="Финансы">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <label>
                <FieldLabel>Цена по договору, ₽</FieldLabel>
                <Input
                  type="number" name="totalAmount" defaultValue={Number(order?.totalAmount ?? 0)}
                  disabled={disableTotal}
                  onChange={(e) => setTotal(Number(e.target.value) || 0)}
                  className="mt-1 tabular-nums" min={0}
                />
                {fe['totalAmount'] && <span className="text-xs text-bad mt-1 block">{fe['totalAmount']}</span>}
              </label>
              <label>
                <FieldLabel>Аванс получен, ₽</FieldLabel>
                <Input
                  type="number" name="prepayment" defaultValue={Number(order?.prepayment ?? 0)}
                  disabled={disableTotal}
                  onChange={(e) => setPrepay(Number(e.target.value) || 0)}
                  className="mt-1 tabular-nums" min={0}
                />
                {fe['prepayment'] && <span className="text-xs text-bad mt-1 block">{fe['prepayment']}</span>}
              </label>
              <label>
                <FieldLabel>Остаток получен, ₽</FieldLabel>
                <Input
                  type="number" name="finalPayment" defaultValue={Number(order?.finalPayment ?? 0)}
                  disabled={disableFinal}
                  onChange={(e) => setFinalPay(Number(e.target.value) || 0)}
                  className="mt-1 tabular-nums" min={0}
                />
                {fe['finalPayment'] && <span className="text-xs text-bad mt-1 block">{fe['finalPayment']}</span>}
              </label>

              {/* Себестоимость — только для тех, кому положено (директор/замерщик).
                  ВАЖНО: для остальных ролей поле в DOM НЕ рендерим вообще —
                  иначе значение видно в DevTools (утечка финансовых данных).
                  Сервер всё равно подставит значение из БД через canEditCost(). */}
              {p.canSeeCost && (
                <label>
                  <FieldLabel>Себестоимость, ₽ <span className="normal-case text-ink-400">(внутри)</span></FieldLabel>
                  <Input
                    type="number" name="costAmount" defaultValue={Number(order?.costAmount ?? 0)}
                    disabled={disableCost}
                    onChange={(e) => setCost(Number(e.target.value) || 0)}
                    className="mt-1 tabular-nums" min={0}
                  />
                  {fe['costAmount'] && <span className="text-xs text-bad mt-1 block">{fe['costAmount']}</span>}
                </label>
              )}

              <div>
                <FieldLabel>К доплате клиентом</FieldLabel>
                <div className="mt-1 px-3 py-2 rounded-md bg-canvas text-ink-900 font-semibold tabular-nums text-[14px]">
                  {fmtMoney(remaining)}
                </div>
              </div>

              {p.canSeeCost && (
                <div>
                  <FieldLabel>Маржа <span className="normal-case text-ink-400">(внутри)</span></FieldLabel>
                  <div className={`mt-1 px-3 py-2 rounded-md font-semibold tabular-nums text-[14px] ${
                    margin >= 0 ? 'bg-ok/10 text-ok' : 'bg-bad/10 text-bad'
                  }`}>
                    {margin >= 0 ? '+' : ''}{fmtMoney(margin)}
                  </div>
                </div>
              )}
            </div>
          </Card>

          {comments}
        </div>

        {/* Правая колонка */}
        <aside className="space-y-4">
          <Card title="Этап">
            <Select name="stage" defaultValue={order?.stage ?? 'new'} disabled={disableStage}>
              {availableStages.map((s, i) => (
                <option key={s} value={s}>{i + 1}. {STAGE_LABEL[s]}</option>
              ))}
            </Select>
            {!p.canCloseDirect && order?.stage !== 'closed' && (
              <div className="mt-2 text-[12px] text-ink-500">
                Чтобы закрыть заказ — выбери «Ожидает закрытия». Директор подтвердит в панели.
              </div>
            )}
            {fe['stage'] && <span className="text-xs text-bad mt-1 block">{fe['stage']}</span>}
          </Card>

          <Card title="Замер">
            <label className="block">
              <FieldLabel>Дата и время</FieldLabel>
              <Input
                type="datetime-local" name="surveyAt"
                defaultValue={toLocalInputValue(order?.surveyAt ?? null)}
                disabled={disableClient} className="mt-1"
              />
              {fe['surveyAt'] && <span className="text-xs text-bad mt-1 block">{fe['surveyAt']}</span>}
            </label>
            <label className="block mt-3">
              <FieldLabel>Замерщик</FieldLabel>
              <Select name="surveyorId" defaultValue={order?.surveyorId ?? ''} disabled={disableClient} className="mt-1">
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
                disabled={disableClient} className="mt-1"
              />
              {fe['installAt'] && <span className="text-xs text-bad mt-1 block">{fe['installAt']}</span>}
            </label>
            <label className="block mt-3">
              <FieldLabel>Установщик</FieldLabel>
              <Select name="installerId" defaultValue={order?.installerId ?? ''} disabled={disableClient} className="mt-1">
                <option value="">— не назначен —</option>
                {installers.map((u) => (
                  <option key={u.id} value={u.id}>{u.fullName}</option>
                ))}
              </Select>
            </label>
          </Card>

          <SaveButton label={mode === 'create' ? 'Создать' : 'Сохранить'} />

          {p.canDelete && order && <DeleteButton orderId={order.id} />}
        </aside>
      </div>
    </form>
  );
}

function DeleteButton({ orderId }: { orderId: string }) {
  // Важно: НЕ оборачиваем в <form> — этот компонент рендерится внутри родительской
  // <form action={formAction}>, а вложенные формы запрещены HTML-спекой
  // (браузер их «расплющивает», и сабмит уходит в родительскую форму = updateOrderAction).
  // Поэтому вызываем server action напрямую через useTransition.
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      variant="danger"
      className="w-full"
      disabled={pending}
      onClick={() => {
        if (!confirm('Удалить заказ безвозвратно?')) return;
        start(async () => {
          await deleteOrderAction(orderId);
        });
      }}
    >
      <Trash2 size={14} /> {pending ? 'Удаление…' : 'Удалить заказ'}
    </Button>
  );
}
