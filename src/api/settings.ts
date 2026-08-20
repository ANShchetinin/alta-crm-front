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

export interface TenantRequisites {
  companyType?: 'LEGAL_ENTITY' | 'IE';
  fullName?: string;
  shortName?: string;
  legalAddress?: string;
  actualAddress?: string;
  inn?: string;
  kpp?: string;
  ogrn?: string;
  ogrnip?: string;
  bankName?: string;
  bik?: string;
  checkingAccount?: string;
  correspondentAccount?: string;
  signerPosition?: string;
  signerName?: string;
  signerAuthority?: string;
  phone?: string;
  landlinePhone?: string;
  email?: string;
  website?: string;
  taxSystem?: string;
  authorityDoc?: string;
  courtJurisdiction?: string;
  brandName?: string;
}

export interface UpdateTenantSettingsRequest {
  primaryColor?: string;
  requisites?: TenantRequisites;
  orderNumberFormat?: string;
}

export interface TenantDto {
  id: number;
  name: string;
  webhookToken: string;
  logoUrl?: string;
  primaryColor?: string;
  requisites?: TenantRequisites;
  orderNumberFormat?: string;
  createdAt: string;
}

export interface ContractTemplateStatus {
  individual: boolean;
  legal: boolean;
  individualTemplateUrl?: string;
  legalTemplateUrl?: string;
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
  const response = await api.post('/settings/tenant/logo', formData);
  return response.data;
};

export const getContractTemplateStatus = async (): Promise<ContractTemplateStatus> => {
  const response = await api.get('/settings/contract-templates/status');
  return response.data;
};

export const uploadContractTemplate = async (type: 'INDIVIDUAL' | 'LEGAL_ENTITY', file: File): Promise<{ success: boolean }> => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post(`/settings/contract-templates?type=${type}`, formData);
  return response.data;
};

export const downloadContractTemplateBlob = async (type: 'INDIVIDUAL' | 'LEGAL_ENTITY'): Promise<Blob> => {
  const response = await api.get(`/settings/contract-templates?type=${type}`, {
    responseType: 'blob'
  });
  return response.data;
};

export const deleteContractTemplate = async (type: 'INDIVIDUAL' | 'LEGAL_ENTITY'): Promise<{ success: boolean }> => {
  const response = await api.delete(`/settings/contract-templates?type=${type}`);
  return response.data;
};

export const generateTestContractDocxBlob = async (type: 'INDIVIDUAL' | 'LEGAL_ENTITY'): Promise<Blob> => {
  const response = await api.get(`/settings/contract-templates/test-docx?type=${type}`, {
    responseType: 'blob'
  });
  return response.data;
};
