import { api } from './axiosConfig';

export interface Material {
  id: number;
  name: string;
  unit: string;
  quantityInStock: number;
  costPrice: number;
}

export const getMaterials = async (): Promise<Material[]> => {
  const response = await api.get('/materials');
  return response.data;
};

export const createMaterial = async (material: Partial<Material>): Promise<Material> => {
  const response = await api.post('/materials', material);
  return response.data;
};
