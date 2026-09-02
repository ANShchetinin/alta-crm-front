import { api } from './axiosConfig';

export interface OrderStatus {
  id: number;
  name: string;
  color: string;
  sortOrder: number;
  includeInFinances?: boolean;
  isCompleted?: boolean;
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
  isAct?: boolean;
}

export interface OrderAiSummary {
  id: number;
  orderId: number;
  status: 'PENDING' | 'TRANSCRIBING' | 'ANALYZING' | 'COMPLETED' | 'ERROR';
  rawTranscript?: string;
  aiSummary?: string;
  analysisResults?: string;
  chatHistory?: string;
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
  clientWhatsapp?: string;
  clientTelegram?: string;
  clientType?: string;
  clientAvatarUrl?: string;
  statusId: number;
  assigneeId?: number;
  assigneeName?: string;
  assigneeAvatarUrl?: string;
  measurerId?: number;
  measurerName?: string;
  measurerAvatarUrl?: string;
  installedById?: number;
  installedByName?: string;
  installedByAvatarUrl?: string;
  installedAt?: string;
  orderNumber?: string | null;
  address: string;
  description: string;
  totalPrice: number;
  prepayment?: number;
  prepaymentPaid?: boolean;
  prepaymentPaidAt?: string;
  remainder?: number;
  remainderPaid?: boolean;
  remainderPaidAt?: string;
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
  isArchived?: boolean;
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

export const updateFinanceStatuses = async (statusInclusionMap: Record<number, boolean>): Promise<OrderStatus[]> => {
  const response = await api.put('/order-statuses/finance-settings', statusInclusionMap);
  return response.data;
};

export const updateCompletionStatuses = async (statusCompletionMap: Record<number, boolean>): Promise<OrderStatus[]> => {
  const response = await api.put('/order-statuses/completion-settings', statusCompletionMap);
  return response.data;
};

export const getOrders = async (archived?: boolean): Promise<Order[]> => {
  const params: any = {};
  if (archived !== undefined) {
    params.archived = archived;
  }
  const response = await api.get('/orders', { params });
  return response.data;
};

export const getArchivedOrders = async (): Promise<Order[]> => {
  const response = await api.get('/orders/archive');
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

export const uploadAttachment = async (orderId: number, file: File, isAct?: boolean): Promise<OrderAttachment> => {
  const formData = new FormData();
  formData.append('file', file);
  const params: any = {};
  if (isAct !== undefined) {
    params.isAct = isAct;
  }
  const response = await api.post(`/orders/${orderId}/attachments`, formData, { params });
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

export const toggleAttachmentIsAct = async (attachmentId: number, isAct: boolean): Promise<OrderAttachment> => {
  const response = await api.patch(`/orders/attachments/${attachmentId}/act`, null, {
    params: { isAct }
  });
  return response.data;
};

export const deleteOrder = async (orderId: number): Promise<void> => {
  await api.delete(`/orders/${orderId}`);
};

export const completeOrder = async (orderId: number): Promise<Order> => {
  const response = await api.post(`/orders/${orderId}/complete`);
  return response.data;
};

export const uploadAudio = async (orderId: number, file: File): Promise<void> => {
  const formData = new FormData();
  formData.append('file', file);
  await api.post(`/orders/${orderId}/audio`, formData);
};

export const deleteOrderAudio = async (orderId: number): Promise<void> => {
  await api.delete(`/orders/${orderId}/audio`);
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

export const togglePrepaymentPaid = async (orderId: number, paid: boolean, paidAt?: string): Promise<Order> => {
  const params: any = { paid };
  if (paidAt) params.paidAt = paidAt;
  const response = await api.patch(`/orders/${orderId}/prepayment-paid`, null, { params });
  return response.data;
};

export const toggleRemainderPaid = async (orderId: number, paid: boolean, paidAt?: string): Promise<Order> => {
  const params: any = { paid };
  if (paidAt) params.paidAt = paidAt;
  const response = await api.patch(`/orders/${orderId}/remainder-paid`, null, { params });
  return response.data;
};

export const analyzeAudioWithPrompt = async (
  orderId: number,
  systemPrompt?: string,
  preset?: string,
  force?: boolean
): Promise<OrderAiSummary> => {
  const response = await api.post(`/orders/${orderId}/ai-analyze`, { systemPrompt, preset, force });
  return response.data;
};

export interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  timestamp?: string;
  tokensUsed?: number;
  costRubles?: number;
}

export const chatWithOrderAi = async (
  orderId: number,
  systemPrompt: string,
  messages: ChatMessage[],
  userMessage: string
): Promise<{ reply: string; messages: ChatMessage[]; tokensUsed?: number; costRubles?: number }> => {
  const response = await api.post(`/orders/${orderId}/ai-chat`, {
    systemPrompt,
    messages,
    userMessage
  });
  return response.data;
};

export const clearOrderAiChat = async (orderId: number): Promise<void> => {
  await api.delete(`/orders/${orderId}/ai-chat`);
};
