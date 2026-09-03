import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getMaterials, getLowStockMaterials, createMaterial, updateMaterial, deleteMaterial } from './storage';
import { api } from './axiosConfig';

vi.mock('./axiosConfig', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  }
}));

describe('Storage API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getMaterials calls GET /materials', async () => {
    const mockData = [{ id: 1, name: 'Багет', quantityInStock: 100, costPrice: 50, unit: 'м' }];
    (api.get as any).mockResolvedValueOnce({ data: mockData });

    const result = await getMaterials();
    expect(api.get).toHaveBeenCalledWith('/materials');
    expect(result).toEqual(mockData);
  });

  it('getLowStockMaterials calls GET /materials/low-stock', async () => {
    const mockData = [{ id: 1, name: 'Багет', quantityInStock: 5, minQuantity: 20, costPrice: 50, unit: 'м' }];
    (api.get as any).mockResolvedValueOnce({ data: mockData });

    const result = await getLowStockMaterials();
    expect(api.get).toHaveBeenCalledWith('/materials/low-stock');
    expect(result).toEqual(mockData);
  });

  it('createMaterial calls POST /materials', async () => {
    const payload = { name: 'Вставка', unit: 'м', quantityInStock: 50, costPrice: 20 };
    (api.post as any).mockResolvedValueOnce({ data: { id: 2, ...payload } });

    const result = await createMaterial(payload);
    expect(api.post).toHaveBeenCalledWith('/materials', payload);
    expect(result.id).toBe(2);
  });

  it('updateMaterial calls PUT /materials/:id', async () => {
    const payload = { name: 'Вставка белая' };
    (api.put as any).mockResolvedValueOnce({ data: { id: 2, ...payload } });

    const result = await updateMaterial(2, payload);
    expect(api.put).toHaveBeenCalledWith('/materials/2', payload);
    expect(result.name).toBe('Вставка белая');
  });

  it('deleteMaterial calls DELETE /materials/:id', async () => {
    (api.delete as any).mockResolvedValueOnce({ data: null });
    await deleteMaterial(2);
    expect(api.delete).toHaveBeenCalledWith('/materials/2');
  });
});
