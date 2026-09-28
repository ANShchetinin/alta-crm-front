import { ArrowDown, ArrowUp, ArrowUpDown, Building2, Eye, FileText, MapPin, Phone, Trash2 } from 'lucide-react';
import type { MouseEvent } from 'react';
import { formatDateInTimezone, formatDateTimeInTimezone } from '../../../utils/dateUtils';
import { getAvatarGradient, getClientInitials } from '../../../utils/avatarUtils';
import { clientViewOf, installerNameOf, type SortDirection, type SortField } from '../utils/archiveOrders';
import { MessengerButtons, StatusPill } from './ArchiveBadges';
import type { ArchiveListProps } from './archiveListProps';

interface ArchiveTableProps extends ArchiveListProps {
  sortField: SortField;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
}

const SortableHeader = ({ field, label, sortField, sortDirection, onSort, alignRight = false }: {
  field: SortField;
  label: string;
  sortField: SortField;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
  alignRight?: boolean;
}) => (
  <th onClick={() => onSort(field)} style={{ cursor: 'pointer', ...(alignRight ? { textAlign: 'right' } : {}) }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', ...(alignRight ? { justifyContent: 'flex-end' } : {}) }}>
      <span>{label}</span>
      {sortField !== field
        ? <ArrowUpDown size={14} style={{ opacity: 0.4 }} />
        : sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
    </div>
  </th>
);

const stop = (action: () => void) => (e: MouseEvent) => {
  e.stopPropagation();
  action();
};

/** Таблица архива для десктопа с сортировкой по заголовкам; клик по строке открывает карточку заказа. */
export const ArchiveTable = ({
  orders,
  clients,
  statuses,
  isWorker,
  timezone,
  onOpen,
  onDownloadDocx,
  onDelete,
  sortField,
  sortDirection,
  onSort
}: ArchiveTableProps) => {
  const sortProps = { sortField, sortDirection, onSort };

  return (
    <div className="table-responsive glass-panel archive-desktop-table" style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
      <table className="clients-table">
        <thead>
          <tr>
            <SortableHeader field="orderNumber" label="Номер" {...sortProps} />
            <SortableHeader field="installedAt" label="Дата завершения" {...sortProps} />
            <SortableHeader field="clientName" label="Клиент" {...sortProps} />
            <th>Адрес объекта</th>
            <th>Исполнитель</th>
            {!isWorker && <SortableHeader field="totalPrice" label="Сумма сделки" alignRight {...sortProps} />}
            <th>Статус</th>
            <th style={{ textAlign: 'right' }}>Действия</th>
          </tr>
        </thead>
        <tbody>
          {orders.map(order => {
            const client = clientViewOf(order, clients);
            return (
              <tr key={order.id} onClick={() => onOpen(order)} style={{ cursor: 'pointer' }}>
                <td>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 700, color: 'var(--accent-primary)', fontSize: '0.92rem' }}>
                      {order.orderNumber || `#${order.id}`}
                    </span>
                    {order.orderNumber && (
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>ID: {order.id}</span>
                    )}
                  </div>
                </td>

                <td>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.86rem', color: 'var(--text-primary)' }}>
                      {order.installedAt
                        ? formatDateInTimezone(order.installedAt, timezone)
                        : (order.createdAt ? formatDateInTimezone(order.createdAt, timezone) : '—')}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                      {order.installedAt ? formatDateTimeInTimezone(order.installedAt, timezone).split(',')[1] || '' : ''}
                    </span>
                  </div>
                </td>

                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      overflow: 'hidden',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: '#fff',
                      background: client.avatarUrl ? 'transparent' : getAvatarGradient(client.name),
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      flexShrink: 0
                    }}>
                      {client.avatarUrl ? (
                        <img src={client.avatarUrl} alt={client.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        client.isLegal ? <Building2 size={15} /> : getClientInitials(client.name)
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                      <span style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)' }}>{client.name}</span>
                      {client.phone && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '1px' }}>
                          <a
                            href={`tel:${client.phone.replace(/[^\d+]/g, '')}`}
                            onClick={(e) => e.stopPropagation()}
                            style={{ color: '#22c55e', textDecoration: 'none', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                          >
                            <Phone size={10} /> {client.phone}
                          </a>
                          <MessengerButtons whatsapp={order.clientWhatsapp} telegram={order.clientTelegram} size={18} iconSize={10} />
                        </div>
                      )}
                    </div>
                  </div>
                </td>

                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', maxWidth: '240px' }}>
                    <MapPin size={14} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                    <span style={{ fontSize: '0.84rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {order.address || '—'}
                    </span>
                  </div>
                </td>

                <td>
                  <div style={{ fontSize: '0.84rem', color: 'var(--text-primary)', fontWeight: 500 }}>{installerNameOf(order)}</div>
                </td>

                {!isWorker && (
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.92rem', color: '#22c55e' }}>
                        {order.totalPrice != null ? `${order.totalPrice.toLocaleString('ru-RU')} ₽` : '—'}
                      </span>
                      {order.prepayment != null && order.prepayment > 0 && (
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                          Аванс: {order.prepayment.toLocaleString('ru-RU')} ₽
                        </span>
                      )}
                    </div>
                  </td>
                )}

                <td>
                  <StatusPill status={statuses.find(s => s.id === order.statusId)} />
                </td>

                <td style={{ textAlign: 'right' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                    <button type="button" className="btn-icon" onClick={stop(() => onOpen(order))} title="Просмотреть детали заявки">
                      <Eye size={16} />
                    </button>
                    <button type="button" className="btn-icon" onClick={stop(() => onDownloadDocx(order.id))} title="Скачать договор Word (.docx)">
                      <FileText size={16} />
                    </button>
                    {!isWorker && (
                      <button
                        type="button"
                        className="btn-icon text-danger"
                        onClick={stop(() => onDelete(order.id, order.orderNumber))}
                        title="Удалить заявку"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
