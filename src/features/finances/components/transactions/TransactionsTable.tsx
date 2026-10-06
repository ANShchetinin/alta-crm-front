import { AlertTriangle, CheckCircle2, Clock, ExternalLink } from 'lucide-react';
import type { Order } from '../../../../api/kanban';
import { formatDateTimeInTimezone } from '../../../../utils/dateUtils';
import { getOrderRemainder, getPaymentState } from '../../../../utils/orderPayments';
import { OrderStatusBadge } from '../OrderStatusBadge';
import { PaymentCellToggle } from './PaymentToggle';
import type { TransactionsViewProps } from './TransactionsTab';
import { formatPhone, phoneHref } from '../../../../utils/phone';

const orderProfit = (order: Order) =>
  order.profit ?? (order.totalPrice || 0) - (order.materialsCost || 0) - (order.installationPrice || 0);

/** Таблица взаиморасчетов для десктопа. */
export const TransactionsTable = ({
  orders,
  statuses,
  timezone,
  onTogglePrepayment,
  onToggleRemainder,
  onOpenOrder
}: TransactionsViewProps) => (
  <div className="finances-desktop-table glass-panel" style={{ overflowX: 'auto', borderRadius: 'var(--radius-md)' }}>
    <table className="clients-table" style={{ width: '100%', fontSize: '0.85rem' }}>
      <thead>
        <tr>
          <th style={{ padding: '12px 14px' }}>Договор / Заказ</th>
          <th>Клиент</th>
          <th>Статус</th>
          <th>Сумма договора</th>
          <th>Аванс (Факт)</th>
          <th>Остаток (Факт)</th>
          <th>Статус оплаты</th>
          <th>С/с материалов</th>
          <th>Монтаж</th>
          <th>Прибыль</th>
          <th style={{ textAlign: 'right' }}>Действия</th>
        </tr>
      </thead>
      <tbody>
        {orders.length === 0 ? (
          <tr>
            <td colSpan={11} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
              Сделок по выбранным фильтрам не найдено
            </td>
          </tr>
        ) : (
          orders.map(order => {
            const status = statuses.find(s => s.id === order.statusId);
            const profit = orderProfit(order);
            const paymentState = getPaymentState(order);
            return (
              <tr key={order.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                <td style={{ padding: '10px 14px' }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {order.orderNumber ? `№ ${order.orderNumber}` : `#${order.id}`}
                  </div>
                  {order.address && (
                    <div
                      style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      title={order.address}
                    >
                      {order.address}
                    </div>
                  )}
                </td>

                <td>
                  <div style={{ fontWeight: 500 }}>{order.clientName || 'Клиент'}</div>
                  {order.clientPhone && (
                    <a href={phoneHref(order.clientPhone)} style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', textDecoration: 'none' }}>
                      {formatPhone(order.clientPhone)}
                    </a>
                  )}
                </td>

                <td>{status && <OrderStatusBadge status={status} />}</td>

                <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                  {(order.totalPrice || 0).toLocaleString('ru-RU')} ₽
                </td>

                <td>
                  <PaymentCellToggle
                    label="Аванс"
                    amount={order.prepayment || 0}
                    paid={Boolean(order.prepaymentPaid)}
                    paidAtText={order.prepaymentPaidAt ? formatDateTimeInTimezone(order.prepaymentPaidAt, timezone) : undefined}
                    onToggle={() => onTogglePrepayment(order.id, Boolean(order.prepaymentPaid))}
                  />
                </td>

                <td>
                  <PaymentCellToggle
                    label="Остаток"
                    amount={getOrderRemainder(order)}
                    paid={Boolean(order.remainderPaid)}
                    paidAtText={order.remainderPaidAt ? formatDateTimeInTimezone(order.remainderPaidAt, timezone) : undefined}
                    onToggle={() => onToggleRemainder(order.id, Boolean(order.remainderPaid))}
                  />
                </td>

                <td>
                  {paymentState === 'PAID' ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#4ade80', fontSize: '0.75rem', fontWeight: 600 }}>
                      <CheckCircle2 size={13} /> Оплачен
                    </span>
                  ) : paymentState === 'PARTIAL' ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#f59e0b', fontSize: '0.75rem', fontWeight: 600 }}>
                      <Clock size={13} /> Частично
                    </span>
                  ) : (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#ef4444', fontSize: '0.75rem', fontWeight: 500 }}>
                      <AlertTriangle size={13} /> Не оплачен
                    </span>
                  )}
                </td>

                <td style={{ color: 'var(--text-secondary)' }}>
                  {(order.materialsCost || 0).toLocaleString('ru-RU')} ₽
                </td>
                <td style={{ color: 'var(--text-secondary)' }}>
                  {(order.installationPrice || 0).toLocaleString('ru-RU')} ₽
                </td>
                <td style={{ fontWeight: 600, color: profit >= 0 ? '#4ade80' : '#ef4444' }}>
                  {`${profit.toLocaleString('ru-RU')} ₽`}
                  {order.profitMargin != null && (
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block' }}>
                      {order.profitMargin.toFixed(1)}%
                    </span>
                  )}
                </td>

                <td style={{ textAlign: 'right', padding: '10px 14px' }}>
                  <button
                    type="button"
                    onClick={() => onOpenOrder(order.id)}
                    className="btn btn-ghost"
                    style={{ padding: '5px 8px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    title="Открыть сделку в Канбане"
                  >
                    <ExternalLink size={14} /> Открыть
                  </button>
                </td>
              </tr>
            );
          })
        )}
      </tbody>
    </table>
  </div>
);
