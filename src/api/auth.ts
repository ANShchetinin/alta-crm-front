import { api } from './axiosConfig';
import type { TenantDto } from './settings';

export interface UserTenant {
  tenantId: number;
  name: string;
  logoUrl?: string;
  primaryColor?: string;
  timezone?: string;
  role: string;
  isOwner: boolean;
  createdAt: string;
}

export interface MyTenantsResponse {
  currentTenantId: number;
  maxCompaniesLimit: number;
  currentCompaniesCount: number;
  canCreateCompany: boolean;
  tenants: UserTenant[];
}

export interface SwitchTenantResponse {
  token: string;
  tenantSettings?: TenantDto;
  myTenants?: MyTenantsResponse;
}

export const loginCall = async (email: string, password: string) => {
  const response = await api.post('/auth/login', { email, password });
  return response.data.token;
};

export const getMyTenants = async (): Promise<MyTenantsResponse> => {
  const response = await api.get('/auth/my-tenants');
  return response.data;
};

export const switchTenant = async (tenantId: number): Promise<SwitchTenantResponse> => {
  const response = await api.post<SwitchTenantResponse>(`/auth/switch-tenant/${tenantId}`);
  return response.data;
};
