import type { Order } from '../api/kanban';

/** Остаток по договору: заданный явно или сумма договора за вычетом аванса. */
export const getOrderRemainder = (order: Order): number => {
  if (order.remainder != null) {
    return order.remainder;
  }
  return Math.max(0, (order.totalPrice || 0) - (order.prepayment || 0));
};

/** Сколько клиент еще должен по заказу: неоплаченные аванс и остаток. */
export const getOrderDebt = (order: Order): number => {
  const prepaymentDebt = order.prepaymentPaid ? 0 : (order.prepayment || 0);
  const remainderDebt = order.remainderPaid ? 0 : getOrderRemainder(order);
  return prepaymentDebt + remainderDebt;
};
