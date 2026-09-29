import { describe, expect, it } from 'vitest';
import type { AppNotificationItem } from '../../api/notifications';
import { getNotificationTarget } from './notificationTarget';

const notification = (overrides: Partial<AppNotificationItem>): AppNotificationItem => ({
  id: 1,
  title: 'Новый заказ',
  body: '',
  isRead: false,
  createdAt: '2026-09-29T10:00:00Z',
  ...overrides
});

describe('getNotificationTarget', () => {
  it('opens the linked page when it is not the board', () => {
    expect(getNotificationTarget(notification({ url: '/finances', orderId: 5 }))).toEqual({ kind: 'page', url: '/finances' });
  });

  it('opens the order card when the link is just the board', () => {
    expect(getNotificationTarget(notification({ url: '/kanban', orderId: 5 }))).toEqual({ kind: 'order', orderId: 5 });
  });

  it('opens the order card when there is no link', () => {
    expect(getNotificationTarget(notification({ orderId: 7 }))).toEqual({ kind: 'order', orderId: 7 });
  });

  it('goes to the board when there is neither a link nor an order', () => {
    expect(getNotificationTarget(notification({}))).toEqual({ kind: 'page', url: '/kanban' });
    expect(getNotificationTarget(notification({ url: '/kanban' }))).toEqual({ kind: 'page', url: '/kanban' });
  });
});
