import { ExternalLink, Phone } from 'lucide-react';
import { getOrderRemainder } from '../../../../utils/orderPayments';
import { OrderStatusBadge } from '../OrderStatusBadge';
import { PaymentTileToggle } from './PaymentToggle';
import type { TransactionsViewProps } from './TransactionsTab';
import { formatPhone, phoneHref } from '../../../../utils/phone';

/** Карточки взаиморасчетов для телефонов и планшетов. */
export const TransactionCards = ({ orders, statuses, onTogglePrepayment, onToggleRemainder, onOpenOrder }: TransactionsViewProps) => (
  <div className="finances-mobile-cards">
    {orders.length === 0 ? (
      <div className="glass-panel" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Сделок по выбранным фильтрам не найдено
      </div>
    ) : (
      orders.map(order => {
        const status = statuses.find(s => s.id === order.statusId);
        const borderColor = order.prepaymentPaid && order.remainderPaid
          ? 'rgba(34, 197, 94, 0.25)'
          : order.prepaymentPaid ? 'rgba(245, 158, 11, 0.25)' : 'rgba(239, 68, 68, 0.25)';

        return (
          <div
            key={order.id}
            className="glass-panel"
            style={{
              padding: '16px',
              borderRadius: 'var(--radius-md)',
              border: `1px solid ${borderColor}`,
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
                  {order.orderNumber ? `№ ${order.orderNumber}` : `Заказ #${order.id}`}
                </div>
                {status && <OrderStatusBadge status={status} style={{ marginTop: '4px' }} />}
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Сумма сделки:</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {(order.totalPrice || 0).toLocaleString('ru-RU')} ₽
                </div>
              </div>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '10px 12px', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{order.clientName || 'Клиент'}</span>
                {order.clientPhone && (
                  <a
                    href={phoneHref(order.clientPhone)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.8rem',
                      color: 'var(--accent-primary)',
                      textDecoration: 'none',
                      padding: '4px 8px',
                      background: 'rgba(59, 130, 246, 0.12)',
                      borderRadius: '6px'
                    }}
                  >
                    <Phone size={13} /> {formatPhone(order.clientPhone)}
                  </a>
                )}
              </div>
              {order.address && (
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  📍 {order.address}
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <PaymentTileToggle
                label="Аванс"
                amount={order.prepayment || 0}
                paid={Boolean(order.prepaymentPaid)}
                onToggle={() => onTogglePrepayment(order.id, Boolean(order.prepaymentPaid))}
              />
              <PaymentTileToggle
                label="Остаток"
                amount={getOrderRemainder(order)}
                paid={Boolean(order.remainderPaid)}
                onToggle={() => onToggleRemainder(order.id, Boolean(order.remainderPaid))}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '6px', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Материалы: {(order.materialsCost || 0).toLocaleString('ru-RU')} ₽ • Монтаж: {(order.installationPrice || 0).toLocaleString('ru-RU')} ₽
              </div>
              <button
                type="button"
                onClick={() => onOpenOrder(order.id)}
                className="btn btn-ghost"
                style={{ padding: '4px 8px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              >
                <ExternalLink size={13} /> В Канбан
              </button>
            </div>
          </div>
        );
      })
    )}
  </div>
);
