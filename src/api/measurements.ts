import { api } from './axiosConfig';

export interface MeasurementRoomDto {
  id?: number;
  roomName: string;
  area: number;
  perimeter: number;
  height?: number;
  baseCorners?: number;
  extraCorners?: number;
  canvasMaterialId?: number;
  canvasMaterialName?: string;
  profileMaterialId?: number;
  profileMaterialName?: string;
  insertMaterialId?: number;
  insertMaterialName?: string;
  lightsCount?: number;
  chandeliersCount?: number;
  tracksLength?: number;
  corniceType?: string;
  corniceLength?: number;
  pipesCount?: number;
  tileLength?: number;
  slotSelections?: {
    slotId: number;
    materialId: number;
    customQuantity?: number;
    customValue?: string;
  }[];
  extraParamsJson?: string;
}

export interface MeasurementDto {
  id?: number;
  orderId?: number;
  totalPrice?: number;
  totalCostPrice?: number;
  notes?: string;
  rooms: MeasurementRoomDto[];
  items?: MeasurementCalculationItemDto[];
}

export interface MeasurementCalculationItemDto {
  materialId?: number;
  slotId?: number;
  name: string;
  type: 'MATERIAL' | 'SERVICE';
  quantity: number;
  unit: string;
  unitSalePrice: number;
  unitCostPrice: number;
  totalSalePrice: number;
  totalCostPrice: number;
  roomName?: string;
}

export interface MeasurementCalculateRequest {
  rooms: MeasurementRoomDto[];
}

export interface MeasurementCalculateResponse {
  totalSalePrice: number;
  totalCostPrice: number;
  expectedProfit: number;
  profitMarginPercent: number;
  totalArea: number;
  totalPerimeter: number;
  totalRoomsCount: number;
  totalLightsCount: number;
  totalPipesCount: number;
  totalCorniceLength: number;
  items: MeasurementCalculationItemDto[];
}

export const getMeasurementByOrderId = async (orderId: number): Promise<MeasurementDto> => {
  const res = await api.get<MeasurementDto>(`/orders/${orderId}/measurement`);
  return res.data;
};

export const calculateOrderMeasurement = async (
  orderId: number,
  req: MeasurementCalculateRequest
): Promise<MeasurementCalculateResponse> => {
  const res = await api.post<MeasurementCalculateResponse>(`/orders/${orderId}/measurement/calculate`, req);
  return res.data;
};

export const calculateStandaloneMeasurement = async (
  req: MeasurementCalculateRequest
): Promise<MeasurementCalculateResponse> => {
  const res = await api.post<MeasurementCalculateResponse>('/measurements/calculate', req);
  return res.data;
};

export const saveOrderMeasurement = async (
  orderId: number,
  dto: MeasurementDto
): Promise<MeasurementDto> => {
  const res = await api.post<MeasurementDto>(`/orders/${orderId}/measurement`, dto);
  return res.data;
};
