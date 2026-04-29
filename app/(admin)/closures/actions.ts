'use server';

// Server Actions для панели закрытия — обёртки над общими actions заказов.

import { approveClosureAction, rejectClosureAction } from '../orders/actions';

export async function approveAction(orderId: string) {
  return approveClosureAction(orderId);
}

export async function rejectAction(orderId: string) {
  return rejectClosureAction(orderId);
}
