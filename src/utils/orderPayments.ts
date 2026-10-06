import type { Order } from '../api/kanban';

/** Остаток по договору: заданный явно или сумма договора за вычетом аванса. */
export const getOrderRemainder = (order: Order): number => {
  if (order.remainder != null) {
    return order.remainder;
  }
  return Math.max(0, (order.totalPrice || 0) - (order.prepayment || 0));
};

export type PaymentState = 'PAID' | 'PARTIAL' | 'UNPAID';

/** Сколько клиент еще должен по заказу: неоплаченные аванс и остаток. */
export const getOrderDebt = (order: Order): number => {
  const prepaymentDebt = order.prepaymentPaid ? 0 : (order.prepayment || 0);
  const remainderDebt = order.remainderPaid ? 0 : getOrderRemainder(order);
  return prepaymentDebt + remainderDebt;
};

/**
 * Состояние оплаты по суммам, а не по отметкам: часть с нулевой суммой не ждет оплаты, поэтому заказ без аванса
 * оплачен после остатка, а заказ со 100% предоплатой — после аванса. Заказ без суммы — «без оплаты».
 */
export const getPaymentState = (order: Order): PaymentState => {
  const total = (order.prepayment || 0) + getOrderRemainder(order);
  const debt = getOrderDebt(order);
  if (total > 0 && debt <= 0) {
    return 'PAID';
  }
  return debt < total ? 'PARTIAL' : 'UNPAID';
};
