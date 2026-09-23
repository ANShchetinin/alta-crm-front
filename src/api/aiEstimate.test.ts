import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requestAiEstimateText, requestAiEstimateVoice } from './aiEstimate';
import { api } from './axiosConfig';

vi.mock('./axiosConfig', () => ({
  api: {
    post: vi.fn()
  }
}));

describe('aiEstimate API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requestAiEstimateText calls POST /orders/ai-estimate/text with payload', async () => {
    const mockResponse = {
      orderId: 101,
      orderNumber: '101',
      clientName: 'Иван',
      addedMaterials: [{ materialId: 1, materialName: 'Профиль', quantity: 5 }],
      shortageMaterials: [],
      missingMaterials: [],
      aiMessage: 'Успешно добавлено 5 шт профиля'
    };

    (api.post as any).mockResolvedValueOnce({ data: mockResponse });

    const payload = { orderId: 101, prompt: 'добавь 5 профилей' };
    const result = await requestAiEstimateText(payload);

    expect(api.post).toHaveBeenCalledWith('/orders/ai-estimate/text', {
      orderId: 101,
      query: 'добавь 5 профилей',
      prompt: 'добавь 5 профилей'
    });
    expect(result).toEqual(mockResponse);
  });

  it('requestAiEstimateVoice calls POST /orders/ai-estimate/voice with FormData', async () => {
    const mockResponse = {
      orderId: 102,
      addedMaterials: [],
      shortageMaterials: [],
      missingMaterials: [],
      aiMessage: 'Голос обработан'
    };

    (api.post as any).mockResolvedValueOnce({ data: mockResponse });

    const blob = new Blob(['dummy audio content'], { type: 'audio/webm' });
    const result = await requestAiEstimateVoice(blob, 102);

    expect(api.post).toHaveBeenCalledWith(
      '/orders/ai-estimate/voice',
      expect.any(FormData),
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    expect(result).toEqual(mockResponse);
  });
});
