import { useState } from 'react';
import type { Client } from '../../../api/clients';
import { getOrdersByClient, moveOrder, type Order } from '../../../api/kanban';

/** История заявок клиента в боковой панели и смена статуса заявки из нее. */
export const useClientHistory = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [client, setClient] = useState<Client | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);

  const open = async (target: Client) => {
    setClient(target);
    setOrders([]);
    setIsOpen(true);
    setLoading(true);
    try {
      setOrders(await getOrdersByClient(target.id));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const close = () => setIsOpen(false);

  const changeStatus = async (orderId: number, statusId: number) => {
    try {
      await moveOrder(orderId, statusId);
      setOrders(prev => prev.map(o => (o.id === orderId ? { ...o, statusId } : o)));
    } catch (err) {
      console.error(err);
    }
  };

  return { isOpen: isOpen && !!client, client, orders, loading, open, close, changeStatus };
};

export type ClientHistory = ReturnType<typeof useClientHistory>;
