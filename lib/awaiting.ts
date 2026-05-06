// Состояние режима «ждём клиента» с трёхдневным окном тишины.
//
// Логика:
//   - Менеджер включает чекбокс → since=now, until=now+3д. В списке заказов строка
//     рисуется приглушённо (серый текст, без выделения). На неё не отвлекаемся.
//   - Прошло 3 дня и клиент не отозвался → состояние overdue. Строка снова
//     становится обычной + индикатор «нужно решение». Менеджер выбирает:
//     продлить ещё на 3 дня / вернуть в работу (снять флаг) / закрыть как отказ.
//   - Когда чекбокс снят → since=null, until=null, обычный режим.

export const AWAITING_DAYS = 3;
export const AWAITING_MS = AWAITING_DAYS * 24 * 60 * 60 * 1000;

export type AwaitingState =
  | { kind: 'off' }
  | { kind: 'silent';  until: Date; daysLeft: number }
  | { kind: 'overdue'; since: Date; overdueDays: number };

export function awaitingStateOf(o: {
  awaitingClient: boolean;
  awaitingClientSince: Date | null;
  awaitingClientUntil: Date | null;
}, now: Date = new Date()): AwaitingState {
  if (!o.awaitingClient) return { kind: 'off' };
  const until = o.awaitingClientUntil ?? (o.awaitingClientSince
    ? new Date(o.awaitingClientSince.getTime() + AWAITING_MS)
    : null);
  if (!until) return { kind: 'off' };
  const diff = until.getTime() - now.getTime();
  if (diff > 0) {
    return {
      kind: 'silent',
      until,
      daysLeft: Math.ceil(diff / (24 * 60 * 60 * 1000)),
    };
  }
  const since = o.awaitingClientSince ?? until;
  return {
    kind: 'overdue',
    since,
    overdueDays: Math.floor(-diff / (24 * 60 * 60 * 1000)),
  };
}

// Дедлайн «ждём клиента» от момента включения. Используется при выставлении
// флага в server action.
export function awaitingUntilFrom(since: Date): Date {
  return new Date(since.getTime() + AWAITING_MS);
}
