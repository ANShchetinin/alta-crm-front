import type { AppNotificationItem } from '../../api/notifications';

export type NotificationTarget =
  | { kind: 'page'; url: string }
  | { kind: 'order'; orderId: number };

/**
 * Куда ведет уведомление: на свою страницу, а если ссылка — просто доска заказов, то в карточку заказа.
 * Без ссылки и заказа — на доску.
 */
export const getNotificationTarget = (notification: AppNotificationItem): NotificationTarget => {
  if (notification.url && notification.url !== '/kanban') {
    return { kind: 'page', url: notification.url };
  }
  if (notification.orderId) {
    return { kind: 'order', orderId: notification.orderId };
  }
  return { kind: 'page', url: notification.url || '/kanban' };
};
