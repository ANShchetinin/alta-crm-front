import { useQuery, queryOptions } from '@tanstack/react-query';
import { getOrders, getArchivedOrders, type Order } from '../../api/kanban';
import { useAuthStore } from '../../store/useAuthStore';

export const ORDERS_QUERY_KEY = ['orders'] as const;

/** all — все заказы (финансы, отчеты), active — доска, archived — архив. */
export type OrdersScope = 'all' | 'active' | 'archived';

const fetchOrders: Record<OrdersScope, () => Promise<Order[]>> = {
  all: () => getOrders(),
  active: () => getOrders(false),
  archived: () => getArchivedOrders()
};

/**
 * Параметры запроса списка заказов — общие для хука и императивного {@code queryClient.fetchQuery}.
 * Все списки лежат под {@link ORDERS_QUERY_KEY}: одна инвалидация обновляет доску, архив, финансы и отчеты.
 */
export const ordersQueryOptions = (tenantId: number | null, scope: OrdersScope) => queryOptions<Order[]>({
  queryKey: [...ORDERS_QUERY_KEY, tenantId, scope],
  queryFn: fetchOrders[scope],
  // Заказы меняют и другие сотрудники: при открытии экрана показываем кеш и сразу сверяемся с сервером
  staleTime: 0
});

export const useOrdersQuery = (scope: OrdersScope = 'all', enabled = true) => {
  const tenantId = useAuthStore(state => state.tenantId);
  return useQuery({ ...ordersQueryOptions(tenantId, scope), enabled });
};
