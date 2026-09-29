import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getRecentNotifications, markAllNotificationsAsRead, markNotificationAsRead, type AppNotificationItem
} from '../../../api/notifications';
import { useTenantQueryKey } from '../../../hooks/queries/useTenantQueryKey';

const NOTIFICATIONS_QUERY_KEY = ['recentNotifications'] as const;
const NOTIFICATIONS_POLL_MS = 25000;
const EMPTY_NOTIFICATIONS: AppNotificationItem[] = [];

/** Уведомления за последние сутки с периодическим опросом и отметкой прочтения (одного или всех). */
export const useRecentNotifications = (enabled: boolean) => {
  const queryClient = useQueryClient();
  const notificationsKey = useTenantQueryKey(NOTIFICATIONS_QUERY_KEY);
  const { data: notifications = EMPTY_NOTIFICATIONS } = useQuery({
    queryKey: notificationsKey,
    queryFn: () => getRecentNotifications(),
    enabled,
    // В фоновой вкладке опрос приостанавливается, при возврате — сразу обновляется
    refetchInterval: NOTIFICATIONS_POLL_MS,
    refetchOnWindowFocus: true,
    staleTime: 0
  });
  const unreadCount = useMemo(() => notifications.filter(n => !n.isRead).length, [notifications]);

  const updateCached = useCallback((updater: (prev: AppNotificationItem[]) => AppNotificationItem[]) => {
    queryClient.setQueryData<AppNotificationItem[]>(notificationsKey, prev => updater(prev ?? EMPTY_NOTIFICATIONS));
  }, [queryClient, notificationsKey]);

  const markRead = useCallback(async (notification: AppNotificationItem) => {
    if (notification.isRead) {
      return;
    }
    try {
      await markNotificationAsRead(notification.id);
      updateCached(prev => prev.map(n => (n.id === notification.id ? { ...n, isRead: true } : n)));
    } catch (e) {
      console.error('Failed to mark read', e);
    }
  }, [updateCached]);

  const markAllRead = useCallback(async () => {
    try {
      await markAllNotificationsAsRead();
      updateCached(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (e) {
      console.error('Failed to mark all read', e);
    }
  }, [updateCached]);

  return { notifications, unreadCount, markRead, markAllRead };
};
