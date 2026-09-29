import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useOrderDrawerStore } from '../../../store/useOrderDrawerStore';

export const OPEN_ORDER_EVENT = 'alta:open-order';
export const OPEN_CREATE_ORDER_EVENT = 'alta:open-create-order';

/**
 * Открывает глобальную шторку заказа по ссылке (`?orderId=` или `?create=true`, например из push-уведомления)
 * и по событиям окна; параметры после открытия убираются из адреса.
 */
export const useOrderDrawerTriggers = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const orderIdParam = searchParams.get('orderId');
    if (orderIdParam) {
      const targetId = parseInt(orderIdParam);
      if (!isNaN(targetId)) {
        useOrderDrawerStore.getState().openOrder(targetId);
        searchParams.delete('orderId');
        setSearchParams(searchParams, { replace: true });
      }
    }
    if (searchParams.get('create') === 'true') {
      useOrderDrawerStore.getState().openCreateOrder();
      searchParams.delete('create');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const handleCreateEvent = () => {
      useOrderDrawerStore.getState().openCreateOrder();
    };
    const handleOpenOrderEvent = (e: Event) => {
      const orderId = (e as CustomEvent<{ orderId?: number }>).detail?.orderId;
      if (orderId) {
        useOrderDrawerStore.getState().openOrder(orderId);
      }
    };
    window.addEventListener(OPEN_CREATE_ORDER_EVENT, handleCreateEvent);
    window.addEventListener(OPEN_ORDER_EVENT, handleOpenOrderEvent);
    return () => {
      window.removeEventListener(OPEN_CREATE_ORDER_EVENT, handleCreateEvent);
      window.removeEventListener(OPEN_ORDER_EVENT, handleOpenOrderEvent);
    };
  }, []);
};
