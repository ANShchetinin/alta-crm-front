import type { Order, OrderStatus } from '../../../api/kanban';
import type { Client } from '../../../api/clients';
import type { Employee } from '../../../api/employees';
import type { OrderReminderDto } from '../../../api/reminders';
import { parseLocalDateTime } from '../../../utils/dateUtils';
import { phoneMatches } from '../../../utils/phone';

export type ReminderFilter = 'all' | 'today' | 'overdue';
export type CardDropPosition = 'before' | 'after';

const CARDS_ORDER_STORAGE_KEY = 'kanban_cards_custom_order';

/** Порядок карточек, заданный перетаскиванием внутри колонки (хранится в браузере); остальные — новые сверху. */
export const sortCardsByStoredOrder = (cards: Order[]): Order[] => {
  try {
    const saved = localStorage.getItem(CARDS_ORDER_STORAGE_KEY);
    if (!saved) {
      return cards;
    }
    const orderMap: Record<number, number> = JSON.parse(saved);
    return [...cards].sort((a, b) => {
      const orderA = orderMap[a.id] !== undefined ? orderMap[a.id] : 999999;
      const orderB = orderMap[b.id] !== undefined ? orderMap[b.id] : 999999;
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      return b.id - a.id;
    });
  } catch {
    return cards;
  }
};

export const saveCardsOrder = (cards: Order[]) => {
  const orderMap: Record<number, number> = {};
  cards.forEach((card, index) => {
    orderMap[card.id] = index;
  });
  localStorage.setItem(CARDS_ORDER_STORAGE_KEY, JSON.stringify(orderMap));
};

/**
 * Переставляет карточку внутри колонки: перед или после целевой карточки, без цели — в конец колонки.
 */
export const reorderCardInColumn = (
  cards: Order[],
  card: Order,
  statusId: number,
  targetCardId: number | null | undefined,
  position: CardDropPosition | null | undefined
): Order[] => {
  const columnCards = cards.filter(c => c.statusId === statusId && c.id !== card.id);
  let index = columnCards.length;
  if (targetCardId && targetCardId !== card.id) {
    const found = columnCards.findIndex(c => c.id === targetCardId);
    if (found !== -1) {
      index = position === 'after' ? found + 1 : found;
    }
  }
  columnCards.splice(index, 0, card);
  const otherCards = cards.filter(c => c.statusId !== statusId && c.id !== card.id);
  return [...otherCards, ...columnCards];
};

/** Переносит колонку на место другой и перенумеровывает порядок этапов с 1. */
export const moveColumn = (columns: OrderStatus[], sourceId: number, targetId: number): OrderStatus[] | null => {
  const sourceIndex = columns.findIndex(c => c.id === sourceId);
  const targetIndex = columns.findIndex(c => c.id === targetId);
  if (sourceId === targetId || sourceIndex < 0 || targetIndex < 0) {
    return null;
  }
  const next = [...columns];
  const [removed] = next.splice(sourceIndex, 1);
  next.splice(targetIndex, 0, removed);
  return next.map((c, index) => ({ ...c, sortOrder: index + 1 }));
};

export const groupRemindersByOrder = (reminders: OrderReminderDto[]): Record<number, OrderReminderDto[]> => {
  const byOrder: Record<number, OrderReminderDto[]> = {};
  reminders.forEach(reminder => {
    if (reminder.orderId) {
      (byOrder[reminder.orderId] ??= []).push(reminder);
    }
  });
  return byOrder;
};

/** Ожидающие напоминания заказа: есть ли просроченные и на сегодня, ближайшее. */
export const reminderStateOf = (reminders: OrderReminderDto[] | undefined, now: Date = new Date()) => {
  const pending = (reminders ?? []).filter(r => r.status === 'PENDING');
  return {
    pending,
    isOverdue: pending.some(r => r.isOverdue || (parseLocalDateTime(r.remindAt)?.getTime() || 0) < now.getTime()),
    isToday: pending.some(r => parseLocalDateTime(r.remindAt)?.toDateString() === now.toDateString()),
    nearest: pending[0] as OrderReminderDto | undefined
  };
};

const matchesSearch = (card: Order, query: string, clients: Client[], employees: Employee[]): boolean => {
  const client = clients.find(cl => cl.id === card.clientId);
  const employee = employees.find(e => e.id === card.assigneeId);
  return (card.orderNumber?.toLowerCase().includes(query) ?? false)
    || ((card.clientName || client?.name)?.toLowerCase().includes(query) ?? false)
    || phoneMatches(card.clientPhone || client?.phone, query)
    || (card.address?.toLowerCase().includes(query) ?? false)
    || (card.description?.toLowerCase().includes(query) ?? false)
    || (employee?.name?.toLowerCase().includes(query) ?? false)
    || card.id.toString() === query
    || `№${card.id}` === query;
};

/** Карточки доски без архивных — по фильтру напоминаний и поиску (номер, клиент, телефон, адрес, описание, ответственный). */
export const filterBoardCards = (
  cards: Order[],
  reminderFilter: ReminderFilter,
  remindersByOrder: Record<number, OrderReminderDto[]>,
  searchQuery: string,
  clients: Client[],
  employees: Employee[]
): Order[] => {
  let result = cards.filter(c => !c.isArchived);
  if (reminderFilter !== 'all') {
    result = result.filter(card => {
      const state = reminderStateOf(remindersByOrder[card.id]);
      return reminderFilter === 'overdue' ? state.isOverdue : state.isToday;
    });
  }
  const q = searchQuery.toLowerCase().trim();
  return q ? result.filter(card => matchesSearch(card, q, clients, employees)) : result;
};

const completionTime = (order: Order) => {
  const value = order.installedAt || order.createdAt;
  return value ? new Date(value).getTime() : 0;
};

/** Карточки колонки; в завершающей колонке — без архивных, последние завершенные сверху. */
export const columnCardsOf = (cards: Order[], column: OrderStatus, isCompleted: boolean): Order[] => {
  const columnCards = cards.filter(c => c.statusId === column.id && (!isCompleted || !c.isArchived));
  return isCompleted ? [...columnCards].sort((a, b) => completionTime(b) - completionTime(a)) : columnCards;
};
