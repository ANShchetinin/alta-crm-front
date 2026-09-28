import type { CSSProperties } from 'react';
import type { OrderStatus } from '../../../api/kanban';

/** Цветной бейдж статуса заказа. */
export const OrderStatusBadge = ({ status, style }: { status: OrderStatus; style?: CSSProperties }) => {
  const color = status.color || '#3b82f6';
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      padding: '2px 8px',
      borderRadius: '10px',
      fontSize: '0.72rem',
      fontWeight: 600,
      background: `${color}22`,
      color: status.color || '#60a5fa',
      border: `1px solid ${color}44`,
      ...style
    }}>
      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: color }} />
      {status.name}
    </span>
  );
};
