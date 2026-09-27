import { useQuery } from '@tanstack/react-query';
import { getMyTenants, type MyTenantsResponse } from '../../api/auth';
import { useTenantQueryKey } from './useTenantQueryKey';

export const MY_TENANTS_QUERY_KEY = ['myTenants'] as const;

export const useMyTenantsQuery = (enabled = true) => {
  const queryKey = useTenantQueryKey(MY_TENANTS_QUERY_KEY);
  return useQuery<MyTenantsResponse>({
    queryKey,
    queryFn: () => getMyTenants(),
    enabled
  });
};
