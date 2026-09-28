import { ArrowDownCircle, ChevronDown, ChevronsDown, ChevronsUp, GripVertical } from 'lucide-react';
import type { BoardViewProps } from './boardViewProps';

interface KanbanMobileListProps extends BoardViewProps {
  collapsedColumns: Record<number, boolean>;
  onToggleColumn: (columnId: number) => void;
  onToggleAll: (expand: boolean) => void;
}

/** Доска на телефоне в виде списка: этапы — раскрывающиеся секции с суммой и перетаскиванием. */
export const KanbanMobileList = ({
  boardRef,
  columns,
  cards,
  isWorker,
  renderCard,
  touchDraggingCard,
  touchTargetStatusId,
  touchTargetCardId,
  columnReorder,
  collapsedColumns,
  onToggleColumn,
  onToggleAll
}: KanbanMobileListProps) => {
  const allExpanded = columns.length > 0 && columns.every(col => collapsedColumns[col.id] === false);

  return (
    <div className="kanban-mobile-list-view" ref={boardRef}>
      <div className="kanban-mobile-list-toolbar">
        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
          Этапы воронки ({columns.length})
        </span>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => onToggleAll(!allExpanded)}
          style={{
            fontSize: '0.76rem',
            padding: '4px 10px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--glass-border)',
            background: 'rgba(255, 255, 255, 0.04)',
            color: 'var(--text-primary)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            fontWeight: 500
          }}
        >
          {allExpanded
            ? <><ChevronsUp size={14} style={{ color: 'var(--accent-primary)' }} /><span>Свернуть все</span></>
            : <><ChevronsDown size={14} style={{ color: 'var(--accent-primary)' }} /><span>Развернуть все</span></>}
        </button>
      </div>

      {columns.map(column => {
        const columnCards = cards.filter(c => c.statusId === column.id);
        const isCollapsed = collapsedColumns[column.id] !== undefined ? collapsedColumns[column.id] : false;
        const columnTotal = columnCards.reduce((acc, c) => acc + (c.totalPrice || 0), 0);
        const isColDragging = columnReorder.draggingColId === column.id;
        const isColReorderTarget = columnReorder.targetColId === column.id && !isColDragging;
        const isDropTarget = touchTargetStatusId === column.id;
        const isForeignCard = Boolean(touchDraggingCard) && touchDraggingCard?.statusId !== column.id;

        return (
          <div
            key={column.id}
            className={`kanban-mobile-accordion-column ${isCollapsed ? 'is-collapsed' : ''} ${isDropTarget ? 'is-touch-drag-over' : ''} ${isColDragging ? 'is-col-dragging-placeholder' : ''} ${isColReorderTarget ? 'is-col-reorder-target' : ''}`}
            data-column-id={column.id}
          >
            <div className="kanban-mobile-accordion-header" onClick={() => onToggleColumn(column.id)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                {!isWorker && (
                  <div
                    className="kanban-column-grip-handle"
                    onTouchStart={(e) => columnReorder.onTouchStart(e, column.id)}
                    onTouchMove={columnReorder.onTouchMove}
                    onTouchEnd={columnReorder.onTouchEnd}
                    onTouchCancel={columnReorder.onTouchCancel}
                    onClick={(e) => e.stopPropagation()}
                    style={{ padding: '4px 2px', cursor: 'grab', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}
                    title="Перетащить статус"
                  >
                    <GripVertical size={16} />
                  </div>
                )}
                <span className="dot" style={{ backgroundColor: column.color || '#3b82f6', flexShrink: 0 }} />
                <span style={{ fontWeight: 600, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {column.name}
                </span>
                <span className="kanban-mobile-accordion-count">{columnCards.length}</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                {isDropTarget && isForeignCard && isCollapsed && (
                  <span className="kanban-header-drop-badge">
                    <ArrowDownCircle size={13} /> Вставить сюда
                  </span>
                )}
                {columnTotal > 0 && (
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                    {columnTotal.toLocaleString('ru-RU')} ₽
                  </span>
                )}
                <div style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
                  {isCollapsed ? <ChevronDown size={18} /> : <ChevronsUp size={18} />}
                </div>
              </div>
            </div>

            {!isCollapsed && (
              <div className="kanban-mobile-accordion-body">
                {isDropTarget && isForeignCard && (!touchTargetCardId || columnCards.length === 0) && touchDraggingCard && (
                  <div className="kanban-touch-drop-slot">
                    <ArrowDownCircle size={17} />
                    <span>Переместить заявку #{touchDraggingCard.id} в «{column.name}»</span>
                  </div>
                )}
                {columnCards.length === 0 && (!touchDraggingCard || !isDropTarget) ? (
                  <div className="kanban-empty-column-placeholder">Нет заявок в этом статусе</div>
                ) : (
                  columnCards.map(card => renderCard(card))
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
