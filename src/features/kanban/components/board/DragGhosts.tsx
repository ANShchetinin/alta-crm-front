import { createPortal } from 'react-dom';
import { GripVertical } from 'lucide-react';
import type { Order, OrderStatus } from '../../../../api/kanban';
import type { TouchDragGhostData } from '../../../../hooks/useTouchKanbanDrag';
import { formatRub } from '../../../../utils/money';

type Point = { x: number; y: number } | null;

/** Упрощенная копия карточки под пальцем при перетаскивании на телефоне. */
export const CardDragGhost = ({ card, position, ghost }: { card: Order | null; position: Point; ghost: TouchDragGhostData | null }) => {
  if (!card || !position || !ghost) {
    return null;
  }
  return createPortal(
    <div
      className="kanban-touch-drag-ghost"
      style={{ left: `${position.x - ghost.offsetX}px`, top: `${position.y - ghost.offsetY}px`, width: `${ghost.width}px` }}
    >
      <div style={{ padding: '12px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="card-order-id">#{card.id}</span>
            <span className="card-client-name">{card.clientName || 'Заказ'}</span>
          </div>
        </div>
        {card.address && (
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {card.address}
          </div>
        )}
        {card.totalPrice && (
          <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#16a34a' }}>
            {formatRub(card.totalPrice)}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

/** Заголовок перетаскиваемой колонки под пальцем. */
export const ColumnDragGhost = ({ column, position }: { column?: OrderStatus; position: Point }) => {
  if (!column || !position) {
    return null;
  }
  return createPortal(
    <div className="kanban-column-drag-ghost" style={{ left: `${position.x - 60}px`, top: `${position.y - 25}px`, minWidth: '220px' }}>
      <GripVertical size={18} style={{ color: 'var(--accent-primary)' }} />
      <span className="dot" style={{ backgroundColor: column.color || '#3b82f6' }} />
      <span style={{ fontWeight: 600, fontSize: '0.92rem' }}>{column.name}</span>
    </div>,
    document.body
  );
};
