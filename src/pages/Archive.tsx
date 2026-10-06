import { useEffect, useMemo, useState } from 'react';
import { Archive as ArchiveIcon, Download } from 'lucide-react';
import type { Order, OrderStatus } from '../api/kanban';
import type { Client } from '../api/clients';
import type { Employee } from '../api/employees';
import { useOrdersQuery } from '../hooks/queries/useOrdersQuery';
import { useOrderStatusesQuery } from '../hooks/queries/useOrderStatusesQuery';
import { useClientsQuery } from '../hooks/queries/useClientsQuery';
import { useEmployeesQuery } from '../hooks/queries/useEmployeesQuery';
import { useAttachmentPreview } from '../hooks/useAttachmentPreview';
import { useAppStore } from '../store/useAppStore';
import { useAuthStore } from '../store/useAuthStore';
import { AttachmentPreviewModal } from '../components/AttachmentPreviewModal';
import { downloadBlob } from '../utils/download';
import { toast } from '../utils/toast';
import { useArchiveOrderDetail } from '../features/archive/hooks/useArchiveOrderDetail';
import {
  EMPTY_FILTERS,
  availableYears,
  buildArchiveCsv,
  filterArchiveOrders,
  sortArchiveOrders,
  type ArchiveFilters,
  type SortDirection,
  type SortField
} from '../features/archive/utils/archiveOrders';
import { ArchiveFiltersPanel } from '../features/archive/components/ArchiveFiltersPanel';
import { ArchiveTable } from '../features/archive/components/ArchiveTable';
import { ArchiveCards } from '../features/archive/components/ArchiveCards';
import { ArchiveOrderSheet } from '../features/archive/components/ArchiveOrderSheet';
import { toLocalDateString } from '../utils/dateUtils';
import '../styles/clients.css';

const EMPTY_ORDERS: Order[] = [];
const EMPTY_STATUSES: OrderStatus[] = [];
const EMPTY_CLIENTS: Client[] = [];
const EMPTY_EMPLOYEES: Employee[] = [];

export const Archive = () => {
  const { role } = useAuthStore();
  const isWorker = role === 'WORKER';
  const { tenantSettings } = useAppStore();
  const timezone = tenantSettings?.timezone;

  const { data: orders = EMPTY_ORDERS, isLoading: ordersLoading } = useOrdersQuery('archived');
  const { data: statuses = EMPTY_STATUSES, isLoading: statusesLoading } = useOrderStatusesQuery();
  const { data: clients = EMPTY_CLIENTS, isLoading: clientsLoading } = useClientsQuery(!isWorker);
  const { data: employees = EMPTY_EMPLOYEES, isLoading: employeesLoading } = useEmployeesQuery(!isWorker);
  const loading = ordersLoading || statusesLoading || clientsLoading || employeesLoading;

  const [filters, setFilters] = useState<ArchiveFilters>(EMPTY_FILTERS);
  const [sortField, setSortField] = useState<SortField>('installedAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const detail = useArchiveOrderDetail();
  const preview = useAttachmentPreview();

  const years = useMemo(() => availableYears(orders), [orders]);
  const filteredOrders = useMemo(
    () => filterArchiveOrders(orders, filters, clients, employees),
    [orders, filters, clients, employees]
  );
  const sortedOrders = useMemo(() => sortArchiveOrders(filteredOrders, sortField, sortDirection), [filteredOrders, sortField, sortDirection]);
  const totalFilteredSum = useMemo(() => filteredOrders.reduce((sum, o) => sum + (o.totalPrice || 0), 0), [filteredOrders]);

  /** Клик по заголовку: повторный — меняет направление, новое поле — от новых и крупных. */
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Escape закрывает сначала просмотр файла, затем карточку заказа
  const { previewAttachment, closePreview } = preview;
  const { isOpen: isDetailOpen, close: closeDetail } = detail;
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') {
        return;
      }
      if (previewAttachment) {
        closePreview();
      } else if (isDetailOpen) {
        closeDetail();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewAttachment, closePreview, isDetailOpen, closeDetail]);

  const handleExportCsv = () => {
    if (sortedOrders.length === 0) {
      toast.warning('Нет данных для экспорта');
      return;
    }
    const csv = buildArchiveCsv(sortedOrders, statuses, timezone);
    downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `Архив_заявок_${toLocalDateString(new Date())}.csv`);
  };

  const listProps = {
    orders: sortedOrders,
    clients,
    statuses,
    isWorker,
    timezone,
    onOpen: detail.open,
    onDownloadDocx: detail.downloadDocx,
    onDelete: detail.remove
  };

  return (
    <div className="clients-wrapper">
      <div className="clients-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(147, 51, 234, 0.2))',
            border: '1px solid var(--glass-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent-primary)'
          }}>
            <ArchiveIcon size={22} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>Архив заявок</h1>
            <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Выполненные заявки за предыдущие месяцы (отсортированы по дате завершения)
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={handleExportCsv}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            title="Экспорт отфильтрованных строк в CSV"
          >
            <Download size={16} /> Экспорт CSV
          </button>
        </div>
      </div>

      <ArchiveFiltersPanel
        filters={filters}
        onChange={changes => setFilters(prev => ({ ...prev, ...changes }))}
        onReset={() => setFilters(EMPTY_FILTERS)}
        years={years}
        employees={isWorker ? EMPTY_EMPLOYEES : employees}
        statuses={statuses}
        sortField={sortField}
        sortDirection={sortDirection}
        onSortFieldChange={setSortField}
        onToggleSortDirection={() => setSortDirection(d => (d === 'asc' ? 'desc' : 'asc'))}
        foundCount={filteredOrders.length}
        totalCount={orders.length}
        totalSum={isWorker ? undefined : totalFilteredSum}
      />

      {loading ? (
        <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)', borderRadius: 'var(--radius-md)' }}>
          Загрузка архивных заявок...
        </div>
      ) : sortedOrders.length === 0 ? (
        <div className="glass-panel" style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-secondary)', borderRadius: 'var(--radius-md)' }}>
          <ArchiveIcon size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
          <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            {orders.length === 0 ? 'Архив заявок пуст' : 'По выбранным фильтрам ничего не найдено'}
          </div>
          <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>
            {orders.length === 0
              ? 'Заявки автоматически перемещаются в архив после завершения за предыдущие месяцы'
              : 'Попробуйте изменить параметры поиска или сбросить фильтры'}
          </p>
        </div>
      ) : (
        <>
          <ArchiveTable {...listProps} sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
          <ArchiveCards {...listProps} onDownloadPdf={detail.downloadPdf} />
        </>
      )}

      <ArchiveOrderSheet
        detail={detail}
        statuses={statuses}
        isWorker={isWorker}
        timezone={timezone}
        openingAttachmentId={preview.openingAttachmentId}
        onOpenAttachment={preview.openAttachment}
        onDownloadAttachment={preview.downloadAttachment}
      />

      <AttachmentPreviewModal preview={preview.previewAttachment} onClose={preview.closePreview} onDownload={preview.downloadAttachment} />
    </div>
  );
};
