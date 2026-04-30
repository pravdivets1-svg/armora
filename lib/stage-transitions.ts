// Машина состояний заказа.
// Источник истины для допустимых переходов stage по ролям.
// Пайплайн: new -> survey_scheduled -> survey_done -> production
//        -> ready_to_install -> installed -> pending_closure -> closed
//
// Правила:
//   - Директор может ходить в любую сторону (кроме closed -> *: closed правится
//     только напрямую через edit; pending_closure -> closed идёт через approveClosure).
//   - Менеджер и замерщик ходят вперёд по пайплайну + могут откатиться на 1 шаг
//     (исправление ошибки). НЕ могут переводить в closed (это директор).
//   - Установщик: ТОЛЬКО ready_to_install <-> installed. Больше ничего.
//   - Любая роль может оставить stage без изменений (same -> same).

import type { Role, Stage } from '@prisma/client';

// Полный пайплайн в порядке прохождения
export const PIPELINE: Stage[] = [
  'new',
  'survey_scheduled',
  'survey_done',
  'production',
  'ready_to_install',
  'installed',
  'pending_closure',
  'closed',
];

// Сосед +1 / -1 в пайплайне
function neighbour(stage: Stage, delta: 1 | -1): Stage | null {
  const i = PIPELINE.indexOf(stage);
  if (i < 0) return null;
  const j = i + delta;
  if (j < 0 || j >= PIPELINE.length) return null;
  return PIPELINE[j];
}

// Допустим ли переход from -> to для роли
export function isStageTransitionAllowed(
  role: Role,
  from: Stage,
  to: Stage,
): boolean {
  // Без изменения — всегда ок (форма пересохраняется без смены этапа)
  if (from === to) return true;

  // closed — спецслучай. Никто не переводит ИЗ closed через updateOrderAction
  // (для повторного открытия — отдельный action; на текущем этапе запрещаем).
  // В closed переводит только approveClosureAction (вне этой функции).
  if (from === 'closed') return false;
  if (to === 'closed') return false;

  if (role === 'director') {
    // Директор ходит свободно по пайплайну (кроме closed, см. выше).
    // Перевод в pending_closure — ок (потом approveClosure -> closed).
    return true;
  }

  if (role === 'installer') {
    // Установщик: только ready_to_install <-> installed.
    return (
      (from === 'ready_to_install' && to === 'installed') ||
      (from === 'installed' && to === 'ready_to_install')
    );
  }

  if (role === 'manager' || role === 'surveyor') {
    // Шаг вперёд или откат на 1 шаг по пайплайну.
    // Перевод в pending_closure разрешён (как «подача на закрытие»).
    return to === neighbour(from, 1) || to === neighbour(from, -1);
  }

  return false;
}

// Человекочитаемое сообщение об ошибке
export function transitionErrorMessage(
  role: Role,
  from: Stage,
  to: Stage,
): string {
  if (from === 'closed') {
    return 'Закрытый заказ нельзя переводить в другой этап';
  }
  if (to === 'closed') {
    return 'Закрыть заказ может только директор через панель «На закрытие»';
  }
  if (role === 'installer') {
    return 'Установщик может только отметить «Установлена» или вернуть в «Готова к установке»';
  }
  return `Недопустимый переход этапа: ${from} → ${to}. Шагать можно только на 1 этап вперёд или назад.`;
}
