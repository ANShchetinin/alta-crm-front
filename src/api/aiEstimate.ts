import { api } from './axiosConfig';

export interface AddedMaterialDto {
  materialId?: number;
  materialName?: string;
  name?: string;
  quantity?: number;
  unit?: string;
  costPrice?: number;
  salePrice?: number;
  totalCost?: number;
}

export interface UpdatedMaterialDto {
  materialId?: number;
  materialName?: string;
  name?: string;
  unit?: string;
  oldQuantity?: number;
  newQuantity?: number;
  salePrice?: number;
  costDelta?: number;
}

export interface ReplacedMaterialDto {
  oldMaterialName?: string;
  newMaterialName?: string;
  quantity?: number;
  unit?: string;
  costDelta?: number;
}

export interface RemovedMaterialDto {
  materialId?: number;
  materialName?: string;
  name?: string;
  unit?: string;
  quantity?: number;
  refundCost?: number;
}

export interface ShortageMaterialDto {
  materialId?: number;
  materialName?: string;
  requestedQuantity?: number;
  availableQuantity?: number;
  addedQuantity?: number;
  shortageQuantity?: number;
  unit?: string;
}

export interface MissingMaterialDto {
  materialName?: string;
  requestedQuantity?: number;
  unit?: string;
  reason?: string;
}

export interface AiEstimateResultDto {
  orderId?: number;
  orderNumber?: string;
  clientName?: string;
  success?: boolean;
  aiMessage: string;
  recognizedText?: string;
  addedMaterials?: AddedMaterialDto[];
  shortageMaterials?: ShortageMaterialDto[];
  missingMaterials?: MissingMaterialDto[];
  addedItems?: AddedMaterialDto[];
  updatedItems?: UpdatedMaterialDto[];
  replacedItems?: ReplacedMaterialDto[];
  removedItems?: RemovedMaterialDto[];
  shortageItems?: ShortageMaterialDto[];
  missingItems?: MissingMaterialDto[];
  addedTotalCost?: number;
  totalCostDelta?: number;
}

export interface AiEstimateTextRequest {
  orderId?: number;
  query?: string;
  prompt?: string;
}

/**
 * Отправляет текстовый запрос на AI-заполнение сметы из остатков склада.
 */
export const requestAiEstimateText = async (payload: AiEstimateTextRequest): Promise<AiEstimateResultDto> => {
  const query = payload.query || payload.prompt || '';
  const body = {
    orderId: payload.orderId,
    query,
    prompt: query
  };
  const response = await api.post('/orders/ai-estimate/text', body);
  return response.data;
};

/**
 * Отправляет голосовую запись (аудиофайл) на AI-заполнение сметы из остатков склада.
 */
export const requestAiEstimateVoice = async (audioBlob: Blob, orderId?: number): Promise<AiEstimateResultDto> => {
  const formData = new FormData();
  const mimeType = audioBlob.type || 'audio/wav';
  const extension = mimeType.includes('wav') ? 'wav' : mimeType.includes('mp4') ? 'mp4' : mimeType.includes('ogg') ? 'ogg' : 'webm';
  formData.append('file', audioBlob, `estimate_voice.${extension}`);
  if (orderId) {
    formData.append('orderId', orderId.toString());
  }
  const response = await api.post('/orders/ai-estimate/voice', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};
