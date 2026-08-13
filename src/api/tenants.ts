import { api } from './axiosConfig';

export interface Tenant {
  id: number;
  name: string;
  webhookToken: string;
  createdAt: string;
}

export interface CreateTenantRequest {
  name: string;
  ownerFirstName?: string;
  ownerLastName?: string;
  ownerEmail: string;
  ownerPassword: string;
}

export const tenantsApi = {
  getAll: async (): Promise<Tenant[]> => {
    const res = await api.get<Tenant[]>('/tenants');
    return res.data;
  },
  create: async (data: CreateTenantRequest): Promise<Tenant> => {
    const res = await api.post<Tenant>('/tenants', data);
    return res.data;
  },
  resetOwnerPassword: async (tenantId: number): Promise<{ temporaryPassword: string }> => {
    const res = await api.post<{ temporaryPassword: string }>(`/tenants/${tenantId}/reset-password`);
    return res.data;
  },
};
