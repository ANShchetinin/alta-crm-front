import { describe, it, expect, beforeEach } from 'vitest';
import type { Order, OrderStatus } from '../../../api/kanban';
import type { Client } from '../../../api/clients';
import type { Employee } from '../../../api/employees';
import type { OrderReminderDto } from '../../../api/reminders';
import {
  columnCardsOf,
  filterBoardCards,
  groupRemindersByOrder,
  moveColumn,
  reminderStateOf,
  reorderCardInColumn,
  saveCardsOrder,
  sortCardsByStoredOrder
} from './board';

const card = (id: number, fields: Partial<Order> = {}) => ({ id, statusId: 1, clientId: 1, ...fields } as Order);
const status = (id: number, sortOrder: number) => ({ id, name: `Этап ${id}`, sortOrder } as OrderStatus);
const reminder = (orderId: number, remindAt: string, fields: Partial<OrderReminderDto> = {}) =>
  ({ id: orderId * 10, orderId, remindAt, status: 'PENDING', ...fields } as OrderReminderDto);
const ids = (list: Order[]) => list.map(c => c.id);

describe('board', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('keeps the order set by dragging and puts new cards last, newest first', () => {
    saveCardsOrder([card(3), card(1)]);

    expect(ids(sortCardsByStoredOrder([card(1), card(2), card(3), card(4)]))).toEqual([3, 1, 4, 2]);
  });

  it('moves a card before or after another one within its column', () => {
    const cards = [card(1), card(2), card(3), card(9, { statusId: 2 })];

    expect(ids(reorderCardInColumn(cards, cards[2], 1, 1, 'before'))).toEqual([9, 3, 1, 2]);
    expect(ids(reorderCardInColumn(cards, cards[0], 1, 3, 'after'))).toEqual([9, 2, 3, 1]);
    expect(ids(reorderCardInColumn(cards, cards[0], 1, null, null))).toEqual([9, 2, 3, 1]);
  });

  it('moves a column and renumbers the stages', () => {
    const columns = [status(1, 1), status(2, 2), status(3, 3)];

    expect(moveColumn(columns, 3, 1)?.map(c => [c.id, c.sortOrder])).toEqual([[3, 1], [1, 2], [2, 3]]);
    expect(moveColumn(columns, 2, 2)).toBeNull();
  });

  it('groups pending reminders and detects overdue and today ones', () => {
    const now = new Date(2026, 8, 15, 12, 0);
    const byOrder = groupRemindersByOrder([
      reminder(1, '2026-09-15T10:00:00'),
      reminder(1, '2026-09-20T10:00:00'),
      reminder(2, '2026-09-15T18:00:00'),
      reminder(3, '2026-09-10T10:00:00', { status: 'COMPLETED' })
    ]);

    expect(reminderStateOf(byOrder[1], now)).toMatchObject({ isOverdue: true, isToday: true });
    expect(reminderStateOf(byOrder[2], now)).toMatchObject({ isOverdue: false, isToday: true });
    expect(reminderStateOf(byOrder[3], now).pending).toEqual([]);
  });

  it('filters by search over number, client, phone, address, description and assignee, without archived cards', () => {
    const clients = [{ id: 5, name: 'ООО Альфа', phone: '+74950000000' } as Client];
    const employees = [{ id: 7, name: 'Олег Монтажник' } as Employee];
    const cards = [
      card(1, { orderNumber: 'А-1', clientName: 'Иван', address: 'ул. Ленина' }),
      card(2, { clientId: 5, description: 'Двухуровневый', assigneeId: 7 }),
      card(3, { clientName: 'Архивный', isArchived: true })
    ];
    const search = (q: string) => ids(filterBoardCards(cards, 'all', {}, q, clients, employees));

    expect(search('')).toEqual([1, 2]);
    expect(search('а-1')).toEqual([1]);
    expect(search('альфа')).toEqual([2]);
    expect(search('4950000')).toEqual([2]);
    expect(search('ленина')).toEqual([1]);
    expect(search('олег')).toEqual([2]);
    expect(search('№2')).toEqual([2]);
  });

  it('sorts a completed column by completion time and hides archived cards there', () => {
    const cards = [
      card(1, { statusId: 5, installedAt: '2026-09-01T10:00:00' }),
      card(2, { statusId: 5, installedAt: '2026-09-10T10:00:00' }),
      card(3, { statusId: 5, isArchived: true })
    ];

    expect(ids(columnCardsOf(cards, status(5, 5), true))).toEqual([2, 1]);
    expect(ids(columnCardsOf(cards, status(5, 5), false))).toEqual([1, 2, 3]);
  });
});
