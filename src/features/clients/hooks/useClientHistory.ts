import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Client } from '../../../api/clients';
import { getOrdersByClient, moveOrder, type Order } from '../../../api/kanban';
import { useTenantQueryKey } from '../../../hooks/queries/useTenantQueryKey';
import { ORDERS_CHANGED_EVENT, useInvalidateOnOrdersChanged } from '../../../hooks/queries/useInvalidateOnOrdersChanged';
import { toast } from '../../../utils/toast';
import { getErrorMessage } from '../../../utils/errorMessage';

const CLIENT_ORDERS_QUERY_KEY = ['clientOrders'] as const;
const EMPTY_ORDERS: Order[] = [];

/**
 * История заявок клиента в боковой панели и смена статуса заявки из нее. Заявки загружаются запросом
 * с ключом по клиенту: при быстром переключении между клиентами ответ по прежнему не попадет к новому.
 */
export const useClientHistory = () => {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [client, setClient] = useState<Client | null>(null);
  const baseKey = useTenantQueryKey(CLIENT_ORDERS_QUERY_KEY);
  const queryKey = [...baseKey, client?.id] as const;
  useInvalidateOnOrdersChanged(CLIENT_ORDERS_QUERY_KEY);

  const { data: orders = EMPTY_ORDERS, isLoading, isError } = useQuery({
    queryKey,
    queryFn: () => (client ? getOrdersByClient(client.id) : Promise.resolve(EMPTY_ORDERS)),
    enabled: isOpen && client != null,
    // Заявки меняют и другие сотрудники: при открытии истории всегда сверяемся с сервером
    staleTime: 0
  });

  const open = (target: Client) => {
    setClient(target);
    setIsOpen(true);
  };

  const close = () => setIsOpen(false);

  const changeStatus = async (orderId: number, statusId: number) => {
    try {
      await moveOrder(orderId, statusId);
      queryClient.setQueryData<Order[]>(queryKey, prev => prev?.map(o => (o.id === orderId ? { ...o, statusId } : o)));
      window.dispatchEvent(new CustomEvent(ORDERS_CHANGED_EVENT, { detail: { action: 'status', orderId } }));
    } catch (err) {
      console.error(err);
      toast.error(getErrorMessage(err, 'Не удалось изменить статус заявки'));
    }
  };

  return { isOpen: isOpen && !!client, client, orders, loading: isLoading, loadFailed: isError, open, close, changeStatus };
};

export type ClientHistory = ReturnType<typeof useClientHistory>;
