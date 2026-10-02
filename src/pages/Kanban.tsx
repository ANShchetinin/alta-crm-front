import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Order, OrderStatus } from '../api/kanban';
import type { Client } from '../api/clients';
import type { Employee } from '../api/employees';
import { getMyReminders } from '../api/reminders';
import { useOrdersQuery, ORDERS_QUERY_KEY } from '../hooks/queries/useOrdersQuery';
import { useTenantQueryKey } from '../hooks/queries/useTenantQueryKey';
import { useInvalidateOnOrdersChanged } from '../hooks/queries/useInvalidateOnOrdersChanged';
import {
  ORDER_STATUSES_QUERY_KEY,
  orderStatusesQueryOptions,
  useOrderStatusesQuery,
  useReorderOrderStatusesMutation
} from '../hooks/queries/useOrderStatusesQuery';
import { useClientsQuery } from '../hooks/queries/useClientsQuery';
import { useEmployeesQuery } from '../hooks/queries/useEmployeesQuery';
import { useTouchKanbanDrag } from '../hooks/useTouchKanbanDrag';
import { useTouchColumnReorder } from '../hooks/useTouchColumnReorder';
import { useAppStore } from '../store/useAppStore';
import { useAuthStore } from '../store/useAuthStore';
import { useOrderDrawerStore } from '../store/useOrderDrawerStore';
import { toast } from '../utils/toast';
import { MoveRestrictionModal } from '../features/kanban/components/MoveRestrictionModal';
import { StatusChangeModal } from '../features/kanban/components/StatusChangeModal';
import { ColumnModal } from '../features/kanban/components/ColumnModal';
import { useBoardPreferences } from '../features/kanban/hooks/useBoardPreferences';
import { useColumnEditor } from '../features/kanban/hooks/useColumnEditor';
import { useCardMoves } from '../features/kanban/hooks/useCardMoves';
import {
  filterBoardCards,
  groupRemindersByOrder,
  moveColumn,
  reorderCardInColumn,
  saveCardsOrder,
  sortCardsByStoredOrder,
  type ReminderFilter
} from '../features/kanban/utils/board';
import { KanbanToolbar } from '../features/kanban/components/board/KanbanToolbar';
import { KanbanCard, type CardDragBindings } from '../features/kanban/components/board/KanbanCard';
import { KanbanMobileList } from '../features/kanban/components/board/KanbanMobileList';
import { KanbanColumns } from '../features/kanban/components/board/KanbanColumns';
import { CardDragGhost, ColumnDragGhost } from '../features/kanban/components/board/DragGhosts';
import type { BoardViewProps } from '../features/kanban/components/board/boardViewProps';
import '../styles/kanban.css';

const MY_REMINDERS_QUERY_KEY = ['myReminders'] as const;
const EMPTY_CLIENTS: Client[] = [];
const EMPTY_EMPLOYEES: Employee[] = [];

const Kanban = () => {
  const navigate = useNavigate();
  const role = useAuthStore(state => state.role);
  const tenantId = useAuthStore(state => state.tenantId);
  const isWorker = role === 'WORKER';
  const { setNewOrdersCount } = useAppStore();
  const { isOpen: isOrderDrawerOpen, orderId: activeOrderId, openOrder, openCreateOrder } = useOrderDrawerStore();
  const queryClient = useQueryClient();

  const { data: statuses, isLoading: statusesLoading } = useOrderStatusesQuery();
  const columns = useMemo<OrderStatus[]>(() => [...(statuses ?? [])].sort((a, b) => a.sortOrder - b.sortOrder), [statuses]);
  const { data: clients = EMPTY_CLIENTS, isLoading: clientsLoading } = useClientsQuery(!isWorker);
  const { data: employees = EMPTY_EMPLOYEES, isLoading: employeesLoading } = useEmployeesQuery(!isWorker);
  const { data: activeOrders, isLoading: ordersLoading } = useOrdersQuery('active');
  const reorderStatusesMutation = useReorderOrderStatusesMutation();
  const remindersKey = useTenantQueryKey(MY_REMINDERS_QUERY_KEY);
  const { data: reminders } = useQuery({ queryKey: remindersKey, queryFn: () => getMyReminders('all'), enabled: !isWorker });
  useInvalidateOnOrdersChanged(MY_REMINDERS_QUERY_KEY);
  const loading = ordersLoading || statusesLoading || clientsLoading || employeesLoading;

  // Локальная копия для оптимистичных перемещений; каждый ответ сервера пересобирает её заново
  const [cards, setCards] = useState<Order[]>([]);
  const boardRef = useRef<HTMLDivElement>(null);
  const prefs = useBoardPreferences(columns);
  const [reminderFilter, setReminderFilter] = useState<ReminderFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [desktopDraggingCardId, setDesktopDraggingCardId] = useState<number | null>(null);
  const [desktopDragOverColId, setDesktopDragOverColId] = useState<number | null>(null);

  useEffect(() => {
    if (activeOrders) {
      setCards(sortCardsByStoredOrder(activeOrders.filter(o => !o.isArchived)));
    }
  }, [activeOrders]);

  useEffect(() => {
    const firstStatus = columns.find(s => s.sortOrder === 1);
    if (activeOrders && firstStatus) {
      setNewOrdersCount(activeOrders.filter(o => o.statusId === firstStatus.id).length);
    }
  }, [activeOrders, columns, setNewOrdersCount]);

  const refresh = useCallback(() => Promise.all([
    queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEY }),
    queryClient.invalidateQueries({ queryKey: MY_REMINDERS_QUERY_KEY })
  ]), [queryClient]);

  const moves = useCardMoves({ cards, setCards, columns, refresh, setNewOrdersCount, openOrder });
  const columnEditor = useColumnEditor(columns.length, refresh);

  /** Сохраняет новый порядок этапов (оптимистично; при ошибке — перечитывает этапы). */
  const applyColumnOrder = async (newColumns: OrderStatus[]) => {
    queryClient.setQueryData(orderStatusesQueryOptions(tenantId).queryKey, newColumns);
    const firstStatus = newColumns.find(s => s.sortOrder === 1);
    if (firstStatus) {
      setNewOrdersCount(cards.filter(o => o.statusId === firstStatus.id).length);
    }
    try {
      await reorderStatusesMutation.mutateAsync(newColumns.map(c => c.id));
    } catch (err) {
      console.error('Failed to reorder columns', err);
      toast.error('Не удалось сохранить порядок этапов');
      queryClient.invalidateQueries({ queryKey: ORDER_STATUSES_QUERY_KEY });
    }
  };

  const touchDrag = useTouchKanbanDrag({
    boardRef,
    onDropCard: (cardId, targetStatusId, targetCardId, position) => {
      const card = cards.find(c => c.id === cardId);
      if (!card) {
        return;
      }
      if (card.statusId !== targetStatusId) {
        moves.requestMove(card, targetStatusId);
        return;
      }
      if (!targetCardId || targetCardId === cardId) {
        return;
      }
      const reordered = reorderCardInColumn(cards, card, targetStatusId, targetCardId, position);
      setCards(reordered);
      saveCardsOrder(reordered);
    }
  });

  const columnReorder = useTouchColumnReorder({ columns, onReorder: applyColumnOrder });

  // Свернутая колонка раскрывается, если держать над ней карточку 350 мс
  const { draggingCard: touchDraggingCard, targetStatusId: touchTargetStatusId } = touchDrag;
  const { collapsedColumns, expandColumnTemporarily } = prefs;
  useEffect(() => {
    if (!touchDraggingCard || !touchTargetStatusId || collapsedColumns[touchTargetStatusId] !== true) {
      return;
    }
    const timer = setTimeout(() => expandColumnTemporarily(touchTargetStatusId), 350);
    return () => clearTimeout(timer);
  }, [touchDraggingCard, touchTargetStatusId, collapsedColumns, expandColumnTemporarily]);

  const remindersByOrder = useMemo(() => groupRemindersByOrder(reminders ?? []), [reminders]);
  const filteredCards = useMemo(
    () => filterBoardCards(cards, reminderFilter, remindersByOrder, searchQuery, clients, employees),
    [cards, reminderFilter, remindersByOrder, searchQuery, clients, employees]
  );
  const displayedColumns = useMemo(
    () => (prefs.hideEmptyColumns ? columns.filter(col => filteredCards.some(c => c.statusId === col.id)) : columns),
    [columns, prefs.hideEmptyColumns, filteredCards]
  );

  const clearDesktopDrag = () => {
    setDesktopDraggingCardId(null);
    setDesktopDragOverColId(null);
  };

  /** Бросок на колонку: карточка — перенос в этап, заголовок колонки — перестановка этапов. */
  const handleColumnDrop = async (e: DragEvent, columnId: number) => {
    e.preventDefault();
    clearDesktopDrag();
    const cardId = e.dataTransfer.getData('cardId');
    if (cardId) {
      const card = cards.find(c => c.id === parseInt(cardId));
      if (card) {
        moves.requestMove(card, columnId);
      }
      return;
    }
    const sourceColumnId = e.dataTransfer.getData('columnId');
    const reordered = sourceColumnId ? moveColumn(columns, parseInt(sourceColumnId), columnId) : null;
    if (reordered) {
      await applyColumnOrder(reordered);
    }
  };

  const cardDrag: CardDragBindings = {
    isMobile: prefs.isMobile,
    activeOrderId: isOrderDrawerOpen ? activeOrderId : null,
    desktopDraggingCardId,
    touchDraggingCardId: touchDraggingCard?.id ?? null,
    touchTargetCardId: touchDrag.targetCardId,
    touchTargetPosition: touchDrag.targetCardPosition,
    onDesktopDragStart: (e, cardId) => {
      e.dataTransfer.setData('cardId', cardId.toString());
      e.dataTransfer.effectAllowed = 'move';
      setDesktopDraggingCardId(cardId);
    },
    onDesktopDragEnd: clearDesktopDrag,
    onGripPointerDown: touchDrag.handleGripPointerDown,
    onGripTouchStart: touchDrag.handleGripTouchStart,
    onTouchMove: touchDrag.handleTouchMove,
    onTouchEnd: touchDrag.handleTouchEnd,
    onTouchCancel: touchDrag.handleTouchCancel,
    isClickAllowed: touchDrag.isClickAllowed
  };

  if (loading) {
    return <div style={{ padding: 24 }}>Загрузка доски...</div>;
  }

  const viewProps: BoardViewProps = {
    boardRef,
    columns: displayedColumns,
    cards: filteredCards,
    isWorker,
    renderCard: card => (
      <KanbanCard
        key={card.id}
        card={card}
        clients={clients}
        employees={employees}
        columns={columns}
        reminders={remindersByOrder[card.id]}
        drag={cardDrag}
        onOpen={id => openOrder(id)}
        onOpenComments={id => openOrder(id, 'COMMENTS')}
        onComplete={moves.completeInstallation}
      />
    ),
    touchDraggingCard,
    touchTargetStatusId,
    touchTargetCardId: touchDrag.targetCardId,
    columnReorder: {
      draggingColId: columnReorder.draggingColId,
      targetColId: columnReorder.targetColId,
      onTouchStart: columnReorder.handleHandleTouchStart,
      onTouchMove: columnReorder.handleHandleTouchMove,
      onTouchEnd: columnReorder.handleHandleTouchEnd,
      onTouchCancel: columnReorder.handleHandleTouchCancel
    },
    onAddColumn: columnEditor.openAdd
  };

  return (
    <div className="kanban-wrapper">
      <KanbanToolbar
        isMobile={prefs.isMobile}
        isWorker={isWorker}
        hideEmptyColumns={prefs.hideEmptyColumns}
        onToggleHideEmpty={prefs.toggleHideEmptyColumns}
        mobileViewMode={prefs.mobileViewMode}
        onMobileViewModeChange={prefs.setMobileViewMode}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        reminderFilter={reminderFilter}
        onReminderFilterChange={setReminderFilter}
        onOpenCalendar={() => navigate('/calendar')}
        onCreateOrder={openCreateOrder}
      />

      {prefs.isMobile && prefs.mobileViewMode === 'list' ? (
        <KanbanMobileList
          {...viewProps}
          collapsedColumns={prefs.collapsedColumns}
          onToggleColumn={prefs.toggleColumnCollapse}
          onToggleAll={prefs.toggleAllColumns}
        />
      ) : (
        <KanbanColumns
          {...viewProps}
          isMobile={prefs.isMobile}
          allCards={cards}
          isFilterActive={Boolean(searchQuery.trim()) || reminderFilter !== 'all'}
          reminderFilter={reminderFilter}
          desktopDrag={{
            dragOverColId: desktopDragOverColId,
            onColumnDrop: handleColumnDrop,
            onColumnDragOver: (e, columnId) => {
              e.preventDefault();
              if (desktopDragOverColId !== columnId) {
                setDesktopDragOverColId(columnId);
              }
            },
            onColumnDragLeave: (e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                setDesktopDragOverColId(null);
              }
            }
          }}
          onEditColumn={columnEditor.openEdit}
          onDeleteColumn={columnEditor.remove}
        />
      )}

      <ColumnModal {...columnEditor.modalProps} />

      <MoveRestrictionModal
        data={moves.restriction}
        onClose={moves.closeRestriction}
        onOpenOrderFiles={(orderId) => {
          moves.closeRestriction();
          openOrder(orderId, 'FILES');
        }}
      />

      <StatusChangeModal data={moves.statusChange} onClose={moves.closeStatusChange} onConfirm={moves.confirmStatusChange} />

      <CardDragGhost card={touchDraggingCard} position={touchDrag.dragPosition} ghost={touchDrag.ghostData} />
      <ColumnDragGhost
        column={columns.find(c => c.id === columnReorder.draggingColId)}
        position={columnReorder.draggingColId ? columnReorder.dragPosition : null}
      />
    </div>
  );
};

export default Kanban;
