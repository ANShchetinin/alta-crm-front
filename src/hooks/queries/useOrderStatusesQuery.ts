import { useQuery, useMutation, useQueryClient, queryOptions } from '@tanstack/react-query';
import { getOrderStatuses, createOrderStatus, updateOrderStatus, deleteOrderStatus, reorderOrderStatuses, type OrderStatus } from '../../api/kanban';
import { useAuthStore } from '../../store/useAuthStore';

export const ORDER_STATUSES_QUERY_KEY = ['orderStatuses'] as const;

/** Параметры запроса статусов компании — общие для хука и императивного {@code queryClient.fetchQuery}. */
export const orderStatusesQueryOptions = (tenantId: number | null) => queryOptions<OrderStatus[]>({
  queryKey: [...ORDER_STATUSES_QUERY_KEY, tenantId],
  queryFn: () => getOrderStatuses()
});

export const useOrderStatusesQuery = (enabled = true) => {
  const tenantId = useAuthStore(state => state.tenantId);
  return useQuery({ ...orderStatusesQueryOptions(tenantId), enabled });
};

export const useCreateOrderStatusMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<OrderStatus>) => createOrderStatus(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORDER_STATUSES_QUERY_KEY });
    }
  });
};

export const useUpdateOrderStatusMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<OrderStatus> }) => updateOrderStatus(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORDER_STATUSES_QUERY_KEY });
    }
  });
};

export const useDeleteOrderStatusMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteOrderStatus(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORDER_STATUSES_QUERY_KEY });
    }
  });
};

export const useReorderOrderStatusesMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (statusIds: number[]) => reorderOrderStatuses(statusIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORDER_STATUSES_QUERY_KEY });
    }
  });
};
