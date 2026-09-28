import { describe, it, expect } from 'vitest';
import type { Order } from '../api/kanban';
import { getOrderDebt, getOrderRemainder } from './orderPayments';

const order = (fields: Partial<Order>) => ({ id: 1, statusId: 1, ...fields } as Order);

describe('orderPayments', () => {
  it('derives the remainder from the total when it is not set', () => {
    expect(getOrderRemainder(order({ totalPrice: 100, prepayment: 30 }))).toBe(70);
    expect(getOrderRemainder(order({ totalPrice: 100, prepayment: 30, remainder: 50 }))).toBe(50);
    expect(getOrderRemainder(order({ totalPrice: 10, prepayment: 30 }))).toBe(0);
  });

  it('sums only unpaid parts into the debt', () => {
    expect(getOrderDebt(order({ totalPrice: 100, prepayment: 30 }))).toBe(100);
    expect(getOrderDebt(order({ totalPrice: 100, prepayment: 30, prepaymentPaid: true }))).toBe(70);
    expect(getOrderDebt(order({ totalPrice: 100, prepayment: 30, prepaymentPaid: true, remainderPaid: true }))).toBe(0);
  });
});
