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

export interface CreateTenantByOwnerRequest {
  name: string;
  timezone?: string;
  primaryColor?: string;
  requisites?: string;
}

export interface SuperAdminOwnerCompany {
  tenantId: number;
  name: string;
  logoUrl?: string;
  primaryColor?: string;
  timezone?: string;
  role: string;
  isOwner: boolean;
  createdAt: string;
}

export interface SuperAdminOwner {
  userId: number;
  email: string;
  firstName?: string;
  lastName?: string;
  maxCompaniesLimit: number;
  companiesCount: number;
  companies: SuperAdminOwnerCompany[];
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
  createByOwner: async (data: CreateTenantByOwnerRequest): Promise<{ token: string }> => {
    const res = await api.post<{ token: string }>('/tenants/create-by-owner', data);
    return res.data;
  },
  getOwners: async (): Promise<SuperAdminOwner[]> => {
    const res = await api.get<SuperAdminOwner[]>('/tenants/owners');
    return res.data;
  },
  updateOwnerLimit: async (userId: number, maxCompaniesLimit: number): Promise<void> => {
    await api.put(`/tenants/owners/${userId}/limits`, { maxCompaniesLimit });
  },
  createForOwner: async (userId: number, data: CreateTenantRequest): Promise<Tenant> => {
    const res = await api.post<Tenant>(`/tenants/owners/${userId}/create`, data);
    return res.data;
  },
};
