import { api } from './axiosConfig';

export interface OrderStatus {
  id: number;
  name: string;
  color: string;
  sortOrder: number;
}

export interface OrderMaterial {
  id?: number;
  materialId: number;
  materialName?: string;
  quantity: number;
  fixedCostPrice?: number;
  fixedSalePrice?: number;
}

export interface OrderAttachment {
  id: number;
  fileName: string;
  contentType: string;
}

export interface Order {
  id: number;
  clientId: number;
  statusId: number;
  address: string;
  description: string;
  totalPrice: number;
  installationPrice?: number;
  materials?: OrderMaterial[];
  attachments?: OrderAttachment[];
  materialsCost?: number;
  profit?: number;
  profitMargin?: number;
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

export const updateOrder = async (orderId: number, order: Partial<Order>): Promise<Order> => {
  const response = await api.put(`/orders/${orderId}`, order);
  return response.data;
};

export const moveOrder = async (orderId: number, statusId: number): Promise<Order> => {
  const response = await api.patch(`/orders/${orderId}/move?statusId=${statusId}`);
  return response.data;
};

export const uploadAttachment = async (orderId: number, file: File): Promise<OrderAttachment> => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post(`/orders/${orderId}/attachments`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const getAttachmentUrl = (attachmentId: number): string => {
  return `${api.defaults.baseURL}/orders/attachments/${attachmentId}`;
};
