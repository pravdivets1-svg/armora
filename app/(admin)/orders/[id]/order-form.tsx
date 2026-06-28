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
import { Save, AlertCircle, CheckCircle2, AlertTriangle, Lock, Phone } from 'lucide-react';
import type { Stage, Role } from '@prisma/client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Card, Input, Textarea, Select, FieldLabel } from '@/components/ui';
import { IntervalPicker, SURVEY_DEFAULT_HOURS, INSTALL_DEFAULT_HOURS } from '@/components/uikit';
import { fmtMoney, phoneDigits } from '@/lib/format';
import { Metric } from '@/components/metric';
import StageStepper from '@/components/stage-stepper';
import UndoDeleteButton from '@/components/undo-delete-button';
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
  surveyEndAt: Date | null;
  installAt: Date | null;
  installEndAt: Date | null;
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
  hideStageStepper,
}: {
  order?: OrderData;
  action: (state: OrderActionState, fd: FormData) => Promise<OrderActionState>;
  surveyors: UserOpt[];
  installers: UserOpt[];
  role: Role;
  mode: 'create' | 'edit';
  comments?: React.ReactNode;
  hideStageStepper?: boolean;
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
      className="space-y-3"
      // Любое изменение в любом поле формы — взводим таймер autosave.
      // Используем onInput, потому что onChange на checkbox/select работает,
      // но для текстовых полей onInput даёт мгновенный отклик при печати.
      onInput={scheduleAutosave}
      onChange={scheduleAutosave}
      onSubmit={cancelAutosave}
    >
      {/* Stage stepper — главный action в карточке */}
      {!hideStageStepper && mode === 'edit' && order && (
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
        <div className="flex items-start gap-2 rounded-md bg-bad2-soft border border-bad2/20 px-3 py-2 text-[13px] text-bad2">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}

      {/* Статус autosave у верха формы — виден без скролла (важно на мобиле) */}
      {mode === 'edit' && (
        <div className="flex justify-end">
          <AutosaveStatus state={state} />
        </div>
      )}
      {/* "Сохранено" не показываем большой плашкой — статус autosave виден
          в sticky-баре снизу. Большая плашка нужна только для ошибок. */}

      {negativeMargin && p.canSeeCost && (
        <div className="flex items-start gap-2 rounded-md bg-warn2-soft border border-warn2/20 px-3 py-2 text-[13px] text-warn2">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span>
            <strong className="font-semibold">Внимание:</strong> себестоимость ({fmtMoney(cost)}) выше цены по договору ({fmtMoney(total)}).
            Заказ убыточен на {fmtMoney(cost - total)}.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Левая колонка */}
        <div className="md:col-span-2 space-y-3">

          <Card title="Клиент">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label>
                <FieldLabel>ФИО</FieldLabel>
                <Input name="clientName" defaultValue={order?.clientName} disabled={disableClient} className="mt-1" />
                {fe['clientName'] && <span className="text-xs text-bad2 mt-1 block">{fe['clientName']}</span>}
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
                {fe['clientPhone'] && <span className="text-xs text-bad2 mt-1 block">{fe['clientPhone']}</span>}
              </label>
              <label className="md:col-span-2">
                <FieldLabel>Адрес установки</FieldLabel>
                <AddressField defaultValue={order?.clientAddress} disabled={disableClient} />
                {fe['clientAddress'] && <span className="text-xs text-bad2 mt-1 block">{fe['clientAddress']}</span>}
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
                {fe['totalAmount'] && <span className="text-xs text-bad2 mt-1 block">{fe['totalAmount']}</span>}
              </label>
              <label>
                <FieldLabel>Аванс получен, ₽</FieldLabel>
                <Input
                  type="number" name="prepayment" defaultValue={Number(order?.prepayment ?? 0)}
                  disabled={disableTotal}
                  onChange={(e) => setPrepay(Number(e.target.value) || 0)}
                  className="mt-1 tabular-nums" min={0}
                />
                {fe['prepayment'] && <span className="text-xs text-bad2 mt-1 block">{fe['prepayment']}</span>}
              </label>
              <label>
                <FieldLabel>Остаток получен, ₽</FieldLabel>
                <Input
                  type="number" name="finalPayment" defaultValue={Number(order?.finalPayment ?? 0)}
                  disabled={disableFinal}
                  onChange={(e) => setFinalPay(Number(e.target.value) || 0)}
                  className="mt-1 tabular-nums" min={0}
                />
                {fe['finalPayment'] && <span className="text-xs text-bad2 mt-1 block">{fe['finalPayment']}</span>}
              </label>

              {p.canSeeCost && (
                <label>
                  <FieldLabel>
                    <span className="inline-flex items-center gap-1">
                      Себестоимость, ₽
                      <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-subtle text-text2 text-[9px] tracking-wider normal-case">
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
                  {fe['costAmount'] && <span className="text-xs text-bad2 mt-1 block">{fe['costAmount']}</span>}
                </label>
              )}
            </div>

            {/* Сводка вычисляемых: единый блок, выделен фоном — это не инпуты */}
            <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4 px-4 py-3 rounded-md bg-subtle border border-borderc/60">
              <Metric label="К доплате клиентом" value={fmtMoney(remaining)} size="md" />
              {p.canSeeCost && (
                <Metric
                  label={
                    <span className="inline-flex items-center gap-1">
                      Маржа
                      <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-subtle text-text2 text-[9px] tracking-wider normal-case">
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
        <aside className="space-y-3">
          {/* Этап управляется только через горизонтальный StageStepper выше.
              Селект убран как избыточный — здесь только скрытое поле, чтобы
              значение stage уходило в server action при сабмите формы. */}
          <input type="hidden" name="stage" value={stage} />
          {fe['stage'] && (
            <div className="rounded-md bg-bad2-soft border border-bad2/20 px-3 py-2 text-[12px] text-bad2">
              {fe['stage']}
            </div>
          )}

          <Card title="Замер">
            <IntervalPicker
              name="survey"
              defaultStart={order?.surveyAt ?? null}
              defaultEnd={order?.surveyEndAt ?? null}
              defaultDurationHours={SURVEY_DEFAULT_HOURS}
              disabled={disableClient}
              onChange={scheduleAutosave}
            />
            {fe['surveyAt']    && <span className="text-xs text-bad2 mt-1 block">{fe['surveyAt']}</span>}
            {fe['surveyEndAt'] && <span className="text-xs text-bad2 mt-1 block">{fe['surveyEndAt']}</span>}
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
            <IntervalPicker
              name="install"
              defaultStart={order?.installAt ?? null}
              defaultEnd={order?.installEndAt ?? null}
              defaultDurationHours={INSTALL_DEFAULT_HOURS}
              disabled={disableClient}
              onChange={scheduleAutosave}
            />
            {fe['installAt']    && <span className="text-xs text-bad2 mt-1 block">{fe['installAt']}</span>}
            {fe['installEndAt'] && <span className="text-xs text-bad2 mt-1 block">{fe['installEndAt']}</span>}
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
      {/* Мобильный футер действий в потоке: на мобиле sticky-бар уходит под таб-бар
          и невидим, поэтому autosave / удаление / создание показываем здесь.
          «К доплате» уже есть в сводке формы выше; первичный CTA этапа — в плавающем
          доке HeroStage над таб-баром. */}
      <div className="lg:hidden pt-1">
        {mode === 'create' ? (
          <SaveButton label="Создать" />
        ) : (
          <div className="flex items-center justify-between gap-3">
            {mode === 'edit' && <AutosaveStatus state={state} />}
            {p.canDelete && order && <DeleteButton orderId={order.id} />}
          </div>
        )}
      </div>

      {/* Sticky bottom bar (десктоп): на мобиле действия живут в футере выше и в
          плавающем доке HeroStage, поэтому здесь — только для lg+. */}
      <div className="hidden lg:block sticky bottom-0 -mx-6 px-6 py-2.5 bg-app/90 backdrop-blur-md border-t border-borderc/70 z-10">
        {/* Деньги не дублируем — они в сводке формы выше (единственный источник). Здесь только действия. */}
        <div className="flex items-center justify-end gap-3 flex-wrap">
          {mode === 'edit' && <AutosaveStatus state={state} />}
          {p.canDelete && order && <DeleteButton orderId={order.id} />}
          {mode === 'create' && <SaveButton label="Создать" />}
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
      <span className="inline-flex items-center gap-2 text-[12px] text-text2 tabular-nums">
        <span className="w-1.5 h-1.5 rounded-full bg-text2 animate-pulse" />
        Сохранение…
      </span>
    );
  }
  if (state?.ok) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[12px] text-ok2">
        <CheckCircle2 size={13} /> Сохранено
      </span>
    );
  }
  if (state && !state.ok) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[12px] text-bad2">
        <AlertCircle size={13} /> Не сохранено
      </span>
    );
  }
  return (
    <span className="text-[12px] text-text3">Сохраняется автоматически</span>
  );
}

function SaveButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-md
                 bg-accent text-white text-[13.5px] font-medium
                 hover:bg-accent/90 transition-colors
                 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <Save size={14} /> {pending ? 'Сохранение…' : label}
    </button>
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

// Кнопка звонка рядом с полем телефона.
// tel: открывается на десктопе тоже (через системный обработчик / Skype / FaceTime).
function PhoneActions({ phone }: { phone: string }) {
  const digits = phoneDigits(phone);
  const disabled = digits.length < 5;
  const tel = `tel:+${digits}`;
  const cls =
    'inline-flex items-center justify-center w-10 h-10 rounded-md border border-borderc ' +
    'bg-card hover:bg-subtle/70 text-text2 hover:text-text1 transition-colors ' +
    'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-card';
  if (disabled) {
    return (
      <button type="button" disabled className={cls} aria-label="Позвонить (нет номера)">
        <Phone size={16} />
      </button>
    );
  }
  return (
    <a
      href={tel}
      className={cls}
      aria-label="Позвонить клиенту"
      title="Позвонить"
    >
      <Phone size={16} />
    </a>
  );
}


