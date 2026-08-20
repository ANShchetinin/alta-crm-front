import { api } from './axiosConfig';

export interface WorkerEarningsItem {
  orderId: number;
  orderNumber?: string;
  clientName?: string;
  clientPhone?: string;
  address?: string;
  description?: string;
  installationDate?: string;
  installedAt?: string;
  createdAt?: string;
  installationPrice: number;
  statusName?: string;
  statusColor?: string;
}

export interface WorkerEarnings {
  totalEarnings: number;
  completedOrdersCount: number;
  items: WorkerEarningsItem[];
}

export const getMyEarnings = async (): Promise<WorkerEarnings> => {
  const response = await api.get('/orders/my-earnings');
  return response.data;
};
