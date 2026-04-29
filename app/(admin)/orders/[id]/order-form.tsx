'use client';

// Универсальная форма заказа на новой дизайн-системе.

import { useFormState, useFormStatus } from 'react-dom';
import { Save, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { Stage } from '@prisma/client';
import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';

import { Button } from '@/components/ds/button';
import { Input, Textarea, Select, Field } from '@/components/ds/input';
import { Card, CardHeader, CardBody, CardTitle } from '@/components/ds/card';
import { STAGE_ORDER, STAGE_LABEL } from '@/lib/labels';
import { fmtMoney } from '@/lib/format';
import { deleteOrderAction, type OrderActionState } from '../actions';

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
    <Button type="submit" disabled={pending} loading={pending} className="w-full">
      {!pending && <Save size={14} strokeWidth={2} />} {pending ? 'Сохранение…' : label}
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
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-2 rounded-md bg-bad-soft border border-bad/25 px-3 py-2 text-[13px] text-bad"
        >
          <AlertCircle size={14} strokeWidth={2} className="mt-0.5 shrink-0" />
          <span>{state.error}</span>
        </motion.div>
      )}
      {state?.ok && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-2 rounded-md bg-ok-soft border border-ok/25 px-3 py-2 text-[13px] text-ok"
        >
          <CheckCircle2 size={14} strokeWidth={2} className="mt-0.5 shrink-0" />
          <span>Сохранено</span>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Левая колонка */}
        <div className="lg:col-span-2 space-y-4">

          <Card>
            <CardHeader><CardTitle>Клиент</CardTitle></CardHeader>
            <CardBody className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="ФИО" error={fe['clientName']}>
                <Input name="clientName" defaultValue={order?.clientName} disabled={disableNonStage} />
              </Field>
              <Field label="Телефон" error={fe['clientPhone']}>
                <Input name="clientPhone" defaultValue={order?.clientPhone} disabled={disableNonStage} className="font-mono tnum" />
              </Field>
              <Field label="Адрес установки" error={fe['clientAddress']} className="md:col-span-2">
                <Input name="clientAddress" defaultValue={order?.clientAddress} disabled={disableNonStage} />
              </Field>
            </CardBody>
          </Card>

          <Card>
            <CardHeader><CardTitle>Дверь</CardTitle></CardHeader>
            <CardBody className="space-y-3">
              <Field label="Комментарий по двери">
                <Textarea
                  name="doorComment"
                  rows={3}
                  defaultValue={order?.doorComment ?? ''}
                  disabled={disableNonStage}
                  placeholder="Цвет, фурнитура, особенности..."
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Ширина, мм">
                  <Input type="number" name="widthMm" defaultValue={order?.widthMm ?? ''} disabled={disableNonStage} className="font-mono tnum" />
                </Field>
                <Field label="Высота, мм">
                  <Input type="number" name="heightMm" defaultValue={order?.heightMm ?? ''} disabled={disableNonStage} className="font-mono tnum" />
                </Field>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader><CardTitle>Оплата</CardTitle></CardHeader>
            <CardBody className="grid grid-cols-3 gap-3">
              <Field label="Сумма, ₽">
                <Input
                  type="number" name="totalAmount" defaultValue={Number(order?.totalAmount ?? 0)}
                  disabled={disableNonStage}
                  onChange={(e) => setTotal(Number(e.target.value) || 0)}
                  className="font-mono tnum" min={0}
                />
              </Field>
              <Field label="Аванс, ₽">
                <Input
                  type="number" name="prepayment" defaultValue={Number(order?.prepayment ?? 0)}
                  disabled={disableNonStage}
                  onChange={(e) => setPrepay(Number(e.target.value) || 0)}
                  className="font-mono tnum" min={0}
                />
              </Field>
              <Field label="Остаток">
                <div className="h-9 inline-flex items-center px-3 rounded-md bg-base border border-border text-fg font-mono tnum text-[14px] font-semibold">
                  {fmtMoney(remaining)}
                </div>
              </Field>
            </CardBody>
          </Card>

          {comments}
        </div>

        {/* Правая колонка */}
        <aside className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Этап</CardTitle></CardHeader>
            <CardBody>
              <Select name="stage" defaultValue={order?.stage ?? 'new'}>
                {STAGE_ORDER.map((s, i) => (
                  <option key={s} value={s}>{i + 1}. {STAGE_LABEL[s]}</option>
                ))}
              </Select>
            </CardBody>
          </Card>

          <Card>
            <CardHeader><CardTitle>Замер</CardTitle></CardHeader>
            <CardBody className="space-y-3">
              <Field label="Дата и время">
                <Input
                  type="datetime-local" name="surveyAt"
                  defaultValue={toLocalInputValue(order?.surveyAt ?? null)}
                  disabled={disableNonStage}
                />
              </Field>
              <Field label="Замерщик">
                <Select name="surveyorId" defaultValue={order?.surveyorId ?? ''} disabled={disableNonStage}>
                  <option value="">— не назначен —</option>
                  {surveyors.map((u) => (
                    <option key={u.id} value={u.id}>{u.fullName}</option>
                  ))}
                </Select>
              </Field>
            </CardBody>
          </Card>

          <Card>
            <CardHeader><CardTitle>Установка</CardTitle></CardHeader>
            <CardBody className="space-y-3">
              <Field label="Дата и время">
                <Input
                  type="datetime-local" name="installAt"
                  defaultValue={toLocalInputValue(order?.installAt ?? null)}
                  disabled={disableNonStage}
                />
              </Field>
              <Field label="Установщик">
                <Select name="installerId" defaultValue={order?.installerId ?? ''} disabled={disableNonStage}>
                  <option value="">— не назначен —</option>
                  {installers.map((u) => (
                    <option key={u.id} value={u.id}>{u.fullName}</option>
                  ))}
                </Select>
              </Field>
            </CardBody>
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
        <Trash2 size={14} strokeWidth={2} /> Удалить заказ
      </Button>
    </form>
  );
}
