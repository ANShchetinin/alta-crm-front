import { api } from './axiosConfig';

export interface UpdateProfileData {
  firstName?: string;
  lastName?: string;
  email?: string;
  currentPassword?: string;
  password?: string;
}

export interface ProfileData {
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
}

export interface UpdateTenantSettingsRequest {
  primaryColor?: string;
}

export interface TenantDto {
  id: number;
  name: string;
  webhookToken: string;
  logoUrl?: string;
  primaryColor?: string;
  createdAt: string;
}

export const getCurrentTenant = async (): Promise<TenantDto> => {
  const response = await api.get('/settings/tenant');
  return response.data;
};

export const getProfile = async (): Promise<ProfileData> => {
  const response = await api.get('/settings/profile');
  return response.data;
};

export const updateProfile = async (data: UpdateProfileData): Promise<void> => {
  await api.put('/settings/profile', data);
};

export const updateTenantSettings = async (data: UpdateTenantSettingsRequest): Promise<TenantDto> => {
  const response = await api.put('/settings/tenant', data);
  return response.data;
};

export const uploadTenantLogo = async (file: File): Promise<TenantDto> => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post('/settings/tenant/logo', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};
