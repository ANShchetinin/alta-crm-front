import { api } from './axiosConfig';

export type FeatureKey =
  | 'AI_SUMMARY'
  | 'FINANCES'
  | 'STORAGE'
  | 'CONTRACT_TEMPLATES'
  | 'CALENDAR'
  | 'REPORTS'
  | 'WEB_PUSH'
  | 'WHITE_LABEL'
  | 'DOCUMENT_SCANNER'
  | 'OWNER_CREATE_COMPANY';

export interface FeatureInfo {
  key: FeatureKey;
  displayName: string;
  description: string;
  systemEnabled: boolean;
}

export interface TenantFeatureRow {
  tenantId: number;
  tenantName: string;
  features: Record<FeatureKey, boolean>;
  effectiveFeatures: Record<FeatureKey, boolean>;
}

export interface TenantFeatureMatrix {
  features: FeatureInfo[];
  tenants: TenantFeatureRow[];
}

export const getActiveFeatures = async (): Promise<string[]> => {
  const response = await api.get('/features/active');
  return response.data;
};

export const getFeatureMatrix = async (): Promise<TenantFeatureMatrix> => {
  const response = await api.get('/features/admin/matrix');
  return response.data;
};

export const updateSystemFeature = async (featureKey: FeatureKey, enabled: boolean): Promise<any> => {
  const response = await api.put(`/features/admin/system/${featureKey}`, { enabled });
  return response.data;
};

export const updateTenantFeature = async (tenantId: number, featureKey: FeatureKey, enabled: boolean): Promise<any> => {
  const response = await api.put(`/features/admin/tenants/${tenantId}/${featureKey}`, { enabled });
  return response.data;
};

export const bulkUpdateTenantFeatures = async (tenantId: number, features: Record<string, boolean>): Promise<any> => {
  const response = await api.post(`/features/admin/tenants/${tenantId}/bulk`, { features });
  return response.data;
};
