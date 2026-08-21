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

export interface OrderAiSummary {
  id: number;
  orderId: number;
  status: 'PENDING' | 'TRANSCRIBING' | 'ANALYZING' | 'COMPLETED' | 'ERROR';
  rawTranscript?: string;
  aiSummary?: string;
  updatedAt?: string;
}

export interface ContractSpecItem {
  idx?: number;
  name: string;
  quantity: string;
  unit: string;
  price: number;
  total: number;
}

export interface ActChecklistItem {
  id: string;
  name: string;
  checked: boolean;
}

export interface ContractParams {
  area?: string;
  perimeter?: string;
  canvasesCount?: string;
  insertLength?: string;
  pipeCount?: string;
  lightsCount?: string;
  timberLength?: string;
  canvasArticle?: string;
  contractDate?: string;
  handoverDate?: string;
  discount?: string;
  secondPhone?: string;
  specItems?: ContractSpecItem[];
  actChecklist?: ActChecklistItem[];
}

export interface Order {
  id: number;
  clientId: number;
  clientName?: string;
  clientPhone?: string;
  clientType?: string;
  statusId: number;
  assigneeId?: number;
  assigneeName?: string;
  assigneeAvatarUrl?: string;
  installedById?: number;
  installedByName?: string;
  installedByAvatarUrl?: string;
  installedAt?: string;
  orderNumber?: string | null;
  address: string;
  description: string;
  totalPrice: number;
  prepayment?: number;
  remainder?: number;
  installationPrice?: number;
  installationDate?: string;
  measurementDate?: string;
  entrance?: string;
  floor?: string;
  createdAt?: string;
  contractParams?: ContractParams;
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

export const createOrderStatus = async (data: Partial<OrderStatus>): Promise<OrderStatus> => {
  const response = await api.post('/order-statuses', data);
  return response.data;
};

export const updateOrderStatus = async (id: number, data: Partial<OrderStatus>): Promise<OrderStatus> => {
  const response = await api.put(`/order-statuses/${id}`, data);
  return response.data;
};

export const deleteOrderStatus = async (id: number): Promise<void> => {
  await api.delete(`/order-statuses/${id}`);
};

export const reorderOrderStatuses = async (statusIds: number[]): Promise<void> => {
  await api.put('/order-statuses/reorder', statusIds);
};

export const getOrders = async (): Promise<Order[]> => {
  const response = await api.get('/orders');
  return response.data;
};

export const getOrdersByClient = async (clientId: number): Promise<Order[]> => {
  const response = await api.get(`/orders/client/${clientId}`);
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
  const response = await api.post(`/orders/${orderId}/attachments`, formData);
  return response.data;
};

export const getAttachmentUrl = (attachmentId: number): string => {
  return `${api.defaults.baseURL}/orders/attachments/${attachmentId}`;
};

export const fetchAttachmentBlob = async (attachmentId: number, download = false): Promise<Blob> => {
  const response = await api.get(`/orders/attachments/${attachmentId}`, {
    params: { download },
    responseType: 'blob',
  });
  return response.data;
};

export const deleteAttachment = async (attachmentId: number): Promise<void> => {
  await api.delete(`/orders/attachments/${attachmentId}`);
};

export const renameAttachment = async (attachmentId: number, fileName: string): Promise<OrderAttachment> => {
  const response = await api.patch(`/orders/attachments/${attachmentId}`, { fileName });
  return response.data;
};

export const deleteOrder = async (orderId: number): Promise<void> => {
  await api.delete(`/orders/${orderId}`);
};

export const uploadAudio = async (orderId: number, file: File): Promise<void> => {
  const formData = new FormData();
  formData.append('file', file);
  await api.post(`/orders/${orderId}/audio`, formData);
};

export const getAiSummary = async (orderId: number): Promise<OrderAiSummary> => {
  const response = await api.get(`/orders/${orderId}/ai-summary`);
  return response.data;
};

export const getNextOrderNumber = async (): Promise<string> => {
  const response = await api.get<{ orderNumber: string }>('/orders/next-number');
  return response.data.orderNumber;
};

export const downloadContractPdf = async (orderId: number): Promise<Blob> => {
  const response = await api.get(`/orders/${orderId}/contract/pdf`, {
    responseType: 'blob'
  });
  return response.data;
};

export const downloadContractDocx = async (orderId: number): Promise<Blob> => {
  const response = await api.get(`/orders/${orderId}/contract/docx`, {
    responseType: 'blob'
  });
  return response.data;
};
