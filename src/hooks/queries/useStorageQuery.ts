import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMaterials, createMaterial, updateMaterial, deleteMaterial, type Material } from '../../api/storage';

export const MATERIALS_QUERY_KEY = ['materials'] as const;

export const useMaterialsQuery = (enabled = true) => {
  return useQuery<Material[]>({
    queryKey: MATERIALS_QUERY_KEY,
    queryFn: () => getMaterials(),
    enabled
  });
};

export const useCreateMaterialMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Material>) => createMaterial(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MATERIALS_QUERY_KEY });
    }
  });
};

export const useUpdateMaterialMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Material> }) => updateMaterial(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MATERIALS_QUERY_KEY });
    }
  });
};

export const useDeleteMaterialMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteMaterial(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MATERIALS_QUERY_KEY });
    }
  });
};
