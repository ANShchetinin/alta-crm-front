import { describe, it, expect } from 'vitest';
import type { Order, OrderStatus } from '../../../api/kanban';
import type { Employee } from '../../../api/employees';
import type { Expense } from '../../../api/finances';
import {
  calculateCashMetrics,
  filterExpenses,
  filterFinanceOrders,
  filterTransactions,
  getDebtorOrders,
  getPeriodRange,
  isCompletedStatus,
  isDateInRange,
  summarizeInstallers,
  toLocalDateString,
  type DateRange
} from './financeCalculations';

const order = (id: number, fields: Partial<Order> = {}) => ({ id, statusId: 1, ...fields } as Order);
const status = (id: number, name: string, fields: Partial<OrderStatus> = {}): OrderStatus =>
  ({ id, name, color: '#3b82f6', sortOrder: id, ...fields });
const expense = (id: number, fields: Partial<Expense> = {}) =>
  ({ id, title: `Расход ${id}`, category: 'OTHER', amount: 0, expenseDate: '2026-09-10', ...fields } as Expense);
const employee = (id: number, fields: Partial<Employee> = {}) => ({ id, name: `Сотрудник ${id}`, ...fields } as Employee);

const SEPTEMBER: DateRange = { from: new Date(2026, 8, 1), to: new Date(2026, 8, 30, 23, 59, 59, 999) };
const UNBOUNDED: DateRange = { from: null, to: null };
const completedWhen = (...ids: number[]) => (o: Order) => ids.includes(o.id);

describe('getPeriodRange', () => {
  const now = new Date(2026, 8, 15, 12, 0);

  it('covers the current month up to its last millisecond', () => {
    expect(getPeriodRange('THIS_MONTH', now)).toEqual({ from: new Date(2026, 8, 1), to: new Date(2026, 8, 30, 23, 59, 59, 999) });
  });

  it('covers the previous month, including across a year boundary', () => {
    expect(getPeriodRange('LAST_MONTH', now)).toEqual({ from: new Date(2026, 7, 1), to: new Date(2026, 7, 31, 23, 59, 59, 999) });
    expect(getPeriodRange('LAST_MONTH', new Date(2026, 0, 10))).toEqual({
      from: new Date(2025, 11, 1),
      to: new Date(2025, 11, 31, 23, 59, 59, 999)
    });
  });

  it('covers three months including the current one, the year and all time', () => {
    expect(getPeriodRange('THREE_MONTHS', now).from).toEqual(new Date(2026, 6, 1));
    expect(getPeriodRange('THIS_YEAR', now)).toEqual({ from: new Date(2026, 0, 1), to: new Date(2026, 11, 31, 23, 59, 59, 999) });
    expect(getPeriodRange('ALL', now)).toEqual(UNBOUNDED);
  });
});

describe('isDateInRange', () => {
  it('checks both boundaries inclusively and rejects empty dates', () => {
    expect(isDateInRange('2026-09-01T00:00:00', SEPTEMBER)).toBe(true);
    expect(isDateInRange('2026-09-30T23:59:59', SEPTEMBER)).toBe(true);
    expect(isDateInRange('2026-08-31T23:59:59', SEPTEMBER)).toBe(false);
    expect(isDateInRange('2026-10-01T00:00:00', SEPTEMBER)).toBe(false);
    expect(isDateInRange(null, UNBOUNDED)).toBe(false);
    expect(isDateInRange('2000-01-01', UNBOUNDED)).toBe(true);
  });
});

describe('order helpers', () => {
  it('recognizes completed statuses by name', () => {
    expect(isCompletedStatus(status(1, 'Монтаж завершен'))).toBe(true);
    expect(isCompletedStatus(status(2, 'Готово'))).toBe(true);
    expect(isCompletedStatus(status(3, 'Новая заявка'))).toBe(false);
    expect(isCompletedStatus(undefined)).toBe(false);
  });

  it('treats a status flagged as completed in settings as completed whatever its name', () => {
    expect(isCompletedStatus(status(4, 'Сделка закрыта', { isCompleted: true }))).toBe(true);
  });

  it('formats a date by local calendar day, not by UTC', () => {
    expect(toLocalDateString(new Date(2026, 8, 1, 0, 30))).toBe('2026-09-01');
    expect(toLocalDateString(new Date(2026, 11, 31, 23, 59))).toBe('2026-12-31');
  });

  it('keeps orders of statuses included in finances and orders without a known status', () => {
    const statuses = [status(1, 'Новая'), status(2, 'Спам', { includeInFinances: false })];
    const orders = [order(1, { statusId: 1 }), order(2, { statusId: 2 }), order(3, { statusId: 99 })];

    expect(filterFinanceOrders(orders, statuses).map(o => o.id)).toEqual([1, 3]);
  });
});

describe('calculateCashMetrics', () => {
  it('counts received money by payment date and receivables regardless of the period', () => {
    const orders = [
      order(1, { totalPrice: 100, prepayment: 40, prepaymentPaid: true, prepaymentPaidAt: '2026-09-05T10:00:00' }),
      order(2, { totalPrice: 200, prepayment: 50, prepaymentPaid: true, prepaymentPaidAt: '2026-08-20T10:00:00' }),
      order(3, {
        totalPrice: 300,
        prepayment: 100,
        prepaymentPaid: true,
        prepaymentPaidAt: '2026-09-02T10:00:00',
        remainderPaid: true,
        remainderPaidAt: '2026-09-12T10:00:00'
      })
    ];

    const metrics = calculateCashMetrics(orders, [], SEPTEMBER, completedWhen());

    expect(metrics.receivedPrepayments).toBe(140);
    expect(metrics.receivedRemainders).toBe(200);
    expect(metrics.totalCashInflow).toBe(340);
    // Не оплачены остатки заказов 1 (60) и 2 (150)
    expect(metrics.pendingReceivables).toBe(210);
  });

  it('takes installation and material costs of orders completed in the period and expenses of the period', () => {
    const orders = [
      order(1, { totalPrice: 1000, installationPrice: 100, materialsCost: 300, installedAt: '2026-09-10T10:00:00', prepaymentPaid: true, remainderPaid: true }),
      order(2, { totalPrice: 500, installationPrice: 50, materialsCost: 90, installedAt: '2026-08-10T10:00:00', prepaymentPaid: true, remainderPaid: true }),
      order(3, { totalPrice: 700, installationPrice: 70, materialsCost: 200, installedAt: '2026-09-11T10:00:00', prepaymentPaid: true, remainderPaid: true })
    ];
    const expenses = [expense(1, { amount: 40, expenseDate: '2026-09-03' }), expense(2, { amount: 999, expenseDate: '2026-08-03' })];

    const metrics = calculateCashMetrics(orders, expenses, SEPTEMBER, completedWhen(1, 2));

    expect(metrics.completedRevenue).toBe(1000);
    expect(metrics.completedInstallationsCost).toBe(100);
    expect(metrics.materialsCost).toBe(300);
    expect(metrics.totalExpenses).toBe(40);
    expect(metrics.totalCashOutflow).toBe(440);
    expect(metrics.netCashProfit).toBe(metrics.totalCashInflow - 440);
  });
});

describe('filterTransactions', () => {
  const orders = [
    order(1, { orderNumber: 'А-1', clientName: 'Иванов', createdAt: '2026-09-02T10:00:00', prepaymentPaid: true, remainderPaid: true }),
    order(2, { orderNumber: 'А-2', clientName: 'Петров', clientPhone: '+79990001122', createdAt: '2026-09-03T10:00:00', prepaymentPaid: true }),
    order(3, { orderNumber: 'А-3', address: 'ул. Ленина', createdAt: '2026-05-03T10:00:00', remainderPaidAt: '2026-09-20T10:00:00' }),
    order(4, { orderNumber: 'А-4', createdAt: '2026-05-03T10:00:00' })
  ];

  it('filters by payment state', () => {
    const ids = (filter: Parameters<typeof filterTransactions>[2]) => filterTransactions(orders, '', filter, UNBOUNDED).map(o => o.id);

    expect(ids('PAID')).toEqual([1]);
    expect(ids('PREPAYMENT')).toEqual([2]);
    expect(ids('UNPAID')).toEqual([3, 4]);
    expect(ids('DEBT')).toEqual([2, 3, 4]);
  });

  it('searches by number, client, phone and address case-insensitively', () => {
    expect(filterTransactions(orders, 'иванов', 'ALL', UNBOUNDED).map(o => o.id)).toEqual([1]);
    expect(filterTransactions(orders, '0001122', 'ALL', UNBOUNDED).map(o => o.id)).toEqual([2]);
    expect(filterTransactions(orders, 'ЛЕНИНА', 'ALL', UNBOUNDED).map(o => o.id)).toEqual([3]);
  });

  it('keeps orders with any of creation, installation or payment dates in the period', () => {
    expect(filterTransactions(orders, '', 'ALL', SEPTEMBER).map(o => o.id)).toEqual([1, 2, 3]);
  });
});

describe('getDebtorOrders', () => {
  it('returns orders with unpaid amounts, biggest debt first', () => {
    const orders = [
      order(1, { totalPrice: 100, prepayment: 100, prepaymentPaid: true, remainderPaid: true }),
      order(2, { totalPrice: 500, prepayment: 100, remainder: 400, prepaymentPaid: true }),
      order(3, { totalPrice: 900, prepayment: 300, remainder: 600 })
    ];

    expect(getDebtorOrders(orders).map(o => o.id)).toEqual([3, 2]);
  });

  it('sorts by the displayed debt, including a remainder derived from the total', () => {
    const orders = [
      order(1, { totalPrice: 500, prepayment: 100, remainder: 400, prepaymentPaid: true }),
      order(2, { totalPrice: 1000, prepayment: 100, prepaymentPaid: true })
    ];

    expect(getDebtorOrders(orders).map(o => o.id)).toEqual([2, 1]);
  });
});

describe('summarizeInstallers', () => {
  it('sums completed installations in the period and all unfinished ones per installer', () => {
    const employees = [employee(1), employee(2, { position: 'Монтажник' }), employee(3, { position: 'Менеджер' })];
    const orders = [
      order(10, { installedById: 1, installationPrice: 1000, installedAt: '2026-09-05T10:00:00' }),
      order(11, { installedById: 1, installationPrice: 700, installedAt: '2026-08-05T10:00:00' }),
      order(12, { assigneeId: 1, installationPrice: 300 }),
      order(13, { assigneeId: 99, installationPrice: 500 })
    ];

    const result = summarizeInstallers(employees, orders, SEPTEMBER, completedWhen(10, 11));

    expect(result.map(r => r.employee.id)).toEqual([1, 2]);
    expect(result[0]).toMatchObject({ completedCount: 1, completedEarnings: 1000, inProgressCount: 1, inProgressEarnings: 300 });
    expect(result[0].orders.map(o => o.id)).toEqual([10, 11, 12]);
    expect(result[1].orders).toEqual([]);
  });
});

describe('filterExpenses', () => {
  it('filters by category and period', () => {
    const expenses = [
      expense(1, { category: 'RENT', expenseDate: '2026-09-01' }),
      expense(2, { category: 'TAXES', expenseDate: '2026-09-15' }),
      expense(3, { category: 'RENT', expenseDate: '2026-08-15' })
    ];

    expect(filterExpenses(expenses, 'ALL', SEPTEMBER).map(e => e.id)).toEqual([1, 2]);
    expect(filterExpenses(expenses, 'RENT', SEPTEMBER).map(e => e.id)).toEqual([1]);
    expect(filterExpenses(expenses, 'RENT', UNBOUNDED).map(e => e.id)).toEqual([1, 3]);
  });
});
