import { describe, it, expect } from 'vitest';
import type { Order, OrderStatus } from '../api/kanban';

describe('Finances status filtering & calculation logic', () => {
  const mockStatuses: OrderStatus[] = [
    { id: 1, name: 'Новая заявка', color: '#3b82f6', sortOrder: 1, includeInFinances: true },
    { id: 2, name: 'Замер назначен', color: '#8b5cf6', sortOrder: 2, includeInFinances: true },
    { id: 3, name: 'Монтаж завершен', color: '#22c55e', sortOrder: 3, includeInFinances: true },
    { id: 4, name: 'Отменен (спам)', color: '#ef4444', sortOrder: 4, includeInFinances: false },
    { id: 5, name: 'Черновик', color: '#6b7280', sortOrder: 5, includeInFinances: false }
  ];

  const mockOrders: Partial<Order>[] = [
    { id: 101, statusId: 1, totalPrice: 50000, prepayment: 20000, prepaymentPaid: true, remainderPaid: false },
    { id: 102, statusId: 3, totalPrice: 80000, prepayment: 40000, prepaymentPaid: true, remainder: 40000, remainderPaid: true, installationPrice: 12000, materialsCost: 25000 },
    { id: 103, statusId: 4, totalPrice: 150000, prepayment: 50000, prepaymentPaid: false, remainderPaid: false },
    { id: 104, statusId: 5, totalPrice: 30000, prepayment: 10000, prepaymentPaid: true, remainderPaid: false }
  ];

  it('filters out orders whose status has includeInFinances = false', () => {
    const filterFinanceOrders = (ordersList: Partial<Order>[], statusesList: OrderStatus[]) => {
      return ordersList.filter(order => {
        const st = statusesList.find(s => s.id === order.statusId);
        return st ? st.includeInFinances !== false : true;
      });
    };

    const financeOrders = filterFinanceOrders(mockOrders, mockStatuses);

    expect(financeOrders.length).toBe(2);
    expect(financeOrders.map(o => o.id)).toEqual([101, 102]);
  });

  it('includes all orders when all statuses have includeInFinances = true', () => {
    const allEnabledStatuses = mockStatuses.map(s => ({ ...s, includeInFinances: true }));

    const financeOrders = mockOrders.filter(order => {
      const st = allEnabledStatuses.find(s => s.id === order.statusId);
      return st ? st.includeInFinances !== false : true;
    });

    expect(financeOrders.length).toBe(4);
  });

  it('correctly calculates cash inflow and receivables excluding cancelled/draft statuses', () => {
    const filterFinanceOrders = (ordersList: Partial<Order>[], statusesList: OrderStatus[]) => {
      return ordersList.filter(order => {
        const st = statusesList.find(s => s.id === order.statusId);
        return st ? st.includeInFinances !== false : true;
      });
    };

    const financeOrders = filterFinanceOrders(mockOrders, mockStatuses);

    let receivedPrepayments = 0;
    let receivedRemainders = 0;
    let pendingReceivables = 0;

    financeOrders.forEach(order => {
      const prep = order.prepayment || 0;
      const rem = order.remainder != null ? order.remainder : Math.max(0, (order.totalPrice || 0) - prep);

      if (order.prepaymentPaid) {
        receivedPrepayments += prep;
      } else {
        pendingReceivables += prep;
      }

      if (order.remainderPaid) {
        receivedRemainders += rem;
      } else {
        pendingReceivables += rem;
      }
    });

    // Order 101: prep 20000 paid, rem 30000 unpaid
    // Order 102: prep 40000 paid, rem 40000 paid
    // Order 103 (id 4 - cancelled) ignored
    // Order 104 (id 5 - draft) ignored

    expect(receivedPrepayments).toBe(60000); // 20000 + 40000
    expect(receivedRemainders).toBe(40000);   // 40000
    expect(pendingReceivables).toBe(30000);  // 30000
  });
});
