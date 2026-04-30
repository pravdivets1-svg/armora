'use client';

// Универсальная форма заказа — обновлённый визуал.
// Главные изменения:
//   - StageStepper сверху: один клик = переход этапа (вместо select+save)
//   - Sticky bottom bar с превью «К доплате» и Save/Delete — всегда виден
//   - Алерты с border-left (toast-like)
//   - Метрики «К доплате» / «Маржа» через единый <Metric>
//   - Лейбл «приватно» вместо «(внутри)»

import { useFormState, useFormStatus } from 'react-dom';
import { flushSync } from 'react-dom';
import { Save, Trash2, AlertCircle, CheckCircle2, AlertTriangle, Lock } from 'lucide-react';
import type { Stage, Role } from '@prisma/client';
import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { Card, Input, Textarea, Select, Button, FieldLabel } from '@/components/ui';
import { fmtMoney } from '@/lib/format';
import { Metric } from '@/components/metric';
import StageStepper from '@/components/stage-stepper';
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
  const t = d.getTime() + 3 * 3600 * 1000;
  const u = new Date(t);
  return `${u.getUTCFullYear()}-${pad(u.getUTCMonth() + 1)}-${pad(u.getUTCDate())}T${pad(u.getUTCHours())}:${pad(u.getUTCMinutes())}`;
}

function permsFor(role: Role) {
  const fullEditor = role === 'director' || role === 'manager' || role === 'surveyor';
  return {
    isStaff:        role === 'director' || role === 'manager',
    canEditClient:  fullEditor,
    canEditTotal:   fullEditor,
    canEditCost:    role === 'director' || role === 'surveyor',
    canSeeCost:     role === 'director' || role === 'surveyor',
    canEditFinal:   true,
    canCloseDirect: role === 'director',
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
  const formRef = useRef<HTMLFormElement>(null);

  const [stage, setStage] = useState<Stage>(order?.stage ?? 'new');
  const [total, setTotal] = useState<number>(Number(order?.totalAmount ?? 0));
  const [prepay, setPrepay] = useState<number>(Number(order?.prepayment ?? 0));
  const [finalPay, setFinalPay] = useState<number>(Number(order?.finalPayment ?? 0));
  const [cost, setCost] = useState<number>(Number(order?.costAmount ?? 0));

  // Синхронизация локального stage с серверным после revalidate.
  // Без этого: при ошибке валидации (БД не обновилась, но setStage уже вызвали)
  // или после успешного сохранения через любой другой путь — stepper рисовал бы
  // current не там, где он на сервере. Источник истины — order.stage из props.
  useEffect(() => {
    if (order?.stage) setStage(order.stage);
  }, [order?.stage]);

  // Откат локального stage при ошибке server action.
  // useFormState возвращает { ok:false, fieldErrors } если переход недопустим —
  // в этом случае БД не менялась, и локальный state должен совпасть с props.
  useEffect(() => {
    if (state && !state.ok && order?.stage) {
      setStage(order.stage);
    }
  }, [state, order?.stage]);

  const remaining = useMemo(() => Math.max(0, total - prepay - finalPay), [total, prepay, finalPay]);
  const margin = useMemo(() => total - cost, [total, cost]);
  const negativeMargin = total > 0 && cost > 0 && cost > total;

  const fe = (state && !state.ok ? state.fieldErrors : undefined) ?? {};

  const lockedClosed = order?.stage === 'closed' && role !== 'director';
  const disableClient = !p.canEditClient || lockedClosed;
  const disableTotal  = !p.canEditTotal  || lockedClosed;
  const disableCost   = !p.canEditCost   || lockedClosed;
  const disableFinal  = !p.canEditFinal  || lockedClosed;

  // Клик по сегменту stepper'а: меняем stage в стейте → сабмитим форму.
  // ВАЖНО: flushSync нужен потому что setState в React 18 батчится и
  // hidden input <input name="stage" value={stage}> обновляется ПОСЛЕ
  // выхода из обработчика. Без flushSync requestSubmit() читает DOM со
  // старым значением → server получает старый stage → БД не меняется.
  function handleStageClick(next: Stage) {
    flushSync(() => setStage(next));
    formRef.current?.requestSubmit();
  }

  // ============================================================
  // AUTOSAVE для всех остальных полей: 1.2с debounce после
  // последнего изменения — submit формы целиком. Если за это
  // время идёт что-то ещё — таймер сбрасывается.
  //
  // Только для mode === 'edit' (на create форма ещё не привязана
  // к существующему orderId, server action ждёт явный сабмит).
  //
  // На input/change в любом поле формы — взводим таймер.
  // На submit (включая stepper-клик) — отменяем pending autosave,
  // чтобы не было двойного запроса.
  // ============================================================
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function scheduleAutosave() {
    if (mode !== 'edit') return;
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      formRef.current?.requestSubmit();
    }, 1200);
  }
  function cancelAutosave() {
    if (autosaveTimer.current) {
      clearTimeout(autosaveTimer.current);
      autosaveTimer.current = null;
    }
  }
  // Чистим таймер на анмаунт, чтобы не сабмитить разрушенную форму
  useEffect(() => {
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, []);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="space-y-5"
      // Любое изменение в любом поле формы — взводим таймер autosave.
      // Используем onInput, потому что onChange на checkbox/select работает,
      // но для текстовых полей onInput даёт мгновенный отклик при печати.
      onInput={scheduleAutosave}
      onChange={scheduleAutosave}
      onSubmit={cancelAutosave}
    >
      {/* Stage stepper — главный action в карточке */}
      {mode === 'edit' && order && (
        <div>
          <StageStepper
            current={stage}
            role={role}
            disabled={lockedClosed}
            onStageClick={handleStageClick}
          />
        </div>
      )}

      {state && !state.ok && (
        <div className="flex items-start gap-2 rounded-md bg-bad/5 border-l-4 border-l-bad border-y border-r border-y-bad/15 border-r-bad/15 px-4 py-2.5 text-[14px] text-bad">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}
      {/* "Сохранено" не показываем большой плашкой — статус autosave виден
          в sticky-баре снизу. Большая плашка нужна только для ошибок. */}

      {negativeMargin && p.canSeeCost && (
        <div className="flex items-start gap-2 rounded-md bg-amber-500/10 border-l-4 border-l-amber-500 border-y border-r border-y-amber-500/20 border-r-amber-500/20 px-4 py-2.5 text-[14px] text-amber-800">
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

          {/* Финансы: 3 поля + сводка */}
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

              {p.canSeeCost && (
                <label>
                  <FieldLabel>
                    <span className="inline-flex items-center gap-1">
                      Себестоимость, ₽
                      <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-ink-900/[0.06] text-ink-700 text-[9px] tracking-wider normal-case">
                        <Lock size={8} /> приватно
                      </span>
                    </span>
                  </FieldLabel>
                  <Input
                    type="number" name="costAmount" defaultValue={Number(order?.costAmount ?? 0)}
                    disabled={disableCost}
                    onChange={(e) => setCost(Number(e.target.value) || 0)}
                    className="mt-1 tabular-nums" min={0}
                  />
                  {fe['costAmount'] && <span className="text-xs text-bad mt-1 block">{fe['costAmount']}</span>}
                </label>
              )}
            </div>

            {/* Сводка вычисляемых: единый блок, выделен фоном — это не инпуты */}
            <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4 px-4 py-3 rounded-md bg-canvas border border-line">
              <Metric label="К доплате клиентом" value={fmtMoney(remaining)} size="md" />
              {p.canSeeCost && (
                <Metric
                  label={
                    <span className="inline-flex items-center gap-1">
                      Маржа
                      <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-ink-900/[0.06] text-ink-700 text-[9px] tracking-wider normal-case">
                        <Lock size={8} /> приватно
                      </span>
                    </span>
                  }
                  value={(margin >= 0 ? '+' : '') + fmtMoney(margin)}
                  tone={margin >= 0 ? 'ok' : 'bad'}
                  size="md"
                />
              )}
            </div>
          </Card>

          {comments}
        </div>

        {/* Правая колонка */}
        <aside className="space-y-4">
          {/* Этап управляется только через горизонтальный StageStepper выше.
              Селект убран как избыточный — здесь только скрытое поле, чтобы
              значение stage уходило в server action при сабмите формы. */}
          <input type="hidden" name="stage" value={stage} />
          {fe['stage'] && (
            <div className="rounded-md bg-bad/5 border-l-4 border-l-bad px-3 py-2 text-[12px] text-bad">
              {fe['stage']}
            </div>
          )}

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
        </aside>
      </div>

      {/* Sticky bottom bar: всегда виден на скролле длинной формы.
          В режиме edit — кнопка Сохранить заменена на индикатор autosave;
          в режиме create — оставлена явная кнопка Создать. */}
      <div className="sticky bottom-0 -mx-6 px-6 py-3 bg-canvas/90 backdrop-blur-md border-t border-line z-10">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-6">
            <Metric
              label="К доплате клиентом"
              value={fmtMoney(remaining)}
              size="sm"
            />
            {p.canSeeCost && (
              <Metric
                label="Маржа"
                value={(margin >= 0 ? '+' : '') + fmtMoney(margin)}
                tone={margin >= 0 ? 'ok' : 'bad'}
                size="sm"
              />
            )}
          </div>
          <div className="flex items-center gap-3">
            {mode === 'edit' && <AutosaveStatus state={state} />}
            {p.canDelete && order && <DeleteButton orderId={order.id} />}
            {mode === 'create' && <SaveButton label="Создать" />}
          </div>
        </div>
      </div>
    </form>
  );
}

// Индикатор autosave в sticky-баре. Три состояния:
//   - идёт сохранение  → "Сохранение…"
//   - последняя ok     → "Сохранено"
//   - ошибка           → "Не сохранено" (текст ошибки сверху в плашке)
//   - покой            → "Изменения сохраняются автоматически"
function AutosaveStatus({ state }: { state: OrderActionState }) {
  const { pending } = useFormStatus();
  if (pending) {
    return (
      <span className="inline-flex items-center gap-2 text-[12px] text-ink-500">
        <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
        Сохранение…
      </span>
    );
  }
  if (state?.ok) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[12px] text-ok">
        <CheckCircle2 size={13} /> Сохранено
      </span>
    );
  }
  if (state && !state.ok) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[12px] text-bad">
        <AlertCircle size={13} /> Не сохранено
      </span>
    );
  }
  return (
    <span className="text-[12px] text-ink-400">Сохраняется автоматически</span>
  );
}

function SaveButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      <Save size={14} /> {pending ? 'Сохранение…' : label}
    </Button>
  );
}

function DeleteButton({ orderId }: { orderId: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      variant="danger"
      disabled={pending}
      onClick={() => {
        if (!confirm('Удалить заказ безвозвратно?')) return;
        start(async () => {
          await deleteOrderAction(orderId);
        });
      }}
    >
      <Trash2 size={14} /> {pending ? 'Удаление…' : 'Удалить'}
    </Button>
  );
}
