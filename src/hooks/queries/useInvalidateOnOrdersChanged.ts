import { useEffect } from 'react';
import { useQueryClient, type QueryKey } from '@tanstack/react-query';

export const ORDERS_CHANGED_EVENT = 'alta:orders-changed';

/**
 * Помечает устаревшими данные, производные от заказов, когда заказ меняется в шторке, на доске или в комментариях.
 * Активные запросы перезапрашиваются сразу, остальные — при следующем открытии.
 */
export const useInvalidateOnOrdersChanged = (queryKey: QueryKey) => {
  const queryClient = useQueryClient();
  const serializedKey = JSON.stringify(queryKey);

  useEffect(() => {
    const key = JSON.parse(serializedKey) as QueryKey;
    const handleOrdersChanged = () => {
      queryClient.invalidateQueries({ queryKey: key });
    };
    window.addEventListener(ORDERS_CHANGED_EVENT, handleOrdersChanged);
    return () => window.removeEventListener(ORDERS_CHANGED_EVENT, handleOrdersChanged);
  }, [queryClient, serializedKey]);
};
