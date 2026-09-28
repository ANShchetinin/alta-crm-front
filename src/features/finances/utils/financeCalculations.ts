import type { Order, OrderStatus } from '../../../api/kanban';
import type { Employee } from '../../../api/employees';
import type { Expense } from '../../../api/finances';

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
  totalCashOutflow: number;
  netCashProfit: number;
}

export interface InstallerSummary {
  employee: Employee;
  completedCount: number;
  completedEarnings: number;
  inProgressCount: number;
  inProgressEarnings: number;
  orders: Order[];
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

/** Дата в формате YYYY-MM-DD по локальному времени (toISOString дал бы дату по UTC). */
export const toLocalDateString = (date: Date): string => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

/** Завершающий статус: отмечен флагом в настройках или назван как завершающий (правило совпадает с бэкендом). */
export const isCompletedStatus = (status: OrderStatus | undefined): boolean => {
  if (!status) {
    return false;
  }
  if (status.isCompleted) {
    return true;
  }
  const name = (status.name || '').toLowerCase();
  return name.includes('заверш') || name.includes('готов') || name.includes('выполнен') || name.includes('complete');
};

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

/** Заказы в статусах, которые учитываются в финансах (заказы без статуса учитываются). */
export const filterFinanceOrders = (orders: Order[], statuses: OrderStatus[]): Order[] => {
  return orders.filter(order => {
    const status = statuses.find(s => s.id === order.statusId);
    return status ? status.includeInFinances !== false : true;
  });
};

/**
 * Показатели кассы кассовым методом: приход — по датам оплат, затраты на материалы и монтаж — по завершенным
 * в периоде заказам, дебиторка — все неоплаченные суммы независимо от периода.
 */
export const calculateCashMetrics = (
  orders: Order[],
  expenses: Expense[],
  range: DateRange,
  isCompleted: (order: Order) => boolean
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

  const totalCashInflow = receivedPrepayments + receivedRemainders;
  const totalCashOutflow = totalExpenses + completedInstallationsCost + materialsCost;

  return {
    receivedPrepayments,
    receivedRemainders,
    totalCashInflow,
    pendingReceivables,
    completedRevenue,
    completedInstallationsCost,
    materialsCost,
    totalExpenses,
    totalCashOutflow,
    netCashProfit: totalCashInflow - totalCashOutflow
  };
};

const matchesPaymentFilter = (order: Order, filter: PaymentStatusFilter): boolean => {
  switch (filter) {
    case 'PAID':
      return Boolean(order.prepaymentPaid && order.remainderPaid);
    case 'PREPAYMENT':
      return Boolean(order.prepaymentPaid && !order.remainderPaid);
    case 'UNPAID':
      return !order.prepaymentPaid && !order.remainderPaid;
    case 'DEBT':
      return !order.prepaymentPaid || !order.remainderPaid;
    case 'ALL':
      return true;
  }
};

const matchesSearch = (order: Order, query: string): boolean => {
  const q = query.trim().toLowerCase();
  if (!q) {
    return true;
  }
  return [order.orderNumber, order.clientName, order.clientPhone, order.address]
    .some(value => (value || '').toLowerCase().includes(q));
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
 * Начисления монтажникам: по исполнителю заказа (смонтировавший, иначе ответственный). Завершенные считаются
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
    const installerId = order.installedById || order.assigneeId;
    const summary = installerId ? byEmployee.get(installerId) : undefined;
    if (!summary) {
      return;
    }
    summary.orders.push(order);
    const price = order.installationPrice || 0;
    if (!isCompleted(order)) {
      summary.inProgressCount += 1;
      summary.inProgressEarnings += price;
    } else if (isDateInRange(order.installedAt || order.createdAt, range)) {
      summary.completedCount += 1;
      summary.completedEarnings += price;
    }
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
