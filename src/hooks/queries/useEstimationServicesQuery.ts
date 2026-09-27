import { useQuery } from '@tanstack/react-query';
import { getEstimationServices, type EstimationService } from '../../api/estimationServices';
import { useTenantQueryKey } from './useTenantQueryKey';

export const ESTIMATION_SERVICES_QUERY_KEY = ['estimationServices'] as const;

export const useEstimationServicesQuery = (enabled = true) => {
  const queryKey = useTenantQueryKey(ESTIMATION_SERVICES_QUERY_KEY);
  return useQuery<EstimationService[]>({
    queryKey,
    queryFn: () => getEstimationServices(),
    enabled
  });
};
