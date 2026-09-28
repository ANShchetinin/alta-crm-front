import { AlertTriangle, CheckCircle2, Phone } from 'lucide-react';
import type { Order } from '../../../api/kanban';
import { getOrderDebt, getOrderRemainder } from '../utils/financeCalculations';

interface ReceivablesTabProps {
  debtors: Order[];
  onTogglePrepayment: (orderId: number, currentlyPaid: boolean) => void;
  onToggleRemainder: (orderId: number, currentlyPaid: boolean) => void;
}

const paymentStateText = (paid: boolean | undefined) => (paid ? '✓ Оплачен' : '✗ Долг');

/** Вкладка дебиторской задолженности: общий долг клиентов и карточки должников с быстрым приемом оплаты. */
export const ReceivablesTab = ({ debtors, onTogglePrepayment, onToggleRemainder }: ReceivablesTabProps) => {
  const totalDebt = debtors.reduce((sum, order) => sum + getOrderDebt(order), 0);

  return (
    <div>
      <div style={{
        background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12), rgba(255, 255, 255, 0.02))',
        border: '1px solid rgba(245, 158, 11, 0.25)',
        borderRadius: 'var(--radius-md)',
        padding: '16px 20px',
        marginBottom: '16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div>
          <div style={{ fontSize: '0.9rem', color: '#f59e0b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertTriangle size={18} /> Дебиторская задолженность клиентов
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '3px' }}>
            Сделки, по которым клиенты ещё не внесли аванс или не доплатили остаток по договору
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Всего долг клиентов:</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f59e0b' }}>
            {totalDebt.toLocaleString('ru-RU')} ₽
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
        {debtors.length === 0 ? (
          <div className="glass-panel" style={{ gridColumn: '1 / -1', padding: '32px', textAlign: 'center', color: '#4ade80' }}>
            <CheckCircle2 size={32} style={{ margin: '0 auto 10px' }} />
            <p style={{ margin: 0, fontWeight: 600 }}>Все сделки полностью оплачены! Дебиторской задолженности нет.</p>
          </div>
        ) : (
          debtors.map(order => {
            const prepayment = order.prepayment || 0;
            const remainder = getOrderRemainder(order);

            return (
              <div key={order.id} className="glass-panel" style={{ padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                      {order.orderNumber ? `Договор № ${order.orderNumber}` : `Заказ #${order.id}`}
                    </div>
                    <div style={{ fontSize: '0.88rem', color: 'var(--text-primary)', marginTop: '2px' }}>
                      {order.clientName || 'Клиент'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>К доплате:</span>
                    <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f59e0b' }}>
                      {getOrderDebt(order).toLocaleString('ru-RU')} ₽
                    </div>
                  </div>
                </div>

                {order.address && (
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    📍 {order.address}
                  </div>
                )}

                <div style={{
                  display: 'flex',
                  gap: '8px',
                  padding: '8px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  borderRadius: 'var(--radius-sm)',
                  marginBottom: '12px',
                  fontSize: '0.78rem'
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: 'var(--text-secondary)' }}>Аванс:</div>
                    <div style={{ fontWeight: 600, color: order.prepaymentPaid ? '#4ade80' : '#ef4444' }}>
                      {prepayment.toLocaleString('ru-RU')} ₽ {paymentStateText(order.prepaymentPaid)}
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: 'var(--text-secondary)' }}>Остаток:</div>
                    <div style={{ fontWeight: 600, color: order.remainderPaid ? '#4ade80' : '#ef4444' }}>
                      {remainder.toLocaleString('ru-RU')} ₽ {paymentStateText(order.remainderPaid)}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  {order.clientPhone ? (
                    <a
                      href={`tel:${order.clientPhone}`}
                      className="btn btn-ghost"
                      style={{
                        color: 'var(--success)',
                        padding: '6px 10px',
                        background: 'rgba(34, 197, 94, 0.1)',
                        border: '1px solid rgba(34, 197, 94, 0.25)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        textDecoration: 'none',
                        fontSize: '0.8rem',
                        fontWeight: 600
                      }}
                    >
                      <Phone size={13} /> Позвонить: {order.clientPhone}
                    </a>
                  ) : <div />}

                  <div style={{ display: 'flex', gap: '6px' }}>
                    {!order.prepaymentPaid && (
                      <button
                        type="button"
                        onClick={() => onTogglePrepayment(order.id, false)}
                        className="btn btn-primary"
                        style={{ fontSize: '0.75rem', padding: '5px 8px' }}
                      >
                        + Аванс ({prepayment.toLocaleString('ru-RU')} ₽)
                      </button>
                    )}
                    {!order.remainderPaid && (
                      <button
                        type="button"
                        onClick={() => onToggleRemainder(order.id, false)}
                        className="btn btn-primary"
                        style={{ fontSize: '0.75rem', padding: '5px 8px', background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
                      >
                        + Остаток ({remainder.toLocaleString('ru-RU')} ₽)
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
