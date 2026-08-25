import { api } from './axiosConfig';

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

export const loginCall = async (email: string, password: string) => {
  const response = await api.post('/auth/login', { email, password });
  return response.data.token;
};

export const getMyTenants = async (): Promise<MyTenantsResponse> => {
  const response = await api.get('/auth/my-tenants');
  return response.data;
};

export const switchTenant = async (tenantId: number): Promise<string> => {
  const response = await api.post(`/auth/switch-tenant/${tenantId}`);
  return response.data.token;
};
