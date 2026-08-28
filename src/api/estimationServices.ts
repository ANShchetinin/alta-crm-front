import { api } from './axiosConfig';
import type { MaterialType } from './storage';

export type SlotType = 'DROPDOWN' | 'AUTO_INCLUDE' | 'OPTIONAL';
export type CalculationBasis = 'AREA' | 'PERIMETER' | 'COUNT' | 'LENGTH' | 'FIXED';

export interface EstimationSlotMaterial {
  id?: number;
  materialId: number;
  materialName: string;
  unit: string;
  type: MaterialType;
  costPrice: number;
  salePrice: number;
  quantityInStock?: number;
  isDefault: boolean;
  sortOrder?: number;
}

export interface EstimationServiceSlot {
  id?: number;
  serviceId?: number;
  name: string;
  slotType: SlotType;
  calculationBasis: CalculationBasis;
  wasteCoefficient: number;
  sortOrder?: number;
  isRequired: boolean;
  materials: EstimationSlotMaterial[];
}

export interface EstimationService {
  id?: number;
  name: string;
  description?: string;
  icon?: string;
  sortOrder?: number;
  isActive: boolean;
  slots: EstimationServiceSlot[];
}

export interface EstimationServiceSaveRequest {
  name: string;
  description?: string;
  icon?: string;
  sortOrder?: number;
  isActive: boolean;
  slots: {
    id?: number;
    name: string;
    slotType: SlotType;
    calculationBasis: CalculationBasis;
    wasteCoefficient: number;
    sortOrder?: number;
    isRequired: boolean;
    materials: {
      materialId: number;
      isDefault: boolean;
      sortOrder?: number;
    }[];
  }[];
}

export async function getEstimationServices(): Promise<EstimationService[]> {
  const res = await api.get<EstimationService[]>('/estimation-services');
  return res.data;
}

export async function getActiveEstimationServices(): Promise<EstimationService[]> {
  const res = await api.get<EstimationService[]>('/estimation-services/active');
  return res.data;
}

export async function getEstimationServiceById(id: number): Promise<EstimationService> {
  const res = await api.get<EstimationService>(`/estimation-services/${id}`);
  return res.data;
}

export async function createEstimationService(req: EstimationServiceSaveRequest): Promise<EstimationService> {
  const res = await api.post<EstimationService>('/estimation-services', req);
  return res.data;
}

export async function updateEstimationService(id: number, req: EstimationServiceSaveRequest): Promise<EstimationService> {
  const res = await api.put<EstimationService>(`/estimation-services/${id}`, req);
  return res.data;
}

export async function deleteEstimationService(id: number): Promise<void> {
  await api.delete(`/estimation-services/${id}`);
}

export async function initDefaultEstimationServices(): Promise<EstimationService[]> {
  const res = await api.post<EstimationService[]>('/estimation-services/init-defaults');
  return res.data;
}
