import { useEffect, useRef } from 'react';
import { getOrderById, type Order } from '../../../api/kanban';

interface OrderLoaderHandlers {
  /** Заказ загружен и всё ещё актуален (шторка открыта на нём же). */
  onLoaded: (order: Order) => void;
  /** Шторка открыта для создания нового заказа. */
  onNew: () => void;
  /** Загрузка актуального заказа не удалась. */
  onError?: (err: unknown) => void;
}

/**
 * Загружает заказ при открытии шторки и смене orderId.
 * Ответ по заказу, с которого пользователь уже переключился, игнорируется —
 * иначе данные заказа A попадут в форму заказа B и перезапишут его при сохранении.
 */
export const useOrderLoader = (isOpen: boolean, orderId: number | null, handlers: OrderLoaderHandlers) => {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    if (!orderId) {
      handlersRef.current.onNew();
      return;
    }

    let cancelled = false;
    getOrderById(orderId)
      .then(order => {
        if (!cancelled) {
          handlersRef.current.onLoaded(order);
        }
      })
      .catch(err => {
        if (!cancelled) {
          console.error('Failed to load order details', err);
          handlersRef.current.onError?.(err);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, orderId]);
};
