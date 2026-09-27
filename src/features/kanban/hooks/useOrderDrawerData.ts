import { useCallback, useEffect, useState } from 'react';
import { getOrderStatuses, type OrderStatus } from '../../../api/kanban';
import { getClients, type Client } from '../../../api/clients';
import { getMaterials, type Material } from '../../../api/storage';
import { getEmployees, type Employee } from '../../../api/employees';
import { getContractTemplateStatus, type ContractTemplateStatus } from '../../../api/settings';

/**
 * Справочники шторки заказа: статусы (по порядку), а для сотрудников офиса — клиенты, материалы, сотрудники
 * и наличие шаблонов договоров. Монтажнику справочники с персональными и финансовыми данными не запрашиваются.
 */
export const useOrderDrawerData = (isOpen: boolean, isWorker: boolean, hasContractTemplates: boolean) => {
  const [columns, setColumns] = useState<OrderStatus[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [templateStatus, setTemplateStatus] = useState<ContractTemplateStatus | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    let cancelled = false;
    Promise.all([
      getOrderStatuses().catch(() => []),
      !isWorker ? getClients().catch(() => []) : Promise.resolve([]),
      !isWorker ? getMaterials().catch(() => []) : Promise.resolve([]),
      !isWorker ? getEmployees().catch(() => []) : Promise.resolve([]),
      !isWorker && hasContractTemplates ? getContractTemplateStatus().catch(() => null) : Promise.resolve(null)
    ]).then(([statuses, clientsData, materialsData, employeesData, templateStatusData]) => {
      if (cancelled) {
        return;
      }
      setColumns([...statuses].sort((a, b) => a.sortOrder - b.sortOrder));
      setClients(clientsData);
      setMaterials(materialsData);
      setEmployees(employeesData);
      setTemplateStatus(templateStatusData);
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen, isWorker, hasContractTemplates]);

  const reloadClients = useCallback(async () => {
    setClients(await getClients());
  }, []);

  return { columns, clients, employees, materials, templateStatus, reloadClients };
};
