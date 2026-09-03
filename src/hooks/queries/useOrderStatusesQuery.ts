import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getOrderStatuses, createOrderStatus, updateOrderStatus, deleteOrderStatus, reorderOrderStatuses, type OrderStatus } from '../../api/kanban';

export const ORDER_STATUSES_QUERY_KEY = ['orderStatuses'] as const;

export const useOrderStatusesQuery = (enabled = true) => {
  return useQuery<OrderStatus[]>({
    queryKey: ORDER_STATUSES_QUERY_KEY,
    queryFn: () => getOrderStatuses(),
    enabled
  });
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
