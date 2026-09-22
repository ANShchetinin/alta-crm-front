import { api } from './axiosConfig';

export interface AddedMaterialDto {
  materialId?: number;
  materialName?: string;
  quantity?: number;
  unit?: string;
  costPrice?: number;
  salePrice?: number;
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
  addedMaterials: AddedMaterialDto[];
  shortageMaterials: ShortageMaterialDto[];
  missingMaterials: MissingMaterialDto[];
  aiMessage: string;
}

export interface AiEstimateTextRequest {
  orderId?: number;
  prompt: string;
}

/**
 * Отправляет текстовый запрос на AI-заполнение сметы из остатков склада.
 */
export const requestAiEstimateText = async (payload: AiEstimateTextRequest): Promise<AiEstimateResultDto> => {
  const response = await api.post('/orders/ai-estimate/text', payload);
  return response.data;
};

/**
 * Отправляет голосовую запись (аудиофайл) на AI-заполнение сметы из остатков склада.
 */
export const requestAiEstimateVoice = async (audioBlob: Blob, orderId?: number): Promise<AiEstimateResultDto> => {
  const formData = new FormData();
  const mimeType = audioBlob.type || 'audio/webm';
  const extension = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('ogg') ? 'ogg' : 'webm';
  formData.append('file', audioBlob, `estimate_voice.${extension}`);
  if (orderId) {
    formData.append('orderId', orderId.toString());
  }
  const response = await api.post('/orders/ai-estimate/voice', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};
