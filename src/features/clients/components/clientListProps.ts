import type { Client } from '../../../api/clients';
import type { UserTenant } from '../../../api/auth';

/** Общие свойства представлений списка клиентов (таблица и мобильные карточки). */
export interface ClientListProps {
  clients: Client[];
  tenants: UserTenant[];
  currentTenantId: number;
  timezone?: string;
  onEdit: (client: Client) => void;
  onHistory: (client: Client) => void;
  onDelete: (id: number) => void;
}
