import type { Order, OrderStatus } from '../../../api/kanban';
import type { Client } from '../../../api/clients';
import type { Employee } from '../../../api/employees';
import { formatDateTimeInTimezone } from '../../../utils/dateUtils';

export type SortField = 'installedAt' | 'createdAt' | 'orderNumber' | 'totalPrice' | 'clientName';
export type SortDirection = 'asc' | 'desc';

export interface ArchiveFilters {
  search: string;
  year: string;
  month: string;
  employeeId: string;
  statusId: string;
}

export const ALL = 'ALL';

export const EMPTY_FILTERS: ArchiveFilters = { search: '', year: ALL, month: ALL, employeeId: ALL, statusId: ALL };

export const MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
].map((label, index) => ({ value: String(index), label }));

export const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: 'installedAt', label: 'По дате завершения' },
  { value: 'createdAt', label: 'По дате создания' },
  { value: 'totalPrice', label: 'По стоимости' },
  { value: 'clientName', label: 'По клиенту' },
  { value: 'orderNumber', label: 'По номеру' }
];

/** Дата, по которой заказ попадает в архив: завершение, а без него — создание. */
export const completionDateOf = (order: Order): Date | null => {
  const value = order.installedAt || order.createdAt;
  return value ? new Date(value) : null;
};

/** Годы завершения заказов, от новых к старым. */
export const availableYears = (orders: Order[]): string[] => {
  const years = new Set<string>();
  orders.forEach(order => {
    const date = completionDateOf(order);
    if (date) {
      years.add(date.getFullYear().toString());
    }
  });
  return Array.from(years).sort((a, b) => b.localeCompare(a));
};

export const activeFiltersCount = (filters: ArchiveFilters): number =>
  [filters.search.trim() !== '', filters.year !== ALL, filters.month !== ALL, filters.employeeId !== ALL, filters.statusId !== ALL]
    .filter(Boolean).length;

const matchesSearch = (order: Order, query: string, clients: Client[], employees: Employee[]): boolean => {
  const q = query.toLowerCase().trim();
  if (!q) {
    return true;
  }
  const client = clients.find(c => c.id === order.clientId);
  const employee = employees.find(e => e.id === (order.installedById || order.assigneeId));
  return (order.orderNumber?.toLowerCase().includes(q) ?? false)
    || order.id.toString() === q
    || `№${order.id}` === q
    || (order.clientName || client?.name || '').toLowerCase().includes(q)
    || (order.clientPhone || client?.phone || '').includes(q)
    || (order.address || '').toLowerCase().includes(q)
    || (order.description || '').toLowerCase().includes(q)
    || (order.installedByName || order.assigneeName || employee?.name || '').toLowerCase().includes(q);
};

/**
 * Заказы архива по поиску (номер, клиент, телефон, адрес, описание, сотрудник), году и месяцу завершения,
 * сотруднику (смонтировал, ответственный или замерщик) и статусу. Заказы без дат по году и месяцу не отсекаются.
 */
export const filterArchiveOrders = (orders: Order[], filters: ArchiveFilters, clients: Client[], employees: Employee[]): Order[] => {
  return orders.filter(order => {
    if (!matchesSearch(order, filters.search, clients, employees)) {
      return false;
    }
    const date = completionDateOf(order);
    if (filters.year !== ALL && date && date.getFullYear().toString() !== filters.year) {
      return false;
    }
    if (filters.month !== ALL && date && date.getMonth().toString() !== filters.month) {
      return false;
    }
    if (filters.employeeId !== ALL) {
      const employeeId = Number(filters.employeeId);
      if (order.installedById !== employeeId && order.assigneeId !== employeeId && order.measurerId !== employeeId) {
        return false;
      }
    }
    return filters.statusId === ALL || order.statusId === Number(filters.statusId);
  });
};

const timeOf = (value?: string | null) => (value ? new Date(value).getTime() : 0);

const COMPARATORS: Record<SortField, (a: Order, b: Order) => number> = {
  installedAt: (a, b) => timeOf(a.installedAt || a.createdAt) - timeOf(b.installedAt || b.createdAt),
  createdAt: (a, b) => timeOf(a.createdAt) - timeOf(b.createdAt),
  orderNumber: (a, b) => (a.orderNumber || `#${a.id}`).localeCompare(b.orderNumber || `#${b.id}`),
  totalPrice: (a, b) => (a.totalPrice || 0) - (b.totalPrice || 0),
  clientName: (a, b) => (a.clientName || '').localeCompare(b.clientName || '')
};

export const sortArchiveOrders = (orders: Order[], field: SortField, direction: SortDirection): Order[] => {
  const compare = COMPARATORS[field];
  return [...orders].sort((a, b) => (direction === 'asc' ? compare(a, b) : -compare(a, b)));
};

/** Клиент заказа для отображения: данные из заказа, иначе из справочника клиентов. */
export const clientViewOf = (order: Order, clients: Client[]) => {
  const client = clients.find(c => c.id === order.clientId);
  return {
    isLegal: (order.clientType || client?.clientType) === 'LEGAL_ENTITY',
    avatarUrl: order.clientAvatarUrl || client?.avatarUrl,
    name: order.clientName || client?.name || `Клиент #${order.clientId}`,
    phone: order.clientPhone || client?.phone
  };
};

export const installerNameOf = (order: Order) => order.installedByName || order.assigneeName || '—';

/** CSV архива для Excel: BOM, разделитель «;», строки через CRLF. */
export const buildArchiveCsv = (orders: Order[], statuses: OrderStatus[], timezone?: string): string => {
  const headers = ['№', 'Номер заявки', 'Дата завершения', 'Клиент', 'Телефон', 'Адрес', 'Сумма (₽)', 'Предоплата (₽)', 'Остаток (₽)', 'Исполнитель', 'Статус'];
  const rows = orders.map(o => [
    o.id,
    o.orderNumber || '',
    o.installedAt ? formatDateTimeInTimezone(o.installedAt, timezone) : '',
    o.clientName || '',
    o.clientPhone || '',
    `"${(o.address || '').replace(/"/g, '""')}"`,
    o.totalPrice || 0,
    o.prepayment || 0,
    o.remainder || 0,
    o.installedByName || o.assigneeName || '',
    statuses.find(s => s.id === o.statusId)?.name || ''
  ]);
  return '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\r\n');
};
