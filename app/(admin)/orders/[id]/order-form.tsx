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
import { Save, AlertCircle, CheckCircle2, AlertTriangle, Lock, Phone, MessageCircle, Clock } from 'lucide-react';
import type { Stage, Role } from '@prisma/client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Card, Input, Textarea, Select, Button, FieldLabel } from '@/components/ui';
import { fmtMoney, phoneDigits } from '@/lib/format';
import { Metric } from '@/components/metric';
import StageStepper from '@/components/stage-stepper';
import UndoDeleteButton from '@/components/undo-delete-button';
import { deleteOrderAction, extendAwaitingAction, resumeFromAwaitingAction, closeFromAwaitingAction, type OrderActionState } from '../actions';
import AddressField from './address-field';
import { awaitingStateOf } from '@/lib/awaiting';

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
  surveyEndAt: Date | null;
  installAt: Date | null;
  installEndAt: Date | null;
  awaitingClient: boolean;
  awaitingClientNote: string;
  awaitingClientSince: Date | null;
  awaitingClientUntil: Date | null;
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
                <div className="mt-1 flex gap-2">
                  <Input
                    name="clientPhone"
                    defaultValue={order?.clientPhone}
                    disabled={disableClient}
                    className="tabular-nums flex-1"
                  />
                  <PhoneActions phone={order?.clientPhone ?? ''} />
                </div>
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
            <FieldLabel>Дата и интервал</FieldLabel>
            <div className="mt-1 grid grid-cols-2 gap-2">
              <Input
                type="datetime-local" name="surveyAt"
                defaultValue={toLocalInputValue(order?.surveyAt ?? null)}
                disabled={disableClient}
                aria-label="Начало интервала замера"
              />
              <Input
                type="datetime-local" name="surveyEndAt"
                defaultValue={toLocalInputValue(order?.surveyEndAt ?? null)}
                disabled={disableClient}
                aria-label="Конец интервала замера"
                placeholder="до"
              />
            </div>
            <p className="text-[11px] text-ink-400 mt-1">
              Второе поле — конец интервала. Оставьте пустым, если время точное.
            </p>
            {fe['surveyAt']    && <span className="text-xs text-bad mt-1 block">{fe['surveyAt']}</span>}
            {fe['surveyEndAt'] && <span className="text-xs text-bad mt-1 block">{fe['surveyEndAt']}</span>}
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
            <FieldLabel>Дата и интервал</FieldLabel>
            <div className="mt-1 grid grid-cols-2 gap-2">
              <Input
                type="datetime-local" name="installAt"
                defaultValue={toLocalInputValue(order?.installAt ?? null)}
                disabled={disableClient}
                aria-label="Начало интервала установки"
              />
              <Input
                type="datetime-local" name="installEndAt"
                defaultValue={toLocalInputValue(order?.installEndAt ?? null)}
                disabled={disableClient}
                aria-label="Конец интервала установки"
                placeholder="до"
              />
            </div>
            <p className="text-[11px] text-ink-400 mt-1">
              Второе поле — конец интервала. Оставьте пустым, если время точное.
            </p>
            {fe['installAt']    && <span className="text-xs text-bad mt-1 block">{fe['installAt']}</span>}
            {fe['installEndAt'] && <span className="text-xs text-bad mt-1 block">{fe['installEndAt']}</span>}
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

          <AwaitingClientCard
            orderId={order?.id ?? ''}
            initial={order?.awaitingClient ?? false}
            initialNote={order?.awaitingClientNote ?? ''}
            since={order?.awaitingClientSince ?? null}
            until={order?.awaitingClientUntil ?? null}
            disabled={lockedClosed}
            canSeeDecisions={mode === 'edit' && !!order}
          />
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
  return (
    <UndoDeleteButton
      action={async () => { await deleteOrderAction(orderId); }}
      label="Удалить заказ"
      successMessage="Заказ будет удалён"
    />
  );
}

// Кнопки звонка и Max-мессенджера рядом с полем телефона.
// tel: открывается на десктопе тоже (через системный обработчик / Skype / FaceTime).
// max.ru/+digits открывает чат в приложении Max или веб-версии.
function PhoneActions({ phone }: { phone: string }) {
  const digits = phoneDigits(phone);
  const disabled = digits.length < 5;
  const tel = `tel:+${digits}`;
  const max = `https://max.ru/+${digits}`;
  const cls =
    'inline-flex items-center justify-center w-10 h-10 rounded-md border border-line ' +
    'bg-white hover:bg-canvas text-ink-900 hover:border-ink-900/20 transition-colors ' +
    'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white';
  if (disabled) {
    return (
      <span className="flex gap-1.5">
        <button type="button" disabled className={cls} aria-label="Позвонить (нет номера)">
          <Phone size={16} />
        </button>
      </span>
    );
  }
  return (
    <span className="flex gap-1.5">
      <a
        href={tel}
        className={cls}
        aria-label="Позвонить клиенту"
        title="Позвонить"
      >
        <Phone size={16} />
      </a>
      <a
        href={max}
        target="_blank"
        rel="noreferrer"
        className={cls}
        aria-label="Написать в Max"
        title="Max"
      >
        <MessageCircle size={16} />
      </a>
    </span>
  );
}

// Блок «Ждём связи с клиентом» — флаг + заметка + 3-дневное окно тишины.
// silent  → серый бейдж «осталось N дн», заказ в списке приглушён.
// overdue → красный бейдж «просрочен N дн» + 3 кнопки решения.
function AwaitingClientCard({
  orderId,
  initial,
  initialNote,
  since,
  until,
  disabled,
  canSeeDecisions,
}: {
  orderId: string;
  initial: boolean;
  initialNote: string;
  since: Date | null;
  until: Date | null;
  disabled: boolean;
  canSeeDecisions: boolean;
}) {
  const [on, setOn] = useState(initial);
  const state = awaitingStateOf({
    awaitingClient: initial,
    awaitingClientSince: since,
    awaitingClientUntil: until,
  });

  return (
    <Card
      title="Ждём связи с клиентом"
      icon={<Clock size={12} />}
    >
      <label className="flex items-start gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          name="awaitingClient"
          checked={on}
          disabled={disabled}
          onChange={(e) => setOn(e.target.checked)}
          className="mt-0.5 w-4 h-4 accent-accent"
        />
        <span className="text-[13px] text-ink-700 leading-snug">
          Клиент должен дать связь / перезвонить / прислать данные
        </span>
      </label>

      {state.kind === 'silent' && (
        <div className="mt-3 inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-ink-900/[0.04] text-ink-500 text-[12px]">
          <Clock size={12} />
          Осталось {state.daysLeft} {plural(state.daysLeft, 'день', 'дня', 'дней')} тишины
        </div>
      )}
      {state.kind === 'overdue' && (
        <div className="mt-3 inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-bad/10 text-bad text-[12px] font-medium">
          <AlertCircle size={12} />
          Просрочено на {state.overdueDays} {plural(state.overdueDays, 'день', 'дня', 'дней')} — нужно решение
        </div>
      )}

      <Textarea
        name="awaitingClientNote"
        rows={2}
        defaultValue={initialNote}
        disabled={disabled || !on}
        placeholder="Что именно ждём (перезвон, согласование даты, паспорт и т.п.)"
        className="mt-3"
        maxLength={500}
      />

      {canSeeDecisions && state.kind === 'overdue' && (
        <div className="mt-3 flex flex-wrap gap-2">
          <AwaitingDecisionButton
            onClick={() => extendAwaitingAction(orderId)}
            label="Продлить +3 дня"
          />
          <AwaitingDecisionButton
            onClick={() => resumeFromAwaitingAction(orderId)}
            label="Вернуть в работу"
          />
          <AwaitingDecisionButton
            onClick={() => closeFromAwaitingAction(orderId)}
            label="Закрыть как отказ"
            tone="bad"
          />
        </div>
      )}
    </Card>
  );
}

function AwaitingDecisionButton({
  onClick,
  label,
  tone,
}: {
  onClick: () => Promise<void>;
  label: string;
  tone?: 'bad';
}) {
  const [pending, setPending] = useState(false);
  const cls =
    tone === 'bad'
      ? 'border-bad/30 text-bad hover:bg-bad/5'
      : 'border-line text-ink-900 hover:bg-canvas';
  return (
    <button
      type="button"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        try { await onClick(); } finally { setPending(false); }
      }}
      className={`inline-flex items-center justify-center gap-1.5 px-3 h-9 rounded-md text-[12px] bg-white border transition-colors disabled:opacity-50 ${cls}`}
    >
      {pending ? '…' : label}
    </button>
  );
}

function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}
