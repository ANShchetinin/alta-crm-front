import { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus,
  ChevronDown,
  ChevronsDown,
  ChevronsUp,
  Paperclip,
  Phone,
  MapPin,
  X,
  Search,
  Building2,
  Ruler,
  Wrench,
  CheckCircle2,
  CalendarDays,
  Bell,
  Eye,
  EyeOff,
  Edit2,
  Trash2,
  MessageCircle,
  Send,
  FileText,
  GripVertical,
  ArrowDownCircle
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  getOrderStatuses,
  getOrders,
  moveOrder,
  completeOrder,
  createOrderStatus,
  updateOrderStatus,
  deleteOrderStatus,
  reorderOrderStatuses,
  type OrderStatus,
  type Order
} from '../api/kanban';
import { getClients, type Client } from '../api/clients';
import { getClientInitials, getEmployeeInitials } from '../utils/avatarUtils';
import { getEmployees, type Employee } from '../api/employees';
import { useAppStore } from '../store/useAppStore';
import { useAuthStore } from '../store/useAuthStore';
import { formatDateTimeInTimezone, formatDateOnly, formatTimeOnly, parseLocalDateTime } from '../utils/dateUtils';
import { useNavigate } from 'react-router-dom';
import { getMyReminders, type OrderReminderDto } from '../api/reminders';
import { useTouchKanbanDrag } from '../hooks/useTouchKanbanDrag';
import { useTouchColumnReorder } from '../hooks/useTouchColumnReorder';
import { getWhatsAppLink, getTelegramLink } from '../utils/messengerUtils';
import { getYandexMapsUrl, get2GisUrl } from '../utils/navigation';
import { MoveRestrictionModal } from '../features/kanban/components/MoveRestrictionModal';
import { ColumnModal } from '../features/kanban/components/ColumnModal';
import { isActFile, formatClientNameLines } from '../features/kanban/constants';
import { useOrderDrawerStore } from '../store/useOrderDrawerStore';
import { toast } from '../utils/toast';
import { confirm } from '../utils/confirm';
import '../styles/kanban.css';

const sortCardsByStoredOrder = (cardList: Order[]): Order[] => {
  try {
    const savedOrderJson = localStorage.getItem('kanban_cards_custom_order');
    if (!savedOrderJson) return cardList;
    const orderMap: Record<number, number> = JSON.parse(savedOrderJson);
    return [...cardList].sort((a, b) => {
      const orderA = orderMap[a.id] !== undefined ? orderMap[a.id] : 999999;
      const orderB = orderMap[b.id] !== undefined ? orderMap[b.id] : 999999;
      if (orderA !== orderB) return orderA - orderB;
      return b.id - a.id;
    });
  } catch {
    return cardList;
  }
};

const saveCardsOrder = (updatedCards: Order[]) => {
  const orderMap: Record<number, number> = {};
  updatedCards.forEach((c, index) => {
    orderMap[c.id] = index;
  });
  localStorage.setItem('kanban_cards_custom_order', JSON.stringify(orderMap));
};

const Kanban = () => {
  const { t } = useTranslation();
  const role = useAuthStore(state => state.role);
  const isWorker = role === 'WORKER';
  const { setNewOrdersCount } = useAppStore();
  const { isOpen: isOrderDrawerOpen, orderId: activeOrderId, openOrder, openCreateOrder } = useOrderDrawerStore();

  const [columns, setColumns] = useState<OrderStatus[]>([]);
  const [cards, setCards] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<Client[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const boardRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const [isMobile, setIsMobile] = useState<boolean>(() => typeof window !== 'undefined' && window.innerWidth <= 768);
  const [mobileViewMode, setMobileViewMode] = useState<'list' | 'board'>(() => {
    if (typeof window === 'undefined') return 'list';
    return (localStorage.getItem('kanban_mobile_view_mode') as 'list' | 'board') || 'list';
  });
  const [collapsedColumns, setCollapsedColumns] = useState<Record<number, boolean>>(() => {
    try {
      const saved = localStorage.getItem('kanban_collapsed_columns');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleColumnCollapse = (columnId: number) => {
    setCollapsedColumns(prev => {
      const isCurrentlyCollapsed = prev[columnId] !== undefined ? prev[columnId] : true;
      const updated = { ...prev, [columnId]: !isCurrentlyCollapsed };
      localStorage.setItem('kanban_collapsed_columns', JSON.stringify(updated));
      return updated;
    });
  };

  const toggleAllColumns = (expand: boolean) => {
    const updated: Record<number, boolean> = {};
    columns.forEach(c => {
      updated[c.id] = !expand;
    });
    setCollapsedColumns(updated);
    localStorage.setItem('kanban_collapsed_columns', JSON.stringify(updated));
  };

  const [remindersMap, setRemindersMap] = useState<Record<number, OrderReminderDto[]>>({});
  const [reminderFilter, setReminderFilter] = useState<'all' | 'today' | 'overdue'>('all');
  const [hideEmptyColumns, setHideEmptyColumns] = useState<boolean>(() => localStorage.getItem('kanban_hide_empty_columns') === 'true');

  // Drag & drop outline states
  const [desktopDraggingCardId, setDesktopDraggingCardId] = useState<number | null>(null);
  const [desktopDragOverColId, setDesktopDragOverColId] = useState<number | null>(null);

  // Move restriction modal state
  const [moveRestrictionModal, setMoveRestrictionModal] = useState<{
    isOpen: boolean;
    orderId?: number;
    orderNumber?: string;
    targetStatusName: string;
    reason: string;
  } | null>(null);

  const [isColumnModalOpen, setIsColumnModalOpen] = useState(false);
  const [editingColumnId, setEditingColumnId] = useState<number | null>(null);
  const [newColumnName, setNewColumnName] = useState('');
  const [newColumnColor, setNewColumnColor] = useState('#3b82f6');
  const [newColumnIncludeInFinances, setNewColumnIncludeInFinances] = useState(true);
  const [newColumnIsCompleted, setNewColumnIsCompleted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  // Listen to global order changes from drawer
  useEffect(() => {
    const handleOrdersChanged = () => {
      fetchData();
    };
    window.addEventListener('alta:orders-changed', handleOrdersChanged);
    return () => window.removeEventListener('alta:orders-changed', handleOrdersChanged);
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statuses, orders, clientsData, employeesData, remindersData] = await Promise.all([
        getOrderStatuses().catch(() => []),
        getOrders(false).catch(() => []),
        !isWorker ? getClients().catch(() => []) : Promise.resolve([]),
        !isWorker ? getEmployees().catch(() => []) : Promise.resolve([]),
        !isWorker ? getMyReminders('all').catch(() => []) : Promise.resolve([])
      ]);
      const activeOrders = (orders || []).filter(o => !o.isArchived);
      const sortedColumns = statuses.sort((a, b) => a.sortOrder - b.sortOrder);
      setColumns(sortedColumns);
      setCards(sortCardsByStoredOrder(activeOrders));
      setClients(clientsData);
      setEmployees(employeesData);

      const rMap: Record<number, OrderReminderDto[]> = {};
      (remindersData as OrderReminderDto[]).forEach(r => {
        if (r.orderId) {
          if (!rMap[r.orderId]) rMap[r.orderId] = [];
          rMap[r.orderId].push(r);
        }
      });
      setRemindersMap(rMap);

      const firstStatus = sortedColumns.find(s => s.sortOrder === 1);
      if (firstStatus) {
        setNewOrdersCount(orders.filter(o => o.statusId === firstStatus.id).length);
      }
    } catch (error) {
      console.error("Failed to fetch kanban data", error);
    } finally {
      setLoading(false);
    }
  };

  const isCompletedColumn = (col?: OrderStatus | null) => {
    if (!col) return false;
    if (col.isCompleted !== undefined) return Boolean(col.isCompleted);
    if (!col.name) return false;
    const name = col.name.trim().toLowerCase();
    return name.includes('заверш') || name.includes('готов') || name.includes('выполнен') || name.includes('complete');
  };

  const checkCanMoveOrder = (orderId: number, targetStatusId: number): boolean => {
    const targetCol = columns.find(c => c.id === targetStatusId);
    if (!targetCol) return true;
    const isCompleted = isCompletedColumn(targetCol);
    if (isCompleted) {
      const card = cards.find(c => c.id === orderId);
      const hasAct = card ? (card.attachments || []).some(a => isActFile(a.fileName, a.isAct)) : false;
      if (!hasAct) {
        setMoveRestrictionModal({
          isOpen: true,
          orderId,
          orderNumber: card?.orderNumber || `#${orderId}`,
          targetStatusName: targetCol.name,
          reason: `Для перевода заявки в статус «${targetCol.name}» необходимо прикрепить подписанный Акт выполненных работ.`
        });
        return false;
      }
    }
    return true;
  };

  const handleDragStart = (e: React.DragEvent, id: number) => {
    e.dataTransfer.setData('cardId', id.toString());
    e.dataTransfer.effectAllowed = 'move';
    setDesktopDraggingCardId(id);
  };

  const handleDrop = async (e: React.DragEvent, statusId: number) => {
    setDesktopDraggingCardId(null);
    setDesktopDragOverColId(null);
    const cardIdStr = e.dataTransfer.getData('cardId');
    if (!cardIdStr) return;
    const cardId = parseInt(cardIdStr);

    const card = cards.find(c => c.id === cardId);
    if (!card || card.statusId === statusId) return;

    if (!checkCanMoveOrder(cardId, statusId)) {
      return;
    }

    const updatedCards = cards.map(c => c.id === cardId ? { ...c, statusId } : c);
    setCards(updatedCards);

    const firstStatus = columns.find(s => s.sortOrder === 1);
    if (firstStatus) {
      setNewOrdersCount(updatedCards.filter(o => o.statusId === firstStatus.id).length);
    }

    try {
      await moveOrder(cardId, statusId);
      window.dispatchEvent(new CustomEvent('alta:orders-changed', { detail: { action: 'move', orderId: cardId } }));
    } catch (err: any) {
      console.error("Failed to move order", err);
      const errorMsg = err.response?.data?.message || err.message || 'Ошибка перемещения карточки';
      toast.error(errorMsg);
      fetchData();
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const {
    draggingCard: touchDraggingCard,
    dragPosition: touchDragPosition,
    ghostData: touchGhostData,
    targetStatusId: touchTargetStatusId,
    targetCardId: touchTargetCardId,
    targetCardPosition: touchTargetCardPosition,
    handleGripPointerDown,
    handleGripTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleTouchCancel,
    isClickAllowed
  } = useTouchKanbanDrag({
    boardRef,
    onDropCard: async (cardId, targetStatusId, targetCardId, position) => {
      const sourceCard = cards.find(c => c.id === cardId);
      if (!sourceCard) return;

      const isSameStatus = sourceCard.statusId === targetStatusId;
      const isSameCard = targetCardId === cardId;
      if (isSameStatus && (isSameCard || !targetCardId)) return;

      if (!isSameStatus && !checkCanMoveOrder(cardId, targetStatusId)) {
        return;
      }

      // Extract cards of target status (without current dragged card)
      const targetColCards = cards.filter(c => c.statusId === targetStatusId && c.id !== cardId);
      const updatedSourceCard = { ...sourceCard, statusId: targetStatusId };

      let targetColIndex = targetColCards.length;
      if (targetCardId && targetCardId !== cardId) {
        const foundIdx = targetColCards.findIndex(c => c.id === targetCardId);
        if (foundIdx !== -1) {
          targetColIndex = position === 'after' ? foundIdx + 1 : foundIdx;
        }
      }

      targetColCards.splice(targetColIndex, 0, updatedSourceCard);

      // Reassemble complete cards array
      const otherCards = cards.filter(c => c.statusId !== targetStatusId && c.id !== cardId);
      const newCards = [...otherCards, ...targetColCards];

      setCards(newCards);
      saveCardsOrder(newCards);

      if (!isSameStatus) {
        const firstStatus = columns.find(s => s.sortOrder === 1);
        if (firstStatus) {
          setNewOrdersCount(newCards.filter(o => o.statusId === firstStatus.id).length);
        }
        try {
          await moveOrder(cardId, targetStatusId);
          window.dispatchEvent(new CustomEvent('alta:orders-changed', { detail: { action: 'move', orderId: cardId } }));
        } catch (err: any) {
          console.error("Failed to move order via touch drag", err);
          const errorMsg = err.response?.data?.message || err.message || 'Ошибка перемещения карточки';
          toast.error(errorMsg);
          fetchData();
        }
      }
    }
  });

  const {
    draggingColId,
    targetColId: touchTargetColId,
    dragPosition: colDragPosition,
    handleHandleTouchStart,
    handleHandleTouchMove,
    handleHandleTouchEnd,
    handleHandleTouchCancel
  } = useTouchColumnReorder({
    columns,
    onReorder: async (newColumns) => {
      setColumns(newColumns);
      const firstStatus = newColumns.find(s => s.sortOrder === 1);
      if (firstStatus) {
        setNewOrdersCount(cards.filter(o => o.statusId === firstStatus.id).length);
      }
      try {
        await reorderOrderStatuses(newColumns.map(c => c.id));
      } catch (err) {
        console.error("Failed to reorder columns via touch drag", err);
      }
    }
  });

  // Auto-expand collapsed column during touch drag if hovering over it for 350ms
  useEffect(() => {
    if (!touchDraggingCard || !touchTargetStatusId) return;
    if (collapsedColumns[touchTargetStatusId] === true) {
      const timer = setTimeout(() => {
        setCollapsedColumns(prev => ({ ...prev, [touchTargetStatusId]: false }));
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [touchDraggingCard, touchTargetStatusId, collapsedColumns]);

  const handleCompleteInstallation = async (e: React.MouseEvent, orderId: number) => {
    e.stopPropagation();
    const card = cards.find(c => c.id === orderId);
    const hasAct = (card?.attachments || []).some(a => isActFile(a.fileName, a.isAct));
    if (!hasAct) {
      toast.warning('Для завершения монтажа необходимо прикрепить «Акт выполненных работ» во вкладке «Файлы».');
      openOrder(orderId, 'FILES');
      return;
    }

    try {
      const updatedOrder = await completeOrder(orderId);
      setCards(prevCards => prevCards.map(c => c.id === orderId ? {
        ...c,
        statusId: updatedOrder.statusId || c.statusId,
        installedById: updatedOrder.installedById || c.installedById,
        installedByName: updatedOrder.installedByName || c.installedByName,
        installedAt: updatedOrder.installedAt || new Date().toISOString()
      } : c));
      toast.success('Монтаж успешно завершен');
      fetchData();
      window.dispatchEvent(new CustomEvent('alta:orders-changed', { detail: { action: 'complete', orderId } }));
    } catch (err: any) {
      console.error('Failed to complete installation', err);
      toast.error(err.response?.data?.message || err.message || 'Не удалось перевести заявку в завершенный статус');
    }
  };

  const handleSaveColumn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingColumnId) {
        await updateOrderStatus(editingColumnId, {
          name: newColumnName,
          color: newColumnColor,
          includeInFinances: newColumnIncludeInFinances,
          isCompleted: newColumnIsCompleted
        });
        toast.success('Этап обновлен');
      } else {
        await createOrderStatus({
          name: newColumnName,
          color: newColumnColor,
          sortOrder: columns.length + 1,
          includeInFinances: newColumnIncludeInFinances,
          isCompleted: newColumnIsCompleted
        });
        toast.success('Этап добавлен');
      }
      setIsColumnModalOpen(false);
      setEditingColumnId(null);
      setNewColumnName('');
      setNewColumnColor('#3b82f6');
      setNewColumnIncludeInFinances(true);
      setNewColumnIsCompleted(false);
      fetchData();
    } catch (err: any) {
      console.error("Failed to save column", err);
      toast.error(err.response?.data?.message || err.message || 'Ошибка сохранения этапа');
    }
  };

  const openColumnEditModal = (col: OrderStatus) => {
    setEditingColumnId(col.id);
    setNewColumnName(col.name);
    setNewColumnColor(col.color || '#3b82f6');
    setNewColumnIncludeInFinances(col.includeInFinances !== false);
    setNewColumnIsCompleted(Boolean(col.isCompleted));
    setIsColumnModalOpen(true);
  };

  const openColumnAddModal = () => {
    setEditingColumnId(null);
    setNewColumnName('');
    setNewColumnColor('#3b82f6');
    setNewColumnIncludeInFinances(true);
    setNewColumnIsCompleted(false);
    setIsColumnModalOpen(true);
  };

  const handleDeleteColumn = async (columnId: number) => {
    const ok = await confirm({
      title: 'Удаление этапа',
      message: t('kanban.deleteColumnConfirm') || 'Вы уверены, что хотите удалить этот этап?',
      confirmText: 'Удалить',
      cancelText: 'Отмена',
      danger: true,
    });
    if (!ok) return;

    try {
      await deleteOrderStatus(columnId);
      toast.success('Этап удален');
      fetchData();
    } catch (err: any) {
      toast.error(t('kanban.deleteColumnError') || 'Нельзя удалить этап, в котором есть заявки.');
    }
  };

  const filteredCards = useMemo(() => {
    let result = cards.filter(c => !c.isArchived);

    if (reminderFilter !== 'all') {
      result = result.filter(card => {
        const cardRems = remindersMap[card.id] || [];
        const pending = cardRems.filter(r => r.status === 'PENDING');

        if (reminderFilter === 'overdue') {
          return pending.some(r => r.isOverdue || (parseLocalDateTime(r.remindAt)?.getTime() || 0) < Date.now());
        } else if (reminderFilter === 'today') {
          return pending.some(r => {
            const d = parseLocalDateTime(r.remindAt);
            return d ? d.toDateString() === new Date().toDateString() : false;
          });
        }
        return true;
      });
    }

    if (!searchQuery.trim()) return result;
    const q = searchQuery.toLowerCase().trim();

    return result.filter(card => {
      const client = clients.find(cl => cl.id === card.clientId);
      const employee = employees.find(e => e.id === card.assigneeId);

      const orderNumMatch = card.orderNumber?.toLowerCase().includes(q) || false;
      const clientNameMatch = (card.clientName || client?.name)?.toLowerCase().includes(q) || false;
      const clientPhoneMatch = (card.clientPhone || client?.phone)?.toLowerCase().includes(q) || false;
      const addressMatch = card.address?.toLowerCase().includes(q) || false;
      const descMatch = card.description?.toLowerCase().includes(q) || false;
      const employeeMatch = employee?.name?.toLowerCase().includes(q) || false;
      const idMatch = card.id.toString() === q || `№${card.id}` === q;

      return orderNumMatch || clientNameMatch || clientPhoneMatch || addressMatch || descMatch || employeeMatch || idMatch;
    });
  }, [cards, reminderFilter, remindersMap, searchQuery, clients, employees]);

  const displayedColumns = useMemo(() => {
    if (!hideEmptyColumns) return columns;
    return columns.filter(col => {
      return filteredCards.some(c => c.statusId === col.id);
    });
  }, [columns, hideEmptyColumns, filteredCards]);

  const renderCard = (card: Order) => {
    const client = clients.find(cl => cl.id === card.clientId);
    const cName = card.clientName || client?.name || `Клиент #${card.clientId}`;
    const cPhone = card.clientPhone || client?.phone;
    const cType = card.clientType || client?.clientType;
    const isLegal = cType === 'LEGAL_ENTITY';

    const assignee = employees.find(e => e.id === card.assigneeId);
    const installer = employees.find(e => e.id === card.installedById || e.name === card.installedByName);
    const instName = card.installedByName || installer?.name;

    const cardReminders = remindersMap[card.id] || [];
    const pendingReminders = cardReminders.filter(r => r.status === 'PENDING');
    const isOverdue = pendingReminders.some(r => r.isOverdue || (parseLocalDateTime(r.remindAt)?.getTime() || 0) < Date.now());
    const isToday = pendingReminders.some(r => {
      const d = parseLocalDateTime(r.remindAt);
      return d ? d.toDateString() === new Date().toDateString() : false;
    });
    const nearestReminder = pendingReminders[0];
    const reminderTimeStr = nearestReminder ? formatTimeOnly(nearestReminder.remindAt) : '';

    const col = columns.find(c => c.id === card.statusId);
    const isCardCompleted = col ? (
      col.name.toLowerCase().includes('заверш') ||
      col.name.toLowerCase().includes('готов') ||
      col.name.toLowerCase().includes('выполнен')
    ) : false;

    const hasAct = (card.attachments || []).some(a => isActFile(a.fileName, a.isAct));
    const canComplete = Boolean(instName) && hasAct;
    const isTargetedCard = touchTargetCardId === card.id && touchDraggingCard?.id !== card.id;

    const clientNameLines = formatClientNameLines(cName);

    return (
      <div key={card.id} className="kanban-card-item-wrapper">
        {isTargetedCard && touchTargetCardPosition === 'before' && (
          <div className="kanban-card-insert-indicator top" />
        )}

        <div 
          className={`kanban-card ${isOrderDrawerOpen && activeOrderId === card.id ? 'is-active-card' : ''} ${touchDraggingCard?.id === card.id ? 'is-touch-dragging-placeholder' : ''} ${desktopDraggingCardId === card.id ? 'is-card-dragging' : ''}`}
          data-card-id={card.id}
          data-card-status-id={card.statusId}
          draggable={!isMobile}
          onDragStart={(e) => {
            if (isMobile) return;
            e.stopPropagation();
            handleDragStart(e, card.id);
          }}
          onDragEnd={() => {
            setDesktopDraggingCardId(null);
            setDesktopDragOverColId(null);
          }}
          onClick={() => {
            if (isClickAllowed()) {
              openOrder(card.id);
            }
          }}
        >
        {/* 1. Header: Avatar + Order ID + Contract # + Reminders (Left) | Contacts + Assignee (Right) */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: 1, flexWrap: 'wrap' }}>
            {/* Card Drag Grip Handle */}
            <div 
              className={`card-grip-handle ${touchDraggingCard?.id === card.id ? 'is-dragging' : ''}`}
              onPointerDown={(e) => handleGripPointerDown(e, card)}
              onTouchStart={(e) => handleGripTouchStart(e, card)}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={handleTouchCancel}
              onClick={(e) => e.stopPropagation()}
              title="Перетащить заявку"
            >
              <GripVertical size={16} />
            </div>

            {/* Client Avatar */}
            <div 
              className="card-client-avatar"
              style={{
                overflow: 'hidden',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                background: (card.clientAvatarUrl || client?.avatarUrl) ? 'transparent' : '#0047ab',
                flexShrink: 0
              }}
            >
              {(card.clientAvatarUrl || client?.avatarUrl) ? (
                <img 
                  src={(card.clientAvatarUrl || client?.avatarUrl) || ''} 
                  alt={cName} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                />
              ) : (
                isLegal ? <Building2 size={14} /> : getClientInitials(cName)
              )}
            </div>

            {/* Order ID */}
            <span className="card-order-id" style={{ flexShrink: 0 }}>
              #{card.id}
            </span>

            {/* Contract number badge */}
            {card.orderNumber && (
              <span 
                style={{
                  fontSize: '0.68rem',
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  background: 'rgba(34, 197, 94, 0.15)',
                  color: '#16a34a',
                  padding: '1px 5px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px',
                  flexShrink: 0
                }}
                title="Номер договора"
              >
                <FileText size={9} />
                № {card.orderNumber}
              </span>
            )}

            {/* Reminders badge */}
            {pendingReminders.length > 0 && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '2px',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  padding: '1px 5px',
                  borderRadius: 'var(--radius-sm)',
                  background: isOverdue ? 'rgba(239, 68, 68, 0.18)' : (isToday ? 'rgba(245, 158, 11, 0.18)' : 'rgba(59, 130, 246, 0.15)'),
                  color: isOverdue ? '#ef4444' : (isToday ? '#f59e0b' : '#60a5fa'),
                  border: isOverdue ? '1px solid rgba(239, 68, 68, 0.35)' : (isToday ? '1px solid rgba(245, 158, 11, 0.35)' : '1px solid rgba(59, 130, 246, 0.3)'),
                  cursor: 'default',
                  flexShrink: 0
                }}
                title={`Напоминание: ${nearestReminder.comment || 'Звонок'} (${reminderTimeStr})`}
              >
                <Bell size={10} />
                {pendingReminders.length > 1 ? pendingReminders.length : ''}
              </span>
            )}
          </div>

          {/* Right Header: Phone button + Messenger buttons + Assignee Avatar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            {cPhone && (
              <a
                href={`tel:${cPhone.replace(/[^\d+]/g, '')}`}
                onTouchStart={(e) => e.stopPropagation()}
                onTouchEnd={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                title={`Позвонить клиенту: ${cPhone}`}
                className="card-phone-btn"
                style={{
                  borderRadius: '50%',
                  background: 'rgba(34, 197, 94, 0.15)',
                  border: '1px solid rgba(34, 197, 94, 0.35)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#22c55e',
                  textDecoration: 'none',
                  flexShrink: 0,
                  width: '28px',
                  height: '28px',
                  transition: 'background 0.15s ease'
                }}
              >
                <Phone size={14} />
              </a>
            )}

            {client?.whatsapp && (
              <a
                href={getWhatsAppLink(client.whatsapp)}
                target="_blank"
                rel="noopener noreferrer"
                onTouchStart={(e) => e.stopPropagation()}
                onTouchEnd={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                title={`Написать в WhatsApp: ${client.whatsapp}`}
                className="card-messenger-btn whatsapp-btn"
              >
                <MessageCircle size={14} />
              </a>
            )}

            {client?.telegram && (
              <a
                href={getTelegramLink(client.telegram)}
                target="_blank"
                rel="noopener noreferrer"
                onTouchStart={(e) => e.stopPropagation()}
                onTouchEnd={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                title={`Написать в Telegram: ${client.telegram}`}
                className="card-messenger-btn telegram-btn"
              >
                <Send size={14} />
              </a>
            )}

            {assignee && (
              <div 
                className="card-assignee-avatar"
                style={{
                  borderRadius: '50%',
                  overflow: 'hidden',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  color: '#fff',
                  background: assignee.avatarUrl ? 'transparent' : '#0891b2',
                  flexShrink: 0,
                  width: '28px',
                  height: '28px'
                }}
                title={`Ответственный: ${assignee.name}`}
              >
                {assignee.avatarUrl ? (
                  <img src={assignee.avatarUrl} alt={assignee.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  getEmployeeInitials(assignee.name)
                )}
              </div>
            )}
          </div>
        </div>

        {/* 2. Client Name in up to 3 lines (No empty space if parts are missing) */}
        {clientNameLines.length > 0 && (
          <div className="card-client-name-block">
            {clientNameLines.map((line, idx) => (
              <div key={idx} className="card-client-name-line">
                {line}
              </div>
            ))}
          </div>
        )}

        {/* 2. Address Row + Maps Buttons */}
        {card.address && (
          <div style={{ marginBottom: '6px' }}>
            <div className="card-address-row">
              <MapPin size={14} style={{ flexShrink: 0, opacity: 0.8, color: 'var(--accent-primary)' }} />
              <span style={{ fontWeight: 500 }}>
                {card.address}
                {card.entrance ? `, п.${card.entrance}` : ''}
                {card.floor ? `, эт.${card.floor}` : ''}
              </span>
            </div>

            {/* Map Buttons: Яндекс & 2ГИС */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '4px', flexWrap: 'wrap' }}>
              <a
                href={getYandexMapsUrl(card.address, card.entrance, card.floor)}
                target="_blank"
                rel="noopener noreferrer"
                onTouchStart={(e) => e.stopPropagation()}
                onTouchEnd={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                title="Маршрут в Яндекс.Картах / Навигаторе"
                className="kanban-map-pill"
                style={{
                  color: '#fc3f1d',
                  borderColor: 'rgba(252, 63, 29, 0.35)',
                  background: 'rgba(252, 63, 29, 0.08)'
                }}
              >
                <span style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  background: '#fc3f1d',
                  color: '#fff',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '9px',
                  fontWeight: 800
                }}>
                  Я
                </span>
                <span style={{ fontWeight: 600 }}>Яндекс</span>
              </a>

              <a
                href={get2GisUrl(card.address, card.entrance, card.floor)}
                target="_blank"
                rel="noopener noreferrer"
                onTouchStart={(e) => e.stopPropagation()}
                onTouchEnd={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                title="Маршрут в 2ГИС"
                className="kanban-map-pill"
                style={{
                  color: '#22c55e',
                  borderColor: 'rgba(34, 197, 94, 0.35)',
                  background: 'rgba(34, 197, 94, 0.08)'
                }}
              >
                <span style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  background: '#22c55e',
                  color: '#fff',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '9px',
                  fontWeight: 800
                }}>
                  2Г
                </span>
                <span style={{ fontWeight: 600 }}>2ГИС</span>
              </a>
            </div>
          </div>
        )}

        {/* 3. Description */}
        {card.description && (
          <div className="card-desc" title={card.description}>
            {card.description}
          </div>
        )}

        {/* 4. Measurement & Installation Badges */}
        {card.measurementDate && (
          <div className="card-schedule-badge measurement">
            <Ruler size={11} />
            <span>Замер: {formatDateTimeInTimezone(card.measurementDate)}</span>
          </div>
        )}

        {card.installationDate && (
          <div className="card-schedule-badge installation">
            <Wrench size={11} />
            <span>Монтаж: {formatDateOnly(card.installationDate)}</span>
          </div>
        )}

        {/* 5. Finance / Price Block */}
        <div className="kanban-finance-box">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="card-price-main">
              {(card.totalPrice != null && card.totalPrice > 0) ? `${card.totalPrice.toLocaleString('ru-RU')} ₽` : '0 ₽'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {card.attachments && card.attachments.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  <Paperclip size={12} /> {card.attachments.length}
                </div>
              )}
              {card.profitMargin != null && card.profitMargin > 0 && (
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#16a34a' }}>
                  +{card.profitMargin.toFixed(1)}%
                </span>
              )}
            </div>
          </div>

          <div className="card-finance-sub">
            <span>Аванс: <strong style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{(card.prepayment || 0).toLocaleString('ru-RU')} ₽</strong></span>
            <span style={{ margin: '0 8px', opacity: 0.35 }}>|</span>
            <span>Остаток: <strong style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{((card.remainder != null ? card.remainder : card.totalPrice) || 0).toLocaleString('ru-RU')} ₽</strong></span>
          </div>
        </div>

        {/* 6. Installer Row */}
        {instName && (
          <div className="card-installer-row">
            <div style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              overflow: 'hidden',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.65rem',
              fontWeight: 700,
              color: '#fff',
              background: installer?.avatarUrl ? 'transparent' : '#065f46',
              flexShrink: 0
            }}>
              {installer?.avatarUrl ? (
                <img src={installer.avatarUrl} alt={instName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                getEmployeeInitials(instName)
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Wrench size={14} style={{ color: '#16a34a' }} />
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                {instName}
              </span>
            </div>
          </div>
        )}

        {/* 7. Complete Installation Button / Status */}
        {isCardCompleted ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '6px 12px',
            background: 'rgba(34, 197, 94, 0.12)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            borderRadius: '8px',
            color: '#16a34a',
            fontSize: '0.82rem',
            fontWeight: 600,
            width: '100%',
            boxSizing: 'border-box'
          }}>
            <CheckCircle2 size={14} /> Монтаж завершен {card.installedAt ? `(${formatDateOnly(card.installedAt)})` : ''}
          </div>
        ) : (
          <button
            type="button"
            disabled={!canComplete}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
            onClick={(e) => handleCompleteInstallation(e, card.id)}
            className="card-complete-btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              background: canComplete ? '#16a34a' : 'rgba(255, 255, 255, 0.08)',
              border: canComplete ? 'none' : '1px solid var(--glass-border)',
              color: canComplete ? '#ffffff' : 'var(--text-secondary)',
              fontWeight: 600,
              width: '100%',
              cursor: canComplete ? 'pointer' : 'not-allowed',
              opacity: canComplete ? 1 : 0.55,
              transition: 'all 0.15s ease',
              boxSizing: 'border-box'
            }}
            title={!instName ? 'Назначьте монтажника в карточке' : (!hasAct ? 'Прикрепите Акт выполненных работ' : 'Завершить монтаж')}
          >
            <CheckCircle2 size={15} /> Завершить монтаж
          </button>
        )}
        </div>

        {isTargetedCard && touchTargetCardPosition === 'after' && (
          <div className="kanban-card-insert-indicator bottom" />
        )}
      </div>
    );
  };

  if (loading) {
    return <div style={{ padding: 24 }}>Загрузка доски...</div>;
  }

  return (
    <div className="kanban-wrapper">
      <div className="kanban-header">
        <div className="kanban-toolbar-left">
          {/* Quick Toolbar Buttons */}
          <button
            type="button"
            onClick={() => navigate('/calendar')}
            className="kanban-toolbar-btn"
            title="Открыть календарь монтажей и замеров"
          >
            <CalendarDays size={15} style={{ color: 'var(--accent-primary)' }} />
            <span>Календарь</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const next = !hideEmptyColumns;
              setHideEmptyColumns(next);
              localStorage.setItem('kanban_hide_empty_columns', String(next));
            }}
            className={`kanban-toolbar-btn ${hideEmptyColumns ? 'active' : ''}`}
            title={hideEmptyColumns ? 'Показать все колонки статусов' : 'Скрыть колонки, в которых нет заявок'}
          >
            {hideEmptyColumns ? <Eye size={15} /> : <EyeOff size={15} />}
            <span>{hideEmptyColumns ? 'Показать все' : 'Скрыть пустые'}</span>
          </button>

          {/* Mobile View Toggle: Список | Доска */}
          {isMobile && (
            <div className="kanban-mobile-view-toggle">
              <button
                type="button"
                className={`kanban-view-mode-btn ${mobileViewMode === 'list' ? 'active' : ''}`}
                onClick={() => {
                  setMobileViewMode('list');
                  localStorage.setItem('kanban_mobile_view_mode', 'list');
                }}
              >
                Список
              </button>
              <button
                type="button"
                className={`kanban-view-mode-btn ${mobileViewMode === 'board' ? 'active' : ''}`}
                onClick={() => {
                  setMobileViewMode('board');
                  localStorage.setItem('kanban_mobile_view_mode', 'board');
                }}
              >
                Доска
              </button>
            </div>
          )}

          {/* Search Input */}
          <div className="search-input-wrapper kanban-search-wrapper">
            <Search className="search-icon" size={15} />
            <input 
              type="text" 
              placeholder="Поиск по клиенту, адресу, № договора..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
              style={{ width: '100%', paddingRight: searchQuery ? '32px' : '12px' }}
            />
            {searchQuery && (
              <button 
                type="button" 
                onClick={() => setSearchQuery('')}
                className="btn-icon"
                style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', padding: '2px', color: 'var(--text-secondary)' }}
                title="Очистить поиск"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Reminder Filter Segmented Control */}
          {!isWorker && (
            <div className="kanban-reminder-segmented">
              <button
                type="button"
                onClick={() => setReminderFilter('all')}
                className={`kanban-reminder-tab ${reminderFilter === 'all' ? 'active' : ''}`}
              >
                Все
              </button>
              <button
                type="button"
                onClick={() => setReminderFilter('today')}
                className={`kanban-reminder-tab ${reminderFilter === 'today' ? 'active-today' : ''}`}
              >
                ⏰ Сегодня
              </button>
              <button
                type="button"
                onClick={() => setReminderFilter('overdue')}
                className={`kanban-reminder-tab ${reminderFilter === 'overdue' ? 'active-overdue' : ''}`}
              >
                🔥 Просроченные
              </button>
            </div>
          )}
        </div>

        {/* Mobile-only Create Order Button */}
        {!isWorker && isMobile && (
          <button className="btn btn-primary kanban-mobile-create-btn" onClick={openCreateOrder}>
            <Plus size={17} /> {t('kanban.addOrder')}
          </button>
        )}
      </div>

      {/* Main Board Content: Mobile Accordion List vs Desktop/Mobile Horizontal Board */}
      {isMobile && mobileViewMode === 'list' ? (
        <div className="kanban-mobile-list-view" ref={boardRef}>
          {(() => {
            const allExpanded = displayedColumns.length > 0 && displayedColumns.every(col => collapsedColumns[col.id] === false);
            return (
              <div className="kanban-mobile-list-toolbar">
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  Этапы воронки ({displayedColumns.length})
                </span>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => toggleAllColumns(!allExpanded)}
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
                  {allExpanded ? (
                    <>
                      <ChevronsUp size={14} style={{ color: 'var(--accent-primary)' }} />
                      <span>Свернуть все</span>
                    </>
                  ) : (
                    <>
                      <ChevronsDown size={14} style={{ color: 'var(--accent-primary)' }} />
                      <span>Развернуть все</span>
                    </>
                  )}
                </button>
              </div>
            );
          })()}

          {displayedColumns.map(column => {
            const columnCards = filteredCards.filter(c => c.statusId === column.id);
            const isCollapsed = collapsedColumns[column.id] !== undefined ? collapsedColumns[column.id] : false;
            const columnTotal = columnCards.reduce((acc, c) => acc + (c.totalPrice || 0), 0);
            const isColDragging = draggingColId === column.id;
            const isColReorderTarget = touchTargetColId === column.id && draggingColId !== column.id;

            return (
              <div 
                key={column.id} 
                className={`kanban-mobile-accordion-column ${isCollapsed ? 'is-collapsed' : ''} ${touchTargetStatusId === column.id ? 'is-touch-drag-over' : ''} ${isColDragging ? 'is-col-dragging-placeholder' : ''} ${isColReorderTarget ? 'is-col-reorder-target' : ''}`}
                data-column-id={column.id}
              >
                <div 
                  className="kanban-mobile-accordion-header"
                  onClick={() => toggleColumnCollapse(column.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                    {!isWorker && (
                      <div 
                        className="kanban-column-grip-handle"
                        onTouchStart={(e) => handleHandleTouchStart(e, column.id)}
                        onTouchMove={handleHandleTouchMove}
                        onTouchEnd={handleHandleTouchEnd}
                        onTouchCancel={handleHandleTouchCancel}
                        onClick={(e) => e.stopPropagation()}
                        style={{ padding: '4px 2px', cursor: 'grab', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}
                        title="Перетащить статус"
                      >
                        <GripVertical size={16} />
                      </div>
                    )}
                    <span 
                      className="dot" 
                      style={{ backgroundColor: column.color || '#3b82f6', flexShrink: 0 }} 
                    />
                    <span style={{ fontWeight: 600, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {column.name}
                    </span>
                    <span className="kanban-mobile-accordion-count">
                      {columnCards.length}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    {touchDraggingCard && touchTargetStatusId === column.id && touchDraggingCard.statusId !== column.id && isCollapsed && (
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
                    {touchDraggingCard && touchTargetStatusId === column.id && (!touchTargetCardId || columnCards.length === 0) && touchDraggingCard.statusId !== column.id && (
                      <div className="kanban-touch-drop-slot">
                        <ArrowDownCircle size={17} />
                        <span>Переместить заявку #{touchDraggingCard.id} в «{column.name}»</span>
                      </div>
                    )}
                    {columnCards.length === 0 && (!touchDraggingCard || touchTargetStatusId !== column.id) ? (
                      <div className="kanban-empty-column-placeholder">
                        Нет заявок в этом статусе
                      </div>
                    ) : (
                      columnCards.map(card => renderCard(card))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div 
          className="kanban-board" 
          ref={boardRef}
          onDragOver={handleDragOver}
          onWheel={(e) => {
            if (e.deltaY !== 0 && !e.shiftKey) {
              const target = e.target as HTMLElement;
              const columnContent = target.closest('.column-content');
              if (columnContent) {
                const canScrollUp = e.deltaY < 0 && columnContent.scrollTop > 0;
                const canScrollDown = e.deltaY > 0 && columnContent.scrollTop + columnContent.clientHeight < columnContent.scrollHeight - 1;
                if (canScrollUp || canScrollDown) {
                  return;
                }
              }
              if (boardRef.current) {
                boardRef.current.scrollLeft += e.deltaY;
              }
            }
          }}
        >
          {displayedColumns.map(col => {
            const isCompleted = isCompletedColumn(col);
            let colCards = filteredCards.filter(c => c.statusId === col.id && (!isCompleted || !c.isArchived));
            if (isCompleted) {
              colCards = [...colCards].sort((a, b) => {
                const timeA = a.installedAt ? new Date(a.installedAt).getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
                const timeB = b.installedAt ? new Date(b.installedAt).getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
                return timeB - timeA;
              });
            }
            const totalInCol = isCompleted
              ? cards.filter(c => c.statusId === col.id && !c.isArchived).length
              : cards.filter(c => c.statusId === col.id).length;
            const isFilterActive = Boolean(searchQuery.trim()) || reminderFilter !== 'all';
            const countBadgeText = isFilterActive && (colCards.length !== totalInCol || colCards.length === 0)
              ? `${colCards.length}/${totalInCol}`
              : totalInCol;

            const isTouchTarget = touchTargetStatusId === col.id;
            const isDesktopTarget = desktopDragOverColId === col.id;
            const isColDragging = draggingColId === col.id;
            const isColReorderTarget = touchTargetColId === col.id && draggingColId !== col.id;

            return (
              <div 
                key={col.id} 
                data-column-id={col.id}
                className={`kanban-column glass-panel ${isTouchTarget || isDesktopTarget ? 'is-drop-target' : ''} ${isColDragging ? 'is-col-dragging-placeholder' : ''} ${isColReorderTarget ? 'is-col-reorder-target' : ''}`}
                onDrop={async (e) => {
                  e.preventDefault();
                  setDesktopDragOverColId(null);
                  setDesktopDraggingCardId(null);
                  const cardId = e.dataTransfer.getData('cardId');
                  if (cardId) {
                    handleDrop(e, col.id);
                    return;
                  }
                  const sourceColumnIdStr = e.dataTransfer.getData('columnId');
                  if (sourceColumnIdStr) {
                    const sourceId = parseInt(sourceColumnIdStr);
                    const targetId = col.id;
                    if (sourceId !== targetId) {
                      const sourceIndex = columns.findIndex(c => c.id === sourceId);
                      const targetIndex = columns.findIndex(c => c.id === targetId);
                      if (sourceIndex > -1 && targetIndex > -1) {
                        const newColumns = [...columns];
                        const [removed] = newColumns.splice(sourceIndex, 1);
                        newColumns.splice(targetIndex, 0, removed);
                        
                        newColumns.forEach((c, index) => {
                          c.sortOrder = index + 1;
                        });
                        setColumns(newColumns);
                        
                        const firstStatus = newColumns.find(s => s.sortOrder === 1);
                        if (firstStatus) {
                          setNewOrdersCount(cards.filter(o => o.statusId === firstStatus.id).length);
                        }
                        
                        try {
                          await reorderOrderStatuses(newColumns.map(c => c.id));
                        } catch (err) {
                          console.error("Failed to reorder columns", err);
                        }
                      }
                    }
                  }
                }}
                onDragOver={(e) => {
                  handleDragOver(e);
                  if (desktopDragOverColId !== col.id) {
                    setDesktopDragOverColId(col.id);
                  }
                }}
                onDragLeave={(e) => {
                  if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                  setDesktopDragOverColId(null);
                }}
              >
                <div 
                  className="column-header"
                  draggable={!isWorker && !isMobile}
                  onDragStart={(e) => {
                    if (isMobile) return;
                    e.stopPropagation();
                    e.dataTransfer.setData('columnId', col.id.toString());
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  onTouchStart={(e) => {
                    if (isMobile) return;
                    handleHandleTouchStart(e, col.id);
                  }}
                  onTouchMove={(e) => {
                    if (isMobile) return;
                    handleHandleTouchMove(e);
                  }}
                  onTouchEnd={(e) => {
                    if (isMobile) return;
                    handleHandleTouchEnd(e);
                  }}
                  onTouchCancel={() => {
                    if (isMobile) return;
                    handleHandleTouchCancel();
                  }}
                  style={{ cursor: !isWorker && !isMobile ? 'grab' : 'default' }}
                >
                  <div className="column-title">
                    <span 
                      className="dot" 
                      style={{ backgroundColor: col.color || '#3b82f6' }} 
                    />
                    <h3>{col.name}</h3>
                    <span 
                      className="count"
                      style={
                        reminderFilter === 'today' && colCards.length > 0
                          ? { background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', fontWeight: 700 }
                          : reminderFilter === 'overdue' && colCards.length > 0
                          ? { background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', fontWeight: 700 }
                          : undefined
                      }
                    >
                      {countBadgeText}
                    </span>
                  </div>

                  {!isWorker && (
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                      <button 
                        className="btn-icon" 
                        onClick={() => openColumnEditModal(col)}
                        title="Редактировать колонку"
                      >
                        <Edit2 size={16} />
                      </button>
                      {totalInCol === 0 && (
                        <button 
                          className="btn-icon" 
                          onClick={() => handleDeleteColumn(col.id)}
                          title="Удалить колонку"
                        >
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

          {/* Add Column Button for Owner/Manager */}
          {!isWorker && (
            <div className="kanban-add-column-wrapper">
              <button 
                type="button" 
                className="btn btn-secondary kanban-add-column-btn"
                onClick={openColumnAddModal}
              >
                <Plus size={16} /> Добавить колонку
              </button>
            </div>
          )}
        </div>
      )}

      {/* Column Create / Edit Modal */}
      <ColumnModal
        isOpen={isColumnModalOpen}
        editingColumnId={editingColumnId}
        columnName={newColumnName}
        setColumnName={setNewColumnName}
        columnColor={newColumnColor}
        setColumnColor={setNewColumnColor}
        includeInFinances={newColumnIncludeInFinances}
        setIncludeInFinances={setNewColumnIncludeInFinances}
        isCompleted={newColumnIsCompleted}
        setIsCompleted={setNewColumnIsCompleted}
        onClose={() => setIsColumnModalOpen(false)}
        onSubmit={handleSaveColumn}
      />

      {/* Move Restriction / Act Required Modal */}
      <MoveRestrictionModal
        data={moveRestrictionModal}
        onClose={() => setMoveRestrictionModal(null)}
        onOpenOrderFiles={(orderIdToOpen) => {
          setMoveRestrictionModal(null);
          openOrder(orderIdToOpen, 'FILES');
        }}
      />

      {/* Touch Card Drag Ghost Portal */}
      {touchDraggingCard && touchDragPosition && touchGhostData && createPortal(
        <div 
          className="kanban-touch-drag-ghost"
          style={{
            left: `${touchDragPosition.x - touchGhostData.offsetX}px`,
            top: `${touchDragPosition.y - touchGhostData.offsetY}px`,
            width: `${touchGhostData.width}px`
          }}
        >
          <div style={{ padding: '12px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="card-order-id">#{touchDraggingCard.id}</span>
                <span className="card-client-name">{touchDraggingCard.clientName || 'Заявка'}</span>
              </div>
            </div>
            {touchDraggingCard.address && (
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {touchDraggingCard.address}
              </div>
            )}
            {touchDraggingCard.totalPrice && (
              <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#16a34a' }}>
                {touchDraggingCard.totalPrice.toLocaleString('ru-RU')} ₽
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Touch Column Drag Ghost Portal */}
      {draggingColId && colDragPosition && (() => {
        const draggingCol = columns.find(c => c.id === draggingColId);
        if (!draggingCol) return null;
        return createPortal(
          <div
            className="kanban-column-drag-ghost"
            style={{
              left: `${colDragPosition.x - 60}px`,
              top: `${colDragPosition.y - 25}px`,
              minWidth: '220px'
            }}
          >
            <GripVertical size={18} style={{ color: 'var(--accent-primary)' }} />
            <span className="dot" style={{ backgroundColor: draggingCol.color || '#3b82f6' }} />
            <span style={{ fontWeight: 600, fontSize: '0.92rem' }}>{draggingCol.name}</span>
          </div>,
          document.body
        );
      })()}
    </div>
  );
};

export default Kanban;
