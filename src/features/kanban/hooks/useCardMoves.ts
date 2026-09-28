import { useState, type Dispatch, type MouseEvent, type SetStateAction } from 'react';
import { completeOrder, moveOrder, type Order, type OrderStatus } from '../../../api/kanban';
import type { StatusChangePromptData } from '../components/StatusChangeModal';
import type { OrderModalTab } from '../../../store/useOrderDrawerStore';
import { isActFile } from '../constants';
import { isCompletedStatus } from '../../../utils/orderStatus';
import { toast } from '../../../utils/toast';
import { getErrorMessage } from '../../../utils/errorMessage';

export interface MoveRestriction {
  isOpen: boolean;
  orderId?: number;
  orderNumber?: string;
  targetStatusName: string;
  reason: string;
}

interface UseCardMovesOptions {
  cards: Order[];
  setCards: Dispatch<SetStateAction<Order[]>>;
  columns: OrderStatus[];
  refresh: () => void;
  setNewOrdersCount: (count: number) => void;
  openOrder: (orderId: number, tab?: OrderModalTab) => void;
}

const hasActAttached = (card?: Order) => (card?.attachments || []).some(a => isActFile(a.fileName, a.isAct));

const notifyOrdersChanged = (action: string, orderId: number) => {
  window.dispatchEvent(new CustomEvent('alta:orders-changed', { detail: { action, orderId } }));
};

/**
 * Перемещение карточек между этапами: проверка акта для завершающего этапа, подтверждение с комментарием,
 * оптимистичное перемещение и завершение монтажа.
 */
export const useCardMoves = ({ cards, setCards, columns, refresh, setNewOrdersCount, openOrder }: UseCardMovesOptions) => {
  const [restriction, setRestriction] = useState<MoveRestriction | null>(null);
  const [statusChange, setStatusChange] = useState<StatusChangePromptData | null>(null);

  const updateNewOrdersCount = (updatedCards: Order[]) => {
    const firstStatus = columns.find(s => s.sortOrder === 1);
    if (firstStatus) {
      setNewOrdersCount(updatedCards.filter(o => o.statusId === firstStatus.id).length);
    }
  };

  /** В завершающий этап заявку можно перенести только с прикрепленным актом. */
  const canMoveTo = (orderId: number, targetStatusId: number): boolean => {
    const targetCol = columns.find(c => c.id === targetStatusId);
    if (!targetCol || !isCompletedStatus(targetCol)) {
      return true;
    }
    const card = cards.find(c => c.id === orderId);
    if (hasActAttached(card)) {
      return true;
    }
    setRestriction({
      isOpen: true,
      orderId,
      orderNumber: card?.orderNumber || `#${orderId}`,
      targetStatusName: targetCol.name,
      reason: `Для перевода заявки в статус «${targetCol.name}» необходимо прикрепить подписанный Акт выполненных работ.`
    });
    return false;
  };

  /** Запрашивает перенос карточки в другой этап: проверки и окно подтверждения с комментарием. */
  const requestMove = (card: Order, targetStatusId: number) => {
    if (card.statusId === targetStatusId || !canMoveTo(card.id, targetStatusId)) {
      return;
    }
    const sourceCol = columns.find(c => c.id === card.statusId);
    const targetCol = columns.find(c => c.id === targetStatusId);
    setStatusChange({
      isOpen: true,
      orderId: card.id,
      orderNumber: card.orderNumber || `#${card.id}`,
      sourceStatusName: sourceCol?.name,
      sourceStatusColor: sourceCol?.color,
      targetStatusId,
      targetStatusName: targetCol?.name || '',
      targetStatusColor: targetCol?.color
    });
  };

  const confirmStatusChange = async (comment?: string) => {
    if (!statusChange) {
      return;
    }
    const { orderId, targetStatusId } = statusChange;
    if (!cards.some(c => c.id === orderId)) {
      return;
    }
    const updatedCards = cards.map(c => (c.id === orderId ? { ...c, statusId: targetStatusId } : c));
    setCards(updatedCards);
    updateNewOrdersCount(updatedCards);

    try {
      await moveOrder(orderId, targetStatusId, comment);
      notifyOrdersChanged('move', orderId);
    } catch (err) {
      console.error('Failed to move order', err);
      toast.error(getErrorMessage(err, 'Ошибка перемещения карточки'));
      refresh();
    }
  };

  const completeInstallation = async (e: MouseEvent, orderId: number) => {
    e.stopPropagation();
    if (!hasActAttached(cards.find(c => c.id === orderId))) {
      toast.warning('Для завершения монтажа необходимо прикрепить «Акт выполненных работ» во вкладке «Файлы».');
      openOrder(orderId, 'FILES');
      return;
    }
    try {
      const updated = await completeOrder(orderId);
      setCards(prev => prev.map(c => (c.id === orderId ? {
        ...c,
        statusId: updated.statusId || c.statusId,
        installedById: updated.installedById || c.installedById,
        installedByName: updated.installedByName || c.installedByName,
        installedAt: updated.installedAt || new Date().toISOString()
      } : c)));
      toast.success('Монтаж успешно завершен');
      refresh();
      notifyOrdersChanged('complete', orderId);
    } catch (err) {
      console.error('Failed to complete installation', err);
      toast.error(getErrorMessage(err, 'Не удалось перевести заявку в завершенный статус'));
    }
  };

  return {
    restriction,
    closeRestriction: () => setRestriction(null),
    statusChange,
    closeStatusChange: () => setStatusChange(null),
    canMoveTo,
    requestMove,
    confirmStatusChange,
    completeInstallation,
    updateNewOrdersCount
  };
};
