import { useCallback, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { deleteOrder, downloadContractDocx, downloadContractPdf, moveOrder, type Order } from '../../../api/kanban';
import { getMeasurementByOrderId } from '../../../api/measurements';
import { ORDERS_QUERY_KEY } from '../../../hooks/queries/useOrdersQuery';
import { useTenantQueryKey } from '../../../hooks/queries/useTenantQueryKey';
import { downloadBlob } from '../../../utils/download';
import { toast } from '../../../utils/toast';
import { confirm } from '../../../utils/confirm';
import { getErrorMessage } from '../../../utils/errorMessage';

const ORDER_MEASUREMENT_QUERY_KEY = ['orderMeasurement'] as const;

/** Карточка архивного заказа (со сметой замера) и действия с заказом: возврат в работу, удаление, договор. */
export const useArchiveOrderDetail = () => {
  const queryClient = useQueryClient();
  const [order, setOrder] = useState<Order | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Смета запрашивается по id заказа: ответ по ранее открытому заказу не попадет в карточку другого
  const measurementBaseKey = useTenantQueryKey(ORDER_MEASUREMENT_QUERY_KEY);
  const { data: measurement = null, isLoading: loadingMeasurement } = useQuery({
    queryKey: [...measurementBaseKey, order?.id],
    queryFn: () => (order ? getMeasurementByOrderId(order.id) : Promise.resolve(null)),
    enabled: order != null,
    // Замера у заказа может не быть — тогда показываем спецификацию договора
    retry: false
  });

  // Возврат и удаление меняют и доску, и финансы — обновляем все списки заказов
  const refreshOrders = () => queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEY });

  const open = (target: Order) => setOrder(target);

  const close = useCallback(() => setOrder(null), []);

  /** Возвращает заявку в работу только сменой статуса (без перезаписи остальных полей заказа). */
  const returnToKanban = async (targetStatusId: number) => {
    if (!order) {
      return;
    }
    const ok = await confirm({
      title: 'Возврат заявки',
      message: 'Вернуть эту заявку из архива в работу на Канбан?',
      confirmText: 'Вернуть',
      cancelText: 'Отмена'
    });
    if (!ok) {
      return;
    }
    try {
      setActionLoading(true);
      await moveOrder(order.id, targetStatusId);
      toast.success('Заказ успешно возвращен на Канбан-доску');
      close();
      refreshOrders();
    } catch (err) {
      toast.error('Ошибка при возврате заказа: ' + getErrorMessage(err, 'неизвестная ошибка'));
    } finally {
      setActionLoading(false);
    }
  };

  const remove = async (orderId: number, orderNumber?: string | null) => {
    const ok = await confirm({
      title: 'Удаление заказа',
      message: `Вы уверены, что хотите безвозвратно удалить заказ ${orderNumber || `№${orderId}`}?`,
      confirmText: 'Удалить',
      cancelText: 'Отмена',
      danger: true
    });
    if (!ok) {
      return;
    }
    try {
      setActionLoading(true);
      await deleteOrder(orderId);
      toast.success('Заказ удален');
      if (order?.id === orderId) {
        close();
      }
      refreshOrders();
    } catch (err) {
      toast.error('Ошибка при удалении заказа: ' + getErrorMessage(err, 'неизвестная ошибка'));
    } finally {
      setActionLoading(false);
    }
  };

  const downloadDocx = async (orderId: number) => {
    try {
      downloadBlob(await downloadContractDocx(orderId), `Договор_${orderId}.docx`);
    } catch {
      toast.error('Ошибка при скачивании договора DOCX');
    }
  };

  const downloadPdf = async (orderId: number) => {
    try {
      downloadBlob(await downloadContractPdf(orderId), `Договор_${orderId}.pdf`);
    } catch {
      toast.error('Ошибка при скачивании договора PDF');
    }
  };

  return {
    order,
    isOpen: order != null,
    measurement,
    loadingMeasurement,
    actionLoading,
    open,
    close,
    returnToKanban,
    remove,
    downloadDocx,
    downloadPdf
  };
};

export type ArchiveOrderDetail = ReturnType<typeof useArchiveOrderDetail>;
