import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { Order, OrderStatus } from '../../../api/kanban';
import { formatDateOnly } from '../../../utils/dateUtils';
import type { InstallerSummary } from '../utils/financeCalculations';
import { formatPhone } from '../../../utils/phone';

interface InstallersTabProps {
  installers: InstallerSummary[];
  statuses: OrderStatus[];
  isCompleted: (order: Order) => boolean;
}

/** Вкладка расчетов с монтажниками: начисления по каждому и раскрывающийся список его объектов. */
export const InstallersTab = ({ installers, statuses, isCompleted }: InstallersTabProps) => {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const statusLabel = (order: Order) => {
    const done = isCompleted(order);
    return {
      done,
      text: statuses.find(s => s.id === order.statusId)?.name || (done ? 'Завершен' : 'В работе')
    };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {installers.map(item => {
        const isExpanded = expandedId === item.employee.id;
        return (
          <div key={item.employee.id} className="glass-panel" style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
            <div
              onClick={() => setExpandedId(isExpanded ? null : item.employee.id)}
              style={{
                padding: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
                background: isExpanded ? 'rgba(255, 255, 255, 0.04)' : 'transparent',
                flexWrap: 'wrap',
                gap: '12px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {item.employee.avatarUrl ? (
                  <img src={item.employee.avatarUrl} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                    {item.employee.name.charAt(0)}
                  </div>
                )}
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{item.employee.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {item.employee.position || 'Монтажник'} {item.employee.phone ? `• ${formatPhone(item.employee.phone)}` : ''}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Завершено монтажей:</div>
                  <div style={{ fontWeight: 700, color: '#4ade80' }}>
                    {item.completedCount} шт. ({item.completedEarnings.toLocaleString('ru-RU')} ₽)
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>В работе:</div>
                  <div style={{ fontWeight: 600, color: '#f59e0b' }}>
                    {item.inProgressCount} шт. ({item.inProgressEarnings.toLocaleString('ru-RU')} ₽)
                  </div>
                </div>
                <div>
                  {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
              </div>
            </div>

            {isExpanded && (
              <div style={{ padding: '12px 16px', borderTop: '1px solid var(--glass-border)', background: 'rgba(0, 0, 0, 0.15)' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '8px', color: 'var(--text-secondary)' }}>
                  Объекты и сделки монтажника ({item.orders.length}):
                </div>
                <div className="finances-installers-desktop">
                  <table style={{ width: '100%', fontSize: '0.8rem' }}>
                    <thead>
                      <tr style={{ color: 'var(--text-secondary)', textAlign: 'left' }}>
                        <th style={{ padding: '6px 0' }}>Договор / Объект</th>
                        <th>Клиент</th>
                        <th>Дата завершения</th>
                        <th>Сумма за монтаж</th>
                        <th>Статус</th>
                      </tr>
                    </thead>
                    <tbody>
                      {item.orders.map(({ order: ord, amount }) => {
                        const status = statusLabel(ord);
                        return (
                          <tr key={ord.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.03)' }}>
                            <td style={{ padding: '6px 0' }}>
                              <span style={{ fontWeight: 600 }}>{ord.orderNumber ? `№ ${ord.orderNumber}` : `#${ord.id}`}</span>
                              {ord.address && <span style={{ color: 'var(--text-secondary)', marginLeft: '6px' }}>({ord.address})</span>}
                            </td>
                            <td>{ord.clientName || '—'}</td>
                            <td>{ord.installedAt ? formatDateOnly(ord.installedAt) : (ord.installationDate ? formatDateOnly(ord.installationDate) : '—')}</td>
                            <td style={{ fontWeight: 700, color: '#60a5fa' }}>
                              {amount.toLocaleString('ru-RU')} ₽
                            </td>
                            <td>
                              <span style={{ fontSize: '0.72rem', color: status.done ? '#4ade80' : '#f59e0b', fontWeight: 600 }}>
                                {status.text}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="finances-installers-mobile">
                  {item.orders.map(({ order: ord, amount }) => {
                    const status = statusLabel(ord);
                    return (
                      <div key={ord.id} style={{ padding: '8px 10px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                            {ord.orderNumber ? `№ ${ord.orderNumber}` : `#${ord.id}`} • {ord.clientName || 'Клиент'}
                          </div>
                          {ord.address && <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>📍 {ord.address}</div>}
                          <div style={{ fontSize: '0.7rem', color: status.done ? '#4ade80' : '#f59e0b', marginTop: '2px', fontWeight: 600 }}>
                            {status.text} {ord.installedAt ? `• ${formatDateOnly(ord.installedAt)}` : ''}
                          </div>
                        </div>
                        <div style={{ fontWeight: 700, color: '#60a5fa', fontSize: '0.95rem', textAlign: 'right', flexShrink: 0 }}>
                          {amount.toLocaleString('ru-RU')} ₽
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
