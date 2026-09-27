import React from 'react';
import { ChevronDown, MessageSquare, X } from 'lucide-react';
import type { OrderStatus } from '../../../../api/kanban';

interface OrderDrawerHeaderProps {
  orderId: number | null;
  columns: OrderStatus[];
  statusId: string;
  onStatusChange: (statusId: string) => void;
  commentsCount: number;
  onShowComments: () => void;
  onClose: () => void;
  touchHandlers: React.HTMLAttributes<HTMLDivElement>;
}

/**
 * Шапка шторки заказа: номер, выбор статуса, счетчик комментариев и закрытие. Шапку можно тянуть вниз для закрытия.
 */
export const OrderDrawerHeader: React.FC<OrderDrawerHeaderProps> = ({
  orderId,
  columns,
  statusId,
  onStatusChange,
  commentsCount,
  onShowComments,
  onClose,
  touchHandlers
}) => {
  const currentStatus = columns.find(c => c.id.toString() === statusId);

  return (
    <div 
      className="order-drawer-header modal-header"
      {...touchHandlers}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', flex: 1, minWidth: 0, paddingRight: '8px' }}>
        <h2 style={{ margin: 0, whiteSpace: 'nowrap' }}>
          {orderId ? `Заказ #${orderId}` : 'Новый заказ'}
        </h2>
        
        {/* Status Dropdown in Modal Header */}
        <div className="modal-header-status-badge">
          <span 
            className="dot" 
            style={{ 
              backgroundColor: currentStatus?.color || '#3b82f6',
              flexShrink: 0
            }} 
          />
          <span className="modal-header-status-text">
            {currentStatus?.name || columns[0]?.name || 'Статус'}
          </span>
          <select 
            value={statusId}
            onChange={(e) => onStatusChange(e.target.value)}
            className="modal-header-status-select"
            title="Статус заказа"
          >
            {columns.map(col => (
              <option key={col.id} value={col.id.toString()}>{col.name}</option>
            ))}
          </select>
          <ChevronDown className="modal-header-status-icon" size={14} />
        </div>
        {/* Comments Count Badge in Modal Header */}
        {orderId && commentsCount > 0 && (
          <button
            type="button"
            onClick={onShowComments}
            className="modal-header-comments-badge"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              background: 'rgba(59, 130, 246, 0.12)',
              color: 'var(--accent-primary)',
              border: '1px solid rgba(59, 130, 246, 0.25)',
              borderRadius: '14px',
              padding: '3px 10px',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            title={`Комментарии к заказу (${commentsCount}). Нажмите, чтобы перейти`}
          >
            <MessageSquare size={13} />
            <span>{commentsCount}</span>
          </button>
        )}
      </div>

      <button 
        type="button" 
        onClick={onClose} 
        className="btn-icon"
        aria-label="Close"
      >
        <X size={20} />
      </button>
    </div>
  );
};
