import type { WheelEvent } from 'react';
import { ArrowDownCircle, Edit2, Trash2 } from 'lucide-react';
import type { Order, OrderStatus } from '../../../../api/kanban';
import { isCompletedStatus } from '../../../../utils/orderStatus';
import { columnCardsOf, type ReminderFilter } from '../../utils/board';
import type { BoardViewProps, DesktopDragBindings } from './boardViewProps';
import { AddColumnButton } from './AddColumnButton';

interface KanbanColumnsProps extends BoardViewProps {
  isMobile: boolean;
  /** Все карточки доски без фильтров — для счетчика «найдено / всего». */
  allCards: Order[];
  isFilterActive: boolean;
  reminderFilter: ReminderFilter;
  desktopDrag: DesktopDragBindings;
  onEditColumn: (column: OrderStatus) => void;
  onDeleteColumn: (columnId: number) => void;
}

/** Колесо мыши листает доску вбок, если колонка под курсором уже не прокручивается дальше. */
const scrollBoardHorizontally = (e: WheelEvent, board: HTMLDivElement | null) => {
  if (e.deltaY === 0 || e.shiftKey) {
    return;
  }
  const columnContent = (e.target as HTMLElement).closest('.column-content');
  if (columnContent) {
    const canScrollUp = e.deltaY < 0 && columnContent.scrollTop > 0;
    const canScrollDown = e.deltaY > 0 && columnContent.scrollTop + columnContent.clientHeight < columnContent.scrollHeight - 1;
    if (canScrollUp || canScrollDown) {
      return;
    }
  }
  if (board) {
    board.scrollLeft += e.deltaY;
  }
};

const countBadgeStyle = (reminderFilter: ReminderFilter, hasCards: boolean) => {
  if (!hasCards) {
    return undefined;
  }
  if (reminderFilter === 'today') {
    return { background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', fontWeight: 700 };
  }
  if (reminderFilter === 'overdue') {
    return { background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', fontWeight: 700 };
  }
  return undefined;
};

/** Доска колонками (десктоп и режим «Доска» на телефоне): перетаскивание карточек и колонок, счетчики и правка этапов. */
export const KanbanColumns = ({
  boardRef,
  columns,
  cards,
  allCards,
  isWorker,
  isMobile,
  isFilterActive,
  reminderFilter,
  renderCard,
  touchDraggingCard,
  touchTargetStatusId,
  touchTargetCardId,
  columnReorder,
  desktopDrag,
  onEditColumn,
  onDeleteColumn,
  onAddColumn
}: KanbanColumnsProps) => (
  <div
    className="kanban-board"
    ref={boardRef}
    onDragOver={(e) => e.preventDefault()}
    onWheel={(e) => scrollBoardHorizontally(e, boardRef.current)}
  >
    {columns.map(col => {
      const isCompleted = isCompletedStatus(col);
      const colCards = columnCardsOf(cards, col, isCompleted);
      const totalInCol = allCards.filter(c => c.statusId === col.id && (!isCompleted || !c.isArchived)).length;
      const countBadgeText = isFilterActive && (colCards.length !== totalInCol || colCards.length === 0)
        ? `${colCards.length}/${totalInCol}`
        : totalInCol;
      const isDropTarget = touchTargetStatusId === col.id || desktopDrag.dragOverColId === col.id;
      const isColDragging = columnReorder.draggingColId === col.id;
      const isColReorderTarget = columnReorder.targetColId === col.id && !isColDragging;
      const touchOnlyOnDesktop = <T extends unknown[]>(handler: (...args: T) => void) => (...args: T) => {
        if (!isMobile) {
          handler(...args);
        }
      };

      return (
        <div
          key={col.id}
          data-column-id={col.id}
          className={`kanban-column glass-panel ${isDropTarget ? 'is-drop-target' : ''} ${isColDragging ? 'is-col-dragging-placeholder' : ''} ${isColReorderTarget ? 'is-col-reorder-target' : ''}`}
          onDrop={(e) => desktopDrag.onColumnDrop(e, col.id)}
          onDragOver={(e) => desktopDrag.onColumnDragOver(e, col.id)}
          onDragLeave={desktopDrag.onColumnDragLeave}
        >
          <div
            className="column-header"
            draggable={!isWorker && !isMobile}
            onDragStart={(e) => {
              if (isMobile) {
                return;
              }
              e.stopPropagation();
              e.dataTransfer.setData('columnId', col.id.toString());
              e.dataTransfer.effectAllowed = 'move';
            }}
            onTouchStart={touchOnlyOnDesktop((e) => columnReorder.onTouchStart(e, col.id))}
            onTouchMove={touchOnlyOnDesktop(columnReorder.onTouchMove)}
            onTouchEnd={touchOnlyOnDesktop(columnReorder.onTouchEnd)}
            onTouchCancel={touchOnlyOnDesktop(columnReorder.onTouchCancel)}
            style={{ cursor: !isWorker && !isMobile ? 'grab' : 'default' }}
          >
            <div className="column-title">
              <span className="dot" style={{ backgroundColor: col.color || '#3b82f6' }} />
              <h3>{col.name}</h3>
              <span className="count" style={countBadgeStyle(reminderFilter, colCards.length > 0)}>{countBadgeText}</span>
            </div>

            {!isWorker && (
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <button className="btn-icon" onClick={() => onEditColumn(col)} title="Редактировать колонку">
                  <Edit2 size={16} />
                </button>
                {totalInCol === 0 && (
                  <button className="btn-icon" onClick={() => onDeleteColumn(col.id)} title="Удалить колонку">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="column-content">
            {touchDraggingCard && touchTargetStatusId === col.id && (!touchTargetCardId || colCards.length === 0) && touchDraggingCard.statusId !== col.id && (
              <div className="kanban-touch-drop-slot">
                <ArrowDownCircle size={17} />
                <span>Переместить в «{col.name}»</span>
              </div>
            )}
            {colCards.map(card => renderCard(card))}
          </div>
        </div>
      );
    })}

    {!isWorker && (
      <div className="kanban-add-column-wrapper">
        <AddColumnButton onClick={onAddColumn} />
      </div>
    )}
  </div>
);
