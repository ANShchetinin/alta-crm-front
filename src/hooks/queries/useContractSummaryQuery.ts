import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getContractSummary, type ContractSummary } from '../../api/kanban';
import { useTenantQueryKey } from './useTenantQueryKey';

export const CONTRACT_SUMMARY_QUERY_KEY = ['contractSummary'] as const;

/**
 * Параметры потолка и спецификация договора, которые бэкенд считает по замеру и смете заказа
 * (вкладка «Договор»). Без сохраненного заказа не запрашиваются.
 */
export const useContractSummaryQuery = (orderId: number | null, enabled = true) => {
  const queryKey = useTenantQueryKey([...CONTRACT_SUMMARY_QUERY_KEY, orderId]);
  return useQuery<ContractSummary>({
    queryKey,
    queryFn: () => getContractSummary(orderId as number),
    enabled: enabled && orderId !== null
  });
};

/** Перечитать свод договора после сохранения замера или сметы (в том числе ИИ-сметой). */
export const useInvalidateContractSummary = () => {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: CONTRACT_SUMMARY_QUERY_KEY });
};
