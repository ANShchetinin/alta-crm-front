import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Client } from '../api/clients';
import type { OrderStatus } from '../api/kanban';
import type { UserTenant } from '../api/auth';
import { useClientsQuery } from '../hooks/queries/useClientsQuery';
import { useOrderStatusesQuery } from '../hooks/queries/useOrderStatusesQuery';
import { useMyTenantsQuery } from '../hooks/queries/useMyTenantsQuery';
import { useAppStore } from '../store/useAppStore';
import { useFeature } from '../hooks/useFeatureToggle';
import { PassportScannerModal } from '../components/PassportScannerModal';
import { useClientEditor } from '../features/clients/hooks/useClientEditor';
import { useClientHistory } from '../features/clients/hooks/useClientHistory';
import { filterClients, type ClientTypeFilter } from '../features/clients/utils/clientForm';
import { ClientsHeader } from '../features/clients/components/ClientsHeader';
import { ClientsTable } from '../features/clients/components/ClientsTable';
import { ClientCards } from '../features/clients/components/ClientCards';
import { ClientFormSheet } from '../features/clients/components/form/ClientFormSheet';
import { ClientHistorySheet } from '../features/clients/components/ClientHistorySheet';
import '../styles/clients.css';

const EMPTY_CLIENTS: Client[] = [];
const EMPTY_TENANTS: UserTenant[] = [];

export const Clients = () => {
  const navigate = useNavigate();
  const { tenantSettings } = useAppStore();
  const isPassportOcrEnabled = useFeature('PASSPORT_OCR');
  const { data: clients = EMPTY_CLIENTS, isLoading: clientsLoading } = useClientsQuery();
  const { data: rawStatuses, isLoading: statusesLoading } = useOrderStatusesQuery();
  const { data: tenantsResp, isLoading: tenantsLoading } = useMyTenantsQuery();
  const statuses = useMemo<OrderStatus[]>(
    () => [...(rawStatuses ?? [])].sort((a, b) => a.sortOrder - b.sortOrder),
    [rawStatuses]
  );
  const tenants = tenantsResp?.tenants ?? EMPTY_TENANTS;
  const currentTenantId = tenantsResp?.currentTenantId || 1;

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<ClientTypeFilter>('ALL');
  const [isPassportScannerOpen, setIsPassportScannerOpen] = useState(false);
  const editor = useClientEditor(currentTenantId);
  const history = useClientHistory();

  const visibleClients = useMemo(
    () => filterClients(Array.isArray(clients) ? clients : EMPTY_CLIENTS, search, typeFilter),
    [clients, search, typeFilter]
  );

  if (clientsLoading || statusesLoading || tenantsLoading) {
    return <div className="p-8" style={{ color: 'var(--text-secondary)' }}>Загрузка клиентов...</div>;
  }

  const listProps = {
    clients: visibleClients,
    tenants,
    currentTenantId,
    timezone: tenantSettings?.timezone,
    onEdit: editor.openEdit,
    onHistory: history.open,
    onDelete: editor.remove
  };

  return (
    <div className="clients-wrapper">
      <ClientsHeader
        clients={clients}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        search={search}
        onSearchChange={setSearch}
        onAdd={() => editor.openCreate('INDIVIDUAL')}
      />

      <ClientsTable {...listProps} />
      <ClientCards {...listProps} />

      <ClientFormSheet
        editor={editor}
        tenants={tenants}
        onScanPassport={isPassportOcrEnabled ? () => setIsPassportScannerOpen(true) : undefined}
      />

      <ClientHistorySheet
        history={history}
        statuses={statuses}
        timezone={tenantSettings?.timezone}
        onOpenOrder={(orderId) => navigate(`/kanban?orderId=${orderId}`)}
      />

      <PassportScannerModal
        isOpen={isPassportScannerOpen}
        onClose={() => setIsPassportScannerOpen(false)}
        showInstallationAddressOption={false}
        onApply={editor.applyPassport}
      />
    </div>
  );
};
