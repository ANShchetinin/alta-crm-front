import { ArrowRight, MapPin } from 'lucide-react';
import type { Order, OrderStatus } from '../../../api/kanban';
import { Sheet } from '../../../components/ui/Sheet';
import { formatDateInTimezone } from '../../../utils/dateUtils';
import type { ClientHistory } from '../hooks/useClientHistory';

interface ClientHistorySheetProps {
  history: ClientHistory;
  statuses: OrderStatus[];
  timezone?: string;
  onOpenOrder: (orderId: number) => void;
}

/** Точка цвета статуса и выбор статуса заявки прямо из истории. */
const StatusSelect = ({ order, statuses, onChange, compact }: {
  order: Order;
  statuses: OrderStatus[];
  onChange: (statusId: number) => void;
  compact: boolean;
}) => (
  <div style={{ display: 'inline-flex', alignItems: 'center', gap: compact ? '5px' : '6px' }}>
    <span style={{
      width: '8px',
      height: '8px',
      borderRadius: '50%',
      backgroundColor: statuses.find(s => s.id === order.statusId)?.color || '#3b82f6',
      flexShrink: 0
    }} />
    <select
      value={order.statusId}
      onChange={(e) => onChange(Number(e.target.value))}
      style={{
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        color: 'var(--text-primary)',
        borderRadius: '4px',
        padding: compact ? '2px 6px' : '3px 6px',
        fontSize: compact ? '0.75rem' : '0.8rem',
        cursor: 'pointer'
      }}
    >
      {statuses.map(s => (
        <option key={s.id} value={s.id}>{s.name}</option>
      ))}
    </select>
  </div>
);

const remainderOf = (order: Order) => ((order.remainder != null ? order.remainder : order.totalPrice) || 0).toLocaleString('ru-RU');
const hasPaymentSplit = (order: Order) => order.prepayment != null || order.remainder != null;

/** Боковая панель истории заявок клиента: таблица (десктоп) и карточки (телефон). */
export const ClientHistorySheet = ({ history, statuses, timezone, onOpenOrder }: ClientHistorySheetProps) => {
  const { client, orders, loading, changeStatus } = history;
  const formatDate = (order: Order) => (order.createdAt ? formatDateInTimezone(order.createdAt, timezone) : '-');
  const openOrder = (orderId: number) => {
    history.close();
    onOpenOrder(orderId);
  };

  return (
    <Sheet
      isOpen={history.isOpen}
      onClose={history.close}
      title={`История заявок: ${client?.name || ''}`}
      description={client?.clientType === 'LEGAL_ENTITY' ? 'Компания / Юридическое лицо' : 'Физическое лицо'}
      size="xl"
    >
      <div>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Загрузка истории...</div>
        ) : (
          <>
            <div className="clients-table-container glass-panel desktop-table-view" style={{ maxHeight: 'calc(100vh - 180px)', overflowY: 'auto' }}>
              <table className="clients-table">
                <thead>
                  <tr>
                    <th>№ Заявки / Договора</th>
                    <th>Статус</th>
                    <th>Адрес</th>
                    <th>Стоимость</th>
                    <th>Дата</th>
                    <th style={{ textAlign: 'right' }}>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', opacity: 0.5 }}>У клиента нет заявок.</td>
                    </tr>
                  ) : (
                    orders.map(order => (
                      <tr key={order.id}>
                        <td>
                          <strong style={{ fontFamily: 'monospace', color: 'var(--accent-primary)', fontSize: '0.85rem' }}>
                            № {order.orderNumber || order.id}
                          </strong>
                        </td>
                        <td>
                          <StatusSelect order={order} statuses={statuses} onChange={statusId => changeStatus(order.id, statusId)} compact={false} />
                        </td>
                        <td>{order.address || '-'}</td>
                        <td>
                          <div>{(order.totalPrice || 0).toLocaleString('ru-RU')} ₽</div>
                          {hasPaymentSplit(order) && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                              Ав: {(order.prepayment || 0).toLocaleString('ru-RU')} • Ост: {remainderOf(order)} ₽
                            </div>
                          )}
                        </td>
                        <td>{formatDate(order)}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            onClick={() => openOrder(order.id)}
                            className="action-btn"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', fontSize: '0.8rem' }}
                          >
                            Перейти <ArrowRight size={14} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="mobile-card-view" style={{ maxHeight: 'calc(90vh - 120px)', overflowY: 'auto', gap: '8px', paddingRight: '2px' }}>
              {orders.length === 0 ? (
                <div style={{ textAlign: 'center', opacity: 0.5, padding: '24px' }}>У клиента нет заявок.</div>
              ) : (
                orders.map(order => (
                  <div key={order.id} className="mobile-data-card" style={{ padding: '10px 12px', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <strong style={{ fontFamily: 'monospace', color: 'var(--accent-primary)', fontSize: '0.9rem' }}>
                        № {order.orderNumber || order.id}
                      </strong>
                      <StatusSelect order={order} statuses={statuses} onChange={statusId => changeStatus(order.id, statusId)} compact />
                    </div>

                    {order.address && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <MapPin size={12} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{order.address}</span>
                      </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', background: 'rgba(255,255,255,0.03)', padding: '6px 8px', borderRadius: '6px' }}>
                      <div>
                        <div style={{ fontWeight: 700, color: '#4ade80' }}>
                          {(order.totalPrice || 0).toLocaleString('ru-RU')} ₽
                        </div>
                        {hasPaymentSplit(order) && (
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                            Аванс: {(order.prepayment || 0).toLocaleString('ru-RU')} • Ост: {remainderOf(order)} ₽
                          </div>
                        )}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{formatDate(order)}</div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '4px' }}>
                      <button
                        type="button"
                        onClick={() => openOrder(order.id)}
                        className="btn btn-primary btn-sm"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', fontSize: '0.78rem', height: '28px' }}
                      >
                        Открыть сделку <ArrowRight size={13} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </Sheet>
  );
};
