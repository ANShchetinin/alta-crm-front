import { api } from './axiosConfig';

export interface OrderStatus {
  id: number;
  name: string;
  color: string;
  sortOrder: number;
}

export interface Order {
  id: number;
  clientId: number;
  statusId: number;
  address: string;
  description: string;
  totalPrice: number;
}

export const getOrderStatuses = async (): Promise<OrderStatus[]> => {
  const response = await api.get('/order-statuses');
  return response.data;
};

export const getOrders = async (): Promise<Order[]> => {
  const response = await api.get('/orders');
  return response.data;
};

export const createOrder = async (order: Partial<Order>): Promise<Order> => {
  const response = await api.post('/orders', order);
  return response.data;
};

export const moveOrder = async (orderId: number, statusId: number): Promise<Order> => {
  const response = await api.patch(`/orders/${orderId}/move?statusId=${statusId}`);
  return response.data;
};
