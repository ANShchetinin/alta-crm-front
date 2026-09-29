import { useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getOrdersCountByStatus } from '../../../api/kanban';
import { orderStatusesQueryOptions } from '../../../hooks/queries/useOrderStatusesQuery';
import { useAppStore } from '../../../store/useAppStore';
import { useAuthStore } from '../../../store/useAuthStore';

const SITE_REQUESTS_POLL_MS = 25000;

/**
 * Счетчики меню: новые заказы (в первом этапе), новые заявки с сайта и заканчивающиеся материалы.
 * Заявки с сайта опрашиваются периодически; `refresh` обновляет все счетчики (например, после смены компании).
 */
export const useNavCounters = (role: string | null, hasSiteRequests: boolean) => {
  const queryClient = useQueryClient();
  const setNewOrdersCount = useAppStore(state => state.setNewOrdersCount);
  const fetchLowStockMaterials = useAppStore(state => state.fetchLowStockMaterials);
  const fetchNewSiteRequestsCount = useAppStore(state => state.fetchNewSiteRequestsCount);

  const pollsSiteRequests = role !== 'WORKER' && hasSiteRequests;

  const refresh = useCallback(async () => {
    try {
      // Компанию берем из стора в момент вызова: после переключения замыкание еще хранит прежнюю
      const currentTenantId = useAuthStore.getState().tenantId;
      const statuses = await queryClient.fetchQuery(orderStatusesQueryOptions(currentTenantId));
      const firstStatus = statuses.find(s => s.sortOrder === 1 || s.sortOrder === 0);
      if (firstStatus) {
        setNewOrdersCount(await getOrdersCountByStatus(firstStatus.id));
      }
    } catch (err) {
      console.error('Failed to fetch new orders count', err);
    }
    if (role !== 'WORKER') {
      fetchLowStockMaterials();
    }
    if (pollsSiteRequests) {
      fetchNewSiteRequestsCount();
    }
  }, [role, pollsSiteRequests, setNewOrdersCount, fetchLowStockMaterials, fetchNewSiteRequestsCount, queryClient]);

  useEffect(() => {
    if (role === 'SUPERADMIN') {
      return;
    }
    refresh();
    if (!pollsSiteRequests) {
      return;
    }
    const interval = setInterval(fetchNewSiteRequestsCount, SITE_REQUESTS_POLL_MS);
    return () => clearInterval(interval);
  }, [role, pollsSiteRequests, refresh, fetchNewSiteRequestsCount]);

  return { refresh };
};
