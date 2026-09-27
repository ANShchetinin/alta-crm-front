import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getEmployees, createEmployee, updateEmployee, deleteEmployee, type Employee } from '../../api/employees';
import { useTenantQueryKey } from './useTenantQueryKey';

export const EMPLOYEES_QUERY_KEY = ['employees'] as const;

/**
 * @param pollIntervalMs период опроса (статус «в сети»); в фоновой вкладке опрос приостанавливается,
 *                       при возврате на вкладку список обновляется сразу
 */
export const useEmployeesQuery = (enabled = true, pollIntervalMs?: number) => {
  const queryKey = useTenantQueryKey(EMPLOYEES_QUERY_KEY);
  return useQuery<Employee[]>({
    queryKey,
    queryFn: () => getEmployees(),
    enabled,
    refetchInterval: pollIntervalMs,
    refetchOnWindowFocus: pollIntervalMs !== undefined
  });
};

export const useCreateEmployeeMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Employee>) => createEmployee(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EMPLOYEES_QUERY_KEY });
    }
  });
};

export const useUpdateEmployeeMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Employee> }) => updateEmployee(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EMPLOYEES_QUERY_KEY });
    }
  });
};

export const useDeleteEmployeeMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteEmployee(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EMPLOYEES_QUERY_KEY });
    }
  });
};
