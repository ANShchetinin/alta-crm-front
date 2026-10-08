import type { Order, OrderStatus } from '../../../api/kanban';
import type { Employee } from '../../../api/employees';
import type { Expense } from '../../../api/finances';
import { getOrderDebt, getOrderRemainder, getPaymentState } from '../../../utils/orderPayments';
import { phoneMatches } from '../../../utils/phone';

export type PeriodFilter = 'THIS_MONTH' | 'LAST_MONTH' | 'THREE_MONTHS' | 'THIS_YEAR' | 'ALL';
export type PaymentStatusFilter = 'ALL' | 'PAID' | 'PREPAYMENT' | 'UNPAID' | 'DEBT';

export interface DateRange {
  from: Date | null;
  to: Date | null;
}

export interface CashMetrics {
  receivedPrepayments: number;
  receivedRemainders: number;
  totalCashInflow: number;
  pendingReceivables: number;
  completedRevenue: number;
  completedInstallationsCost: number;
  materialsCost: number;
  totalExpenses: number;
  /** Расходы на ИИ (распознавание речи, ассистент) за период, в целых рублях (точная сумма — во вкладке ИИ). */
  aiCosts: number;
  /** Затраты периода: материалы и монтаж завершенных заказов, расходы компании и расходы на ИИ. */
  totalCosts: number;
  /** Прибыль периода: выручка завершенных заказов минус {@link totalCosts}. */
  profit: number;
}

/** Заказ монтажника и его начисление по этому заказу. */
export interface InstallerOrder {
  order: Order;
  amount: number;
}

export interface InstallerSummary {
  employee: Employee;
  completedCount: number;
  completedEarnings: number;
  inProgressCount: number;
  inProgressEarnings: number;
  orders: InstallerOrder[];
}

export const PERIOD_OPTIONS: { value: PeriodFilter; label: string }[] = [
  { value: 'THIS_MONTH', label: 'Этот месяц' },
  { value: 'LAST_MONTH', label: 'Прошлый месяц' },
  { value: 'THREE_MONTHS', label: '3 месяца' },
  { value: 'THIS_YEAR', label: 'Этот год' },
  { value: 'ALL', label: 'Все время' }
];

const endOfMonth = (year: number, month: number) => new Date(year, month + 1, 0, 23, 59, 59, 999);

/** Границы периода в локальном времени пользователя; для «Все время» — без границ. */
export const getPeriodRange = (period: PeriodFilter, now: Date = new Date()): DateRange => {
  const year = now.getFullYear();
  const month = now.getMonth();
  switch (period) {
    case 'THIS_MONTH':
      return { from: new Date(year, month, 1), to: endOfMonth(year, month) };
    case 'LAST_MONTH':
      return { from: new Date(year, month - 1, 1), to: endOfMonth(year, month - 1) };
    case 'THREE_MONTHS':
      return { from: new Date(year, month - 2, 1), to: endOfMonth(year, month) };
    case 'THIS_YEAR':
      return { from: new Date(year, 0, 1), to: new Date(year, 11, 31, 23, 59, 59, 999) };
    case 'ALL':
      return { from: null, to: null };
  }
};

/** Дата попадает в период; пустая дата не попадает никогда, кроме периода без границ — тоже нет. */
export const isDateInRange = (dateStr: string | null | undefined, range: DateRange): boolean => {
  if (!dateStr) {
    return false;
  }
  if (!range.from && !range.to) {
    return true;
  }
  const d = new Date(dateStr);
  if (range.from && d < range.from) {
    return false;
  }
  if (range.to && d > range.to) {
    return false;
  }
  return true;
};


/** Заказы в статусах, которые учитываются в финансах (заказы без статуса учитываются). */
export const filterFinanceOrders = (orders: Order[], statuses: OrderStatus[]): Order[] => {
  return orders.filter(order => {
    const status = statuses.find(s => s.id === order.statusId);
    return status ? status.includeInFinances !== false : true;
  });
};

/**
 * Показатели раздела «Финансы». Прибыль — по завершенным в периоде заказам: их выручка минус материалы, монтаж,
 * расходы компании и расходы на ИИ за период ({@code aiCosts} — сумма за тот же период с сервера). Справочно: приход денег — по датам оплат, дебиторка — все неоплаченные суммы
 * независимо от периода.
 */
export const calculateCashMetrics = (
  orders: Order[],
  expenses: Expense[],
  range: DateRange,
  isCompleted: (order: Order) => boolean,
  aiCosts = 0
): CashMetrics => {
  let receivedPrepayments = 0;
  let receivedRemainders = 0;
  let pendingReceivables = 0;
  let completedRevenue = 0;
  let completedInstallationsCost = 0;
  let materialsCost = 0;

  orders.forEach(order => {
    const prepayment = order.prepayment || 0;
    const remainder = getOrderRemainder(order);

    if (order.prepaymentPaid) {
      if (isDateInRange(order.prepaymentPaidAt || order.createdAt, range)) {
        receivedPrepayments += prepayment;
      }
    } else {
      pendingReceivables += prepayment;
    }

    if (order.remainderPaid) {
      if (isDateInRange(order.remainderPaidAt || order.installedAt || order.createdAt, range)) {
        receivedRemainders += remainder;
      }
    } else {
      pendingReceivables += remainder;
    }

    if (isCompleted(order) && isDateInRange(order.installedAt || order.createdAt, range)) {
      completedRevenue += order.totalPrice || 0;
      completedInstallationsCost += order.installationPrice || 0;
      materialsCost += order.materialsCost || 0;
    }
  });

  const totalExpenses = expenses
    .filter(expense => isDateInRange(expense.expenseDate, range))
    .reduce((sum, expense) => sum + (expense.amount || 0), 0);

  const roundedAiCosts = Math.round(aiCosts);
  const totalCosts = totalExpenses + roundedAiCosts + completedInstallationsCost + materialsCost;

  return {
    receivedPrepayments,
    receivedRemainders,
    totalCashInflow: receivedPrepayments + receivedRemainders,
    pendingReceivables,
    completedRevenue,
    completedInstallationsCost,
    materialsCost,
    totalExpenses,
    aiCosts: roundedAiCosts,
    totalCosts,
    profit: completedRevenue - totalCosts
  };
};

/** Фильтр по состоянию оплаты (по суммам, см. {@link getPaymentState}); PREPAYMENT — оплачен частично. */
const matchesPaymentFilter = (order: Order, filter: PaymentStatusFilter): boolean => {
  switch (filter) {
    case 'PAID':
      return getPaymentState(order) === 'PAID';
    case 'PREPAYMENT':
      return getPaymentState(order) === 'PARTIAL';
    case 'UNPAID':
      return getPaymentState(order) === 'UNPAID';
    case 'DEBT':
      return getOrderDebt(order) > 0;
    case 'ALL':
      return true;
  }
};

const matchesSearch = (order: Order, query: string): boolean => {
  const q = query.trim().toLowerCase();
  if (!q) {
    return true;
  }
  return phoneMatches(order.clientPhone, q)
    || [order.orderNumber, order.clientName, order.address].some(value => (value || '').toLowerCase().includes(q));
};

/** Сделки вкладки взаиморасчетов: поиск, статус оплаты и хотя бы одна дата (создание, монтаж, оплаты) в периоде. */
export const filterTransactions = (
  orders: Order[],
  searchQuery: string,
  paymentFilter: PaymentStatusFilter,
  range: DateRange
): Order[] => {
  const unbounded = !range.from && !range.to;
  return orders.filter(order => {
    if (!matchesSearch(order, searchQuery) || !matchesPaymentFilter(order, paymentFilter)) {
      return false;
    }
    if (unbounded) {
      return true;
    }
    return [order.createdAt, order.installedAt, order.prepaymentPaidAt, order.remainderPaidAt]
      .some(date => isDateInRange(date, range));
  });
};

/** Должники: заказы с неоплаченной суммой, от самого большого долга к меньшему. */
export const getDebtorOrders = (orders: Order[]): Order[] => {
  return orders
    .filter(order => getOrderDebt(order) > 0)
    .sort((a, b) => getOrderDebt(b) - getOrderDebt(a));
};

/**
 * Начисления по заказу: доли из списка монтажников (сумма, иначе процент, иначе поровну); заказ без списка —
 * вся стоимость монтажа смонтировавшему, иначе ответственному. Так же считает «Мой заработок» на бэкенде.
 */
export const getInstallerPayouts = (order: Order): { employeeId: number; amount: number }[] => {
  const price = order.installationPrice || 0;
  const installers = order.installers || [];
  if (installers.length > 0) {
    return installers.map(installer => ({
      employeeId: installer.employeeId,
      amount: installer.amount ?? Math.round(price * (installer.sharePercent ?? 100 / installers.length)) / 100
    }));
  }
  const installerId = order.installedById || order.assigneeId;
  return installerId ? [{ employeeId: installerId, amount: price }] : [];
};

/**
 * Начисления монтажникам по их долям в заказах (см. {@link getInstallerPayouts}). Завершенные считаются
 * в периоде, незавершенные — все. В списке остаются монтажники с заказами и сотрудники с должностью «монтаж...».
 */
export const summarizeInstallers = (
  employees: Employee[],
  orders: Order[],
  range: DateRange,
  isCompleted: (order: Order) => boolean
): InstallerSummary[] => {
  const byEmployee = new Map<number, InstallerSummary>();
  employees.forEach(employee => {
    byEmployee.set(employee.id, {
      employee,
      completedCount: 0,
      completedEarnings: 0,
      inProgressCount: 0,
      inProgressEarnings: 0,
      orders: []
    });
  });

  orders.forEach(order => {
    const completed = isCompleted(order);
    const completedInRange = completed && isDateInRange(order.installedAt || order.createdAt, range);
    getInstallerPayouts(order).forEach(({ employeeId, amount }) => {
      const summary = byEmployee.get(employeeId);
      if (!summary) {
        return;
      }
      summary.orders.push({ order, amount });
      if (!completed) {
        summary.inProgressCount += 1;
        summary.inProgressEarnings += amount;
      } else if (completedInRange) {
        summary.completedCount += 1;
        summary.completedEarnings += amount;
      }
    });
  });

  return Array.from(byEmployee.values())
    .filter(item => item.orders.length > 0 || item.employee.position?.toLowerCase().includes('монтаж'))
    .sort((a, b) => b.completedEarnings - a.completedEarnings);
};

/** Расходы за период с фильтром по категории ({@code 'ALL'} — все категории). */
export const filterExpenses = (expenses: Expense[], category: string, range: DateRange): Expense[] => {
  return expenses.filter(expense =>
    (category === 'ALL' || expense.category === category) && isDateInRange(expense.expenseDate, range)
  );
};
