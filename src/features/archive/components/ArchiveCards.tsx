import { Building2, Calendar, Download, Eye, FileText, MapPin, Phone, Trash2, User } from 'lucide-react';
import type { MouseEvent } from 'react';
import { formatDateTimeInTimezone } from '../../../utils/dateUtils';
import { getAvatarGradient, getClientInitials } from '../../../utils/avatarUtils';
import { get2GisUrl, getYandexMapsUrl } from '../../../utils/navigation';
import { clientViewOf, installerNameOf } from '../utils/archiveOrders';
import { MessengerButtons, StatusPill } from './ArchiveBadges';
import type { ArchiveListProps } from './archiveListProps';

interface ArchiveCardsProps extends ArchiveListProps {
  onDownloadPdf: (orderId: number) => void;
}

const stop = (action: () => void) => (e: MouseEvent) => {
  e.stopPropagation();
  action();
};

const stopPropagation = (e: MouseEvent) => e.stopPropagation();

/** Карточки архива для телефона: клиент с мессенджерами, адрес с навигаторами, суммы и договор. */
export const ArchiveCards = ({
  orders,
  clients,
  statuses,
  isWorker,
  timezone,
  onOpen,
  onDownloadDocx,
  onDownloadPdf,
  onDelete
}: ArchiveCardsProps) => (
  <div className="archive-mobile-cards">
    {orders.map(order => {
      const client = clientViewOf(order, clients);
      return (
        <div key={order.id} className="archive-mobile-card" onClick={() => onOpen(order)}>
          <div className="archive-card-header">
            <div className="archive-card-number-box">
              <span className="archive-card-order-num">{order.orderNumber || `#${order.id}`}</span>
              {order.orderNumber && <span className="archive-card-id-tag">ID: {order.id}</span>}
            </div>
            <StatusPill status={statuses.find(s => s.id === order.statusId)} gap="5px" />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            <Calendar size={13} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
            <span>
              {order.installedAt
                ? `Завершен: ${formatDateTimeInTimezone(order.installedAt, timezone)}`
                : (order.createdAt ? `Создан: ${formatDateTimeInTimezone(order.createdAt, timezone)}` : 'Дата не указана')}
            </span>
          </div>

          <div className="archive-card-client-section">
            <div className="archive-card-client-left">
              <div className="archive-card-client-avatar" style={{ background: client.avatarUrl ? 'transparent' : getAvatarGradient(client.name) }}>
                {client.avatarUrl ? (
                  <img src={client.avatarUrl} alt={client.name} />
                ) : (
                  client.isLegal ? <Building2 size={16} /> : getClientInitials(client.name)
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <span className="archive-card-client-name">{client.name}</span>
                {client.phone && (
                  <a href={`tel:${client.phone.replace(/[^\d+]/g, '')}`} onClick={stopPropagation} className="archive-card-client-phone">
                    <Phone size={11} />
                    <span>{client.phone}</span>
                  </a>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
              <MessengerButtons whatsapp={order.clientWhatsapp} telegram={order.clientTelegram} size={28} iconSize={13} />
            </div>
          </div>

          {order.address && (
            <div className="archive-card-address-block">
              <div className="archive-card-address-text">
                <MapPin size={14} style={{ color: 'var(--accent-primary)', flexShrink: 0, marginTop: '2px' }} />
                <span>
                  {order.address}
                  {order.entrance && `, подъезд ${order.entrance}`}
                  {order.floor && `, этаж ${order.floor}`}
                </span>
              </div>
              <div className="archive-card-nav-buttons">
                <a href={getYandexMapsUrl(order.address)} target="_blank" rel="noopener noreferrer" onClick={stopPropagation} className="archive-card-nav-link">
                  Яндекс.Карты
                </a>
                <a href={get2GisUrl(order.address)} target="_blank" rel="noopener noreferrer" onClick={stopPropagation} className="archive-card-nav-link">
                  2ГИС
                </a>
              </div>
            </div>
          )}

          <div className="archive-card-details-grid">
            {!isWorker && (
              <div>
                <div className="archive-card-stat-label">Сумма сделки</div>
                <div className="archive-card-stat-value price">
                  {order.totalPrice != null ? `${order.totalPrice.toLocaleString('ru-RU')} ₽` : '—'}
                </div>
              </div>
            )}
            {!isWorker && order.prepayment != null && order.prepayment > 0 && (
              <div>
                <div className="archive-card-stat-label">Предоплата</div>
                <div className="archive-card-stat-value">{order.prepayment.toLocaleString('ru-RU')} ₽</div>
              </div>
            )}
            <div>
              <div className="archive-card-stat-label">Исполнитель</div>
              <div className="archive-card-stat-value" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <User size={12} style={{ opacity: 0.6, flexShrink: 0 }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{installerNameOf(order)}</span>
              </div>
            </div>
          </div>

          <div className="archive-card-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={stop(() => onOpen(order))}
              style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}
            >
              <Eye size={14} /> Подробнее
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={stop(() => onDownloadDocx(order.id))}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              title="Скачать договор Word"
            >
              <FileText size={14} /> DOCX
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={stop(() => onDownloadPdf(order.id))}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              title="Скачать договор PDF"
            >
              <Download size={14} /> PDF
            </button>
            {!isWorker && (
              <button
                type="button"
                className="btn btn-ghost text-danger"
                onClick={stop(() => onDelete(order.id, order.orderNumber))}
                style={{ padding: '6px 8px' }}
                title="Удалить заявку"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>
      );
    })}
  </div>
);
