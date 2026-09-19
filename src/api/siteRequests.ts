import { api } from './axiosConfig';

export type SiteRequestStatus = 'NEW' | 'PROCESSED' | 'REJECTED';

export interface SiteRequestItem {
  id: number;
  tenantId: number;
  clientId?: number | null;
  orderId?: number | null;
  orderNumber?: string | null;
  clientName: string;
  phone: string;
  site?: string | null;
  formType?: string | null;
  formName?: string | null;
  comment?: string | null;
  calculatedPrice?: number | null;
  calcData?: string | null;
  status: SiteRequestStatus;
  managerNotes?: string | null;
  createdAt: string;
  updatedAt: string;
  processedAt?: string | null;
  processedById?: number | null;
  processedByName?: string | null;
}

export interface UpdateSiteRequestData {
  clientName?: string;
  phone?: string;
  site?: string;
  formName?: string;
  comment?: string;
  calculatedPrice?: number;
  managerNotes?: string;
  status?: SiteRequestStatus;
}

export interface ConvertToOrderData {
  statusId: number;
  orderNumber?: string;
  address?: string;
  entrance?: string;
  floor?: string;
  assigneeId?: number;
  additionalComment?: string;
}

export interface CalcDataPayload {
  area?: string;
  perimeter?: string;
  texture?: string;
  lights?: string;
  chandeliers?: string;
  curtain?: string;
  curtainToggle?: boolean;
  selectedPlan?: string;
  selectedPrice?: string;
  [key: string]: any;
}

export const getSiteRequests = async (search?: string): Promise<SiteRequestItem[]> => {
  const params: Record<string, string> = {};
  if (search && search.trim()) {
    params.search = search.trim();
  }
  const response = await api.get('/site-requests', { params });
  return response.data;
};

export const getNewSiteRequestsCount = async (): Promise<number> => {
  const response = await api.get('/site-requests/count/new');
  return response.data?.count || 0;
};

export const getSiteRequest = async (id: number): Promise<SiteRequestItem> => {
  const response = await api.get(`/site-requests/${id}`);
  return response.data;
};

export const updateSiteRequest = async (id: number, data: UpdateSiteRequestData): Promise<SiteRequestItem> => {
  const response = await api.put(`/site-requests/${id}`, data);
  return response.data;
};

export const deleteSiteRequest = async (id: number): Promise<void> => {
  await api.delete(`/site-requests/${id}`);
};

export const convertSiteRequestToOrder = async (id: number, data: ConvertToOrderData): Promise<any> => {
  const response = await api.post(`/site-requests/${id}/convert-to-order`, data);
  return response.data;
};
