import type { Order, OrderStatus } from '../../../api/kanban';
import type { Client } from '../../../api/clients';

/** Общие свойства списка архива (таблица и мобильные карточки). */
export interface ArchiveListProps {
  orders: Order[];
  clients: Client[];
  statuses: OrderStatus[];
  /** Монтажнику суммы и удаление недоступны. */
  isWorker: boolean;
  timezone?: string;
  onOpen: (order: Order) => void;
  onDownloadDocx: (orderId: number) => void;
  onDelete: (orderId: number, orderNumber?: string | null) => void;
}
