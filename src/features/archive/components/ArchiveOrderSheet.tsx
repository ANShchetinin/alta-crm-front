import { Archive as ArchiveIcon, Download, FileText, MapPin, Phone, RotateCcw, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import type { OrderAttachment, OrderStatus } from '../../../api/kanban';
import { Sheet } from '../../../components/ui/Sheet';
import { formatDateInTimezone, formatDateTimeInTimezone } from '../../../utils/dateUtils';
import { get2GisUrl, getYandexMapsUrl } from '../../../utils/navigation';
import { getOrderRemainder } from '../../../utils/orderPayments';
import { firstActiveStatus } from '../utils/archiveOrders';
import type { ArchiveOrderDetail } from '../hooks/useArchiveOrderDetail';
import { MessengerButtons } from './ArchiveBadges';
import { OrderEstimateSection } from './OrderEstimateSection';
import { OrderAttachmentsList } from './OrderAttachmentsList';

interface ArchiveOrderSheetProps {
  detail: ArchiveOrderDetail;
  statuses: OrderStatus[];
  isWorker: boolean;
  timezone?: string;
  openingAttachmentId: number | null;
  onOpenAttachment: (att: OrderAttachment) => void;
  onDownloadAttachment: (att: OrderAttachment) => void;
}

const Panel = ({ children }: { children: ReactNode }) => (
  <div style={{ padding: '14px 16px', background: 'var(--chip-bg, rgba(255, 255, 255, 0.04))', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
    {children}
  </div>
);

const PanelTitle = ({ children, marginBottom = '8px' }: { children: ReactNode; marginBottom?: string }) => (
  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom }}>{children}</div>
);

const Money = ({ label, value, strong = false, color = 'var(--text-primary)' }: { label: string; value: ReactNode; strong?: boolean; color?: string }) => (
  <div>
    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{label}</div>
    <div style={{ fontWeight: strong ? 700 : 600, fontSize: strong ? '1.1rem' : '0.95rem', color, marginTop: '2px' }}>{value}</div>
  </div>
);

const rub = (value?: number | null, empty = '0 ₽') => (value != null ? `${value.toLocaleString('ru-RU')} ₽` : empty);

/** Боковая карточка архивного заказа: клиент, адрес, суммы, смета, файлы, договор, возврат в работу и удаление. */
export const ArchiveOrderSheet = ({
  detail,
  statuses,
  isWorker,
  timezone,
  openingAttachmentId,
  onOpenAttachment,
  onDownloadAttachment
}: ArchiveOrderSheetProps) => {
  const order = detail.order;
  const returnStatus = firstActiveStatus(statuses);

  return (
    <Sheet
      isOpen={detail.isOpen}
      onClose={detail.close}
      title={order ? (
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ArchiveIcon size={20} style={{ color: 'var(--accent-primary)' }} />
          Заказ {order.orderNumber || `#${order.id}`}
        </span>
      ) : ''}
      description={order ? `Архивный завершенный заказ от ${order.createdAt ? formatDateInTimezone(order.createdAt, timezone) : ''}` : ''}
      size="lg"
    >
      {order && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            background: 'var(--chip-bg, rgba(255, 255, 255, 0.04))',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--glass-border)'
          }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Статус в архиве</div>
              <div style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--text-primary)', marginTop: '2px' }}>
                {statuses.find(s => s.id === order.statusId)?.name || 'Завершен'}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Дата завершения</div>
              <div style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--text-primary)', marginTop: '2px' }}>
                {order.installedAt
                  ? formatDateTimeInTimezone(order.installedAt, timezone)
                  : (order.createdAt ? formatDateTimeInTimezone(order.createdAt, timezone) : '—')}
              </div>
            </div>
          </div>

          <Panel>
            <PanelTitle>Данные клиента</PanelTitle>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-primary)' }}>{order.clientName || 'Без имени'}</div>
                {order.clientPhone && (
                  <a
                    href={`tel:${order.clientPhone.replace(/[^\d+]/g, '')}`}
                    style={{ color: '#22c55e', textDecoration: 'none', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}
                  >
                    <Phone size={12} /> {order.clientPhone}
                  </a>
                )}
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <MessengerButtons whatsapp={order.clientWhatsapp} telegram={order.clientTelegram} size={32} iconSize={15} verboseTitles />
              </div>
            </div>
          </Panel>

          {order.address && (
            <Panel>
              <PanelTitle marginBottom="6px">Адрес объекта</PanelTitle>
              <div style={{ fontSize: '0.92rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <MapPin size={16} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                <span>{order.address}</span>
              </div>
              {(order.entrance || order.floor) && (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px', paddingLeft: '22px' }}>
                  {order.entrance && `Подъезд ${order.entrance}`}
                  {order.entrance && order.floor && ', '}
                  {order.floor && `Этаж ${order.floor}`}
                </div>
              )}
              <div style={{ display: 'flex', gap: '8px', marginTop: '10px', paddingLeft: '22px' }}>
                <a href={getYandexMapsUrl(order.address)} target="_blank" rel="noopener noreferrer" className="btn btn-ghost" style={{ fontSize: '0.75rem', padding: '4px 8px' }}>
                  Яндекс.Карты
                </a>
                <a href={get2GisUrl(order.address)} target="_blank" rel="noopener noreferrer" className="btn btn-ghost" style={{ fontSize: '0.75rem', padding: '4px 8px' }}>
                  2ГИС
                </a>
              </div>
            </Panel>
          )}

          {!isWorker && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: '10px',
              padding: '14px 16px',
              background: 'var(--chip-bg, rgba(255, 255, 255, 0.04))',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--glass-border)'
            }}>
              <Money label="Сумма сделки" value={rub(order.totalPrice, '—')} strong color="#22c55e" />
              <Money label="Предоплата" value={rub(order.prepayment)} />
              <Money label="Остаток" value={rub(getOrderRemainder(order))} />
              {order.installationPrice != null && order.installationPrice > 0 && (
                <Money label="Монтаж" value={rub(order.installationPrice)} color="var(--accent-primary)" />
              )}
            </div>
          )}

          <OrderEstimateSection order={order} measurement={detail.measurement} loading={detail.loadingMeasurement} />

          {order.description && (
            <Panel>
              <PanelTitle marginBottom="6px">Комментарий / Описание</PanelTitle>
              <div style={{ fontSize: '0.88rem', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>{order.description}</div>
            </Panel>
          )}

          {order.attachments && order.attachments.length > 0 && (
            <OrderAttachmentsList
              attachments={order.attachments}
              openingAttachmentId={openingAttachmentId}
              onOpen={onOpenAttachment}
              onDownload={onDownloadAttachment}
            />
          )}

          <div style={{ display: 'flex', gap: '10px', marginTop: '6px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => detail.downloadDocx(order.id)}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            >
              <FileText size={16} /> Договор Word (.docx)
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => detail.downloadPdf(order.id)}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            >
              <Download size={16} /> Договор PDF
            </button>
          </div>

          {!isWorker && (
            <div style={{ marginTop: '6px', borderTop: '1px solid var(--glass-border)', paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Управление архивной заявкой:</div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {returnStatus && (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    disabled={detail.actionLoading}
                    onClick={() => detail.returnToKanban(returnStatus.id)}
                    style={{
                      flex: 1,
                      color: 'var(--accent-primary)',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    <RotateCcw size={16} />
                    <span>Вернуть на Канбан</span>
                  </button>
                )}

                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={detail.actionLoading}
                  onClick={() => detail.remove(order.id, order.orderNumber)}
                  style={{
                    color: 'var(--danger, #ef4444)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '8px 16px'
                  }}
                >
                  <Trash2 size={16} />
                  <span>Удалить</span>
                </button>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--glass-border)' }}>
            <button type="button" className="btn btn-primary" onClick={detail.close}>Закрыть</button>
          </div>
        </div>
      )}
    </Sheet>
  );
};
