import { togglePrepaymentPaid, toggleRemainderPaid, type Order } from '../../../api/kanban';
import { toast } from '../../../utils/toast';

/** Отметка получения аванса и остатка по заказу с обновлением кеша заказов. */
export const usePaymentToggles = (updateCachedOrder: (orderId: number, patch: Partial<Order>) => void) => {
  const togglePrepayment = async (orderId: number, currentStatus: boolean) => {
    try {
      const newStatus = !currentStatus;
      const updated = await togglePrepaymentPaid(orderId, newStatus, newStatus ? new Date().toISOString() : undefined);
      updateCachedOrder(orderId, {
        prepaymentPaid: updated.prepaymentPaid,
        prepaymentPaidAt: updated.prepaymentPaidAt
      });
      toast.success(newStatus ? 'Аванс отмечен как оплаченный' : 'Оплата аванса отменена');
    } catch (err) {
      console.error('Failed to toggle prepayment status', err);
      toast.error('Не удалось изменить статус оплаты аванса');
    }
  };

  const toggleRemainder = async (orderId: number, currentStatus: boolean) => {
    try {
      const newStatus = !currentStatus;
      const updated = await toggleRemainderPaid(orderId, newStatus, newStatus ? new Date().toISOString() : undefined);
      updateCachedOrder(orderId, {
        remainderPaid: updated.remainderPaid,
        remainderPaidAt: updated.remainderPaidAt
      });
      toast.success(newStatus ? 'Остаток отмечен как оплаченный' : 'Оплата остатка отменена');
    } catch (err) {
      console.error('Failed to toggle remainder status', err);
      toast.error('Не удалось изменить статус оплаты остатка');
    }
  };

  return { togglePrepayment, toggleRemainder };
};
