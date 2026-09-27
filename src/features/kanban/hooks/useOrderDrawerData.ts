import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { OrderStatus } from '../../../api/kanban';
import type { Client } from '../../../api/clients';
import type { Material } from '../../../api/storage';
import type { Employee } from '../../../api/employees';
import { getContractTemplateStatus } from '../../../api/settings';
import { useOrderStatusesQuery } from '../../../hooks/queries/useOrderStatusesQuery';
import { useClientsQuery, CLIENTS_QUERY_KEY } from '../../../hooks/queries/useClientsQuery';
import { useMaterialsQuery } from '../../../hooks/queries/useStorageQuery';
import { useEmployeesQuery } from '../../../hooks/queries/useEmployeesQuery';
import { useTenantQueryKey } from '../../../hooks/queries/useTenantQueryKey';

const CONTRACT_TEMPLATE_STATUS_QUERY_KEY = ['contractTemplateStatus'] as const;
const EMPTY_CLIENTS: Client[] = [];
const EMPTY_EMPLOYEES: Employee[] = [];
const EMPTY_MATERIALS: Material[] = [];

/**
 * Справочники шторки заказа: статусы (по порядку), а для сотрудников офиса — клиенты, материалы, сотрудники
 * и наличие шаблонов договоров. Монтажнику справочники с персональными и финансовыми данными не запрашиваются.
 */
export const useOrderDrawerData = (isOpen: boolean, isWorker: boolean, hasContractTemplates: boolean) => {
  const queryClient = useQueryClient();
  const officeDataEnabled = isOpen && !isWorker;

  const { data: statuses } = useOrderStatusesQuery(isOpen);
  const { data: clients = EMPTY_CLIENTS } = useClientsQuery(officeDataEnabled);
  const { data: materials = EMPTY_MATERIALS } = useMaterialsQuery(officeDataEnabled);
  const { data: employees = EMPTY_EMPLOYEES } = useEmployeesQuery(officeDataEnabled);
  const templateStatusKey = useTenantQueryKey(CONTRACT_TEMPLATE_STATUS_QUERY_KEY);
  const { data: templateStatus = null } = useQuery({
    queryKey: templateStatusKey,
    queryFn: () => getContractTemplateStatus(),
    enabled: officeDataEnabled && hasContractTemplates,
    // Шаблоны меняются на другой странице — при каждом открытии шторки сверяемся с сервером
    staleTime: 0
  });

  const columns = useMemo<OrderStatus[]>(
    () => [...(statuses ?? [])].sort((a, b) => a.sortOrder - b.sortOrder),
    [statuses]
  );

  const reloadClients = useCallback(
    () => queryClient.invalidateQueries({ queryKey: CLIENTS_QUERY_KEY }),
    [queryClient]
  );

  return { columns, clients, employees, materials, templateStatus, reloadClients };
};
