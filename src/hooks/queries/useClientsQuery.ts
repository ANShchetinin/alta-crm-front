import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getClients, createClient, updateClient, deleteClient, type Client, type ClientCreateRequest } from '../../api/clients';
import { useTenantQueryKey } from './useTenantQueryKey';

export const CLIENTS_QUERY_KEY = ['clients'] as const;

export const useClientsQuery = (enabled = true) => {
  const queryKey = useTenantQueryKey(CLIENTS_QUERY_KEY);
  return useQuery<Client[]>({
    queryKey,
    queryFn: () => getClients(),
    enabled
  });
};

export const useCreateClientMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ClientCreateRequest) => createClient(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLIENTS_QUERY_KEY });
    }
  });
};

export const useUpdateClientMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: ClientCreateRequest }) => updateClient(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLIENTS_QUERY_KEY });
    }
  });
};

export const useDeleteClientMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteClient(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLIENTS_QUERY_KEY });
    }
  });
};
