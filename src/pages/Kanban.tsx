import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Plus,
  MoreVertical,
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
  FileCheck,
  CheckCircle2,
  CalendarDays,
  Bell,
  Eye,
  EyeOff
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  getOrderStatuses,
  getOrders,
  moveOrder,
  completeOrder,
  createOrderStatus,
  updateOrderStatus,
  reorderOrderStatuses,
  type OrderStatus,
  type Order
} from '../api/kanban';
import { getClients, type Client } from '../api/clients';
import { getClientInitials, getEmployeeInitials } from '../utils/avatarUtils';
import { getEmployees, type Employee } from '../api/employees';
import { useAppStore } from '../store/useAppStore';
import { useAuthStore } from '../store/useAuthStore';
import { formatDateTimeInTimezone, formatDateOnly } from '../utils/dateUtils';
import { useNavigate } from 'react-router-dom';
import { getMyReminders, type OrderReminderDto } from '../api/reminders';
import { useTouchKanbanDrag } from '../hooks/useTouchKanbanDrag';
import { useTouchColumnReorder } from '../hooks/useTouchColumnReorder';
import { getWhatsAppLink, getTelegramLink } from '../utils/messengerUtils';
import { MoveRestrictionModal } from '../features/kanban/components/MoveRestrictionModal';
import { ColumnModal } from '../features/kanban/components/ColumnModal';
import { isActFile } from '../features/kanban/constants';
import { useOrderDrawerStore } from '../store/useOrderDrawerStore';
import '../styles/kanban.css';

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
      setCards(activeOrders);
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
      alert(errorMsg);
      fetchData();
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const {
    draggingCard: touchDraggingCard,
    targetStatusId: touchTargetStatusId,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleTouchCancel,
    isClickAllowed
  } = useTouchKanbanDrag({
    boardRef,
    onDropCard: async (cardId, targetId) => {
      const card = cards.find(c => c.id === cardId);
      if (!card || card.statusId === targetId) return;

      if (!checkCanMoveOrder(cardId, targetId)) {
        return;
      }

      const updatedCards = cards.map(c => c.id === cardId ? { ...c, statusId: targetId } : c);
      setCards(updatedCards);
      const firstStatus = columns.find(s => s.sortOrder === 1);
      if (firstStatus) {
        setNewOrdersCount(updatedCards.filter(o => o.statusId === firstStatus.id).length);
      }
      try {
        await moveOrder(cardId, targetId);
        window.dispatchEvent(new CustomEvent('alta:orders-changed', { detail: { action: 'move', orderId: cardId } }));
      } catch (err: any) {
        console.error("Failed to move order via touch drag", err);
        const errorMsg = err.response?.data?.message || err.message || 'Ошибка перемещения карточки';
        alert(errorMsg);
        fetchData();
      }
    },
    onCardClick: (card) => {
      openOrder(card.id);
    },
    longPressDelay: 500
  });

  const {
    draggingColId,
    targetColId: touchTargetColId,
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

  const handleCompleteInstallation = async (e: React.MouseEvent, orderId: number) => {
    e.stopPropagation();
    const card = cards.find(c => c.id === orderId);
    const hasAct = (card?.attachments || []).some(a => isActFile(a.fileName, a.isAct));
    if (!hasAct) {
      alert('Для завершения монтажа необходимо прикрепить «Акт выполненных работ» во вкладке «Файлы».');
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
      fetchData();
      window.dispatchEvent(new CustomEvent('alta:orders-changed', { detail: { action: 'complete', orderId } }));
    } catch (err: any) {
      console.error('Failed to complete installation', err);
      alert(err.response?.data?.message || err.message || 'Не удалось перевести заявку в завершенный статус');
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
      } else {
        await createOrderStatus({
          name: newColumnName,
          color: newColumnColor,
          sortOrder: columns.length + 1,
          includeInFinances: newColumnIncludeInFinances,
          isCompleted: newColumnIsCompleted
        });
      }
      setIsColumnModalOpen(false);
      setEditingColumnId(null);
      setNewColumnName('');
      setNewColumnColor('#3b82f6');
      setNewColumnIncludeInFinances(true);
      setNewColumnIsCompleted(false);
      fetchData();
    } catch (err) {
      console.error("Failed to save column", err);
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

  const filteredCards = useMemo(() => {
    let result = cards.filter(c => !c.isArchived);

    if (reminderFilter !== 'all') {
      result = result.filter(card => {
        const cardRems = remindersMap[card.id] || [];
        const pending = cardRems.filter(r => r.status === 'PENDING');
        if (pending.length === 0) return false;
        if (reminderFilter === 'overdue') {
          return pending.some(r => r.isOverdue);
        }
        if (reminderFilter === 'today') {
          return pending.some(r => {
            const d = new Date(r.remindAt);
            return d.toDateString() === new Date().toDateString();
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
    const isOverdue = pendingReminders.some(r => r.isOverdue);
    const isToday = pendingReminders.some(r => {
      const d = new Date(r.remindAt);
      return d.toDateString() === new Date().toDateString();
    });
    const nearestReminder = pendingReminders[0];
    const reminderTimeStr = nearestReminder ? new Date(nearestReminder.remindAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '';

    const col = columns.find(c => c.id === card.statusId);
    const isCardCompleted = col ? (
      col.name.toLowerCase().includes('заверш') ||
      col.name.toLowerCase().includes('готов') ||
      col.name.toLowerCase().includes('выполнен')
    ) : false;

    const hasAct = (card.attachments || []).some(a => isActFile(a.fileName, a.isAct));
    const canComplete = Boolean(instName) && hasAct;

    return (
      <div 
        key={card.id} 
        className={`kanban-card ${isOrderDrawerOpen && activeOrderId === card.id ? 'is-active-card' : ''} ${touchDraggingCard?.id === card.id ? 'is-touch-dragging-placeholder' : ''} ${desktopDraggingCardId === card.id ? 'is-card-dragging' : ''}`}
        draggable
        onDragStart={(e) => {
          e.stopPropagation();
          handleDragStart(e, card.id);
        }}
        onDragEnd={() => {
          setDesktopDraggingCardId(null);
          setDesktopDragOverColId(null);
        }}
        onTouchStart={(e) => handleTouchStart(e, card)}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
        onClick={() => {
          if (isClickAllowed()) {
            openOrder(card.id);
          }
        }}
      >
        {/* Header: Client Avatar + #ID + Client Name */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '6px', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', minWidth: 0, flex: 1 }}>
            <div 
              className="card-client-avatar"
              style={{
                overflow: 'hidden',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                background: (card.clientAvatarUrl || client?.avatarUrl) ? 'transparent' : '#0047ab',
                flexShrink: 0,
                marginTop: '1px'
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

            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px', flexWrap: 'wrap' }}>
                <span className="card-order-id" style={{ flexShrink: 0 }}>
                  #{card.id}
                </span>
                <span className="card-client-name">
                  {cName}
                </span>
              </div>

              {(card.orderNumber || pendingReminders.length > 0) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                  {card.orderNumber && (
                    <span 
                      style={{
                        fontSize: '0.68rem',
                        fontFamily: 'monospace',
                        padding: '1px 5px',
                        background: 'rgba(59, 130, 246, 0.12)',
                        border: '1px solid rgba(59, 130, 246, 0.25)',
                        borderRadius: '4px',
                        color: 'var(--accent-primary)',
                        fontWeight: 600
                      }}
                      title="Номер договора"
                    >
                      № {card.orderNumber}
                    </span>
                  )}

                  {pendingReminders.length > 0 && (
                    <span
                      style={{
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        padding: '1px 6px',
                        borderRadius: '10px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px',
                        background: isOverdue ? 'rgba(239, 68, 68, 0.2)' : (isToday ? 'rgba(245, 158, 11, 0.2)' : 'rgba(59, 130, 246, 0.15)'),
                        color: isOverdue ? '#ef4444' : (isToday ? '#f59e0b' : '#3b82f6'),
                        border: `1px solid ${isOverdue ? 'rgba(239, 68, 68, 0.4)' : (isToday ? 'rgba(245, 158, 11, 0.4)' : 'rgba(59, 130, 246, 0.3)')}`
                      }}
                    >
                      <Bell size={10} />
                      {isOverdue ? 'Просрочено' : (isToday ? `Сегодня ${reminderTimeStr}` : `Напоминание (${pendingReminders.length})`)}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
            {cPhone && (
              <a 
                href={`tel:${cPhone}`}
                onClick={(e) => e.stopPropagation()}
                className="btn-icon"
                style={{ padding: '3px', color: 'var(--accent-primary)', background: 'var(--accent-glow)', borderRadius: '50%' }}
                title={`Позвонить ${cPhone}`}
              >
                <Phone size={13} />
              </a>
            )}
            {assignee && (
              <div 
                className="card-assignee-avatar"
                style={{ 
                  overflow: 'hidden',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  background: (card.assigneeAvatarUrl || assignee.avatarUrl) ? 'transparent' : '#3b82f6'
                }}
                title={`Ответственный: ${assignee.name}`}
              >
                {(card.assigneeAvatarUrl || assignee.avatarUrl) ? (
                  <img 
                    src={(card.assigneeAvatarUrl || assignee.avatarUrl) || ''} 
                    alt={assignee.name} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                  />
                ) : (
                  getEmployeeInitials(assignee.name)
                )}
              </div>
            )}
          </div>
        </div>

        {/* Messengers Row */}
        {(client?.whatsapp || client?.telegram) && (
          <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }} onClick={(e) => e.stopPropagation()}>
            {client.whatsapp && (
              <a
                href={getWhatsAppLink(client.whatsapp, `Здравствуйте, ${cName}! По поводу заявки #${card.id}`)}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: '0.72rem',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  background: 'rgba(37, 211, 102, 0.15)',
                  color: '#25D366',
                  border: '1px solid rgba(37, 211, 102, 0.3)',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                WhatsApp
              </a>
            )}
            {client.telegram && (
              <a
                href={getTelegramLink(client.telegram)}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: '0.72rem',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  background: 'rgba(0, 136, 204, 0.15)',
                  color: '#0088cc',
                  border: '1px solid rgba(0, 136, 204, 0.3)',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                Telegram
              </a>
            )}
          </div>
        )}

        {/* Address */}
        {card.address && (
          <div className="card-address" style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '5px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            <MapPin size={13} style={{ flexShrink: 0, color: 'var(--accent-primary)' }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
              {card.address}
              {(card.entrance || card.floor) && (
                <span style={{ opacity: 0.8, marginLeft: '4px' }}>
                  ({[card.entrance && `под. ${card.entrance}`, card.floor && `эт. ${card.floor}`].filter(Boolean).join(', ')})
                </span>
              )}
            </span>
          </div>
        )}

        {/* Description */}
        {card.description && (
          <div className="card-description" style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '6px', lineHeight: '1.3' }}>
            {card.description}
          </div>
        )}

        {/* Measurer & Installer tags */}
        {(card.measurerName || instName) && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '6px' }}>
            {card.measurerName && (
              <span className="card-role-tag" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.72rem', padding: '1px 6px', borderRadius: '4px', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-primary)' }}>
                <Ruler size={11} /> {card.measurerName}
              </span>
            )}
            {instName && (
              <span className="card-role-tag" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.72rem', padding: '1px 6px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                <Wrench size={11} /> {instName}
              </span>
            )}
          </div>
        )}

        {/* Dates row */}
        {(card.measurementDate || card.installationDate) && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '6px', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
            {card.measurementDate && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                <CalendarDays size={11} style={{ color: 'var(--accent-primary)' }} />
                <span>Замер: {formatDateTimeInTimezone(card.measurementDate)}</span>
              </div>
            )}
            {card.installationDate && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                <CalendarDays size={11} style={{ color: '#10b981' }} />
                <span>Монтаж: {formatDateOnly(card.installationDate)}</span>
              </div>
            )}
          </div>
        )}

        {/* Footer: Price & Attachments */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '6px', borderTop: '1px solid var(--glass-border)', marginTop: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {(card.totalPrice || 0).toLocaleString('ru-RU')} ₽
            </span>
            {card.prepayment != null && card.prepayment > 0 && (
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                (аванс {card.prepayment.toLocaleString('ru-RU')})
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {(card.attachments?.length || 0) > 0 && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', fontSize: '0.72rem', color: hasAct ? '#22c55e' : 'var(--text-secondary)', fontWeight: hasAct ? 600 : 400 }}>
                {hasAct ? <FileCheck size={13} /> : <Paperclip size={13} />}
                {card.attachments?.length}
              </span>
            )}

            {!isCardCompleted && (
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '2px 6px', fontSize: '0.7rem', height: '22px', gap: '3px', color: canComplete ? '#10b981' : undefined }}
                onClick={(e) => handleCompleteInstallation(e, card.id)}
                title={canComplete ? 'Завершить монтаж и закрыть заявку' : 'Прикрепите Акт для завершения'}
              >
                <CheckCircle2 size={12} /> Завершить
              </button>
            )}
          </div>
        </div>
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

            return (
              <div 
                key={column.id} 
                className={`kanban-mobile-accordion-column ${isCollapsed ? 'is-collapsed' : ''} ${touchTargetStatusId === column.id ? 'is-touch-drag-over' : ''}`}
                data-column-id={column.id}
              >
                <div 
                  className="kanban-mobile-accordion-header"
                  onClick={() => toggleColumnCollapse(column.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
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
                    {columnCards.length === 0 ? (
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
        >
          {displayedColumns.map(column => {
            const columnCards = filteredCards.filter(c => c.statusId === column.id);
            const columnTotal = columnCards.reduce((acc, c) => acc + (c.totalPrice || 0), 0);
            const isTouchTarget = touchTargetStatusId === column.id;
            const isDesktopTarget = desktopDragOverColId === column.id;
            const isColDragging = draggingColId === column.id;
            const isColReorderTarget = touchTargetColId === column.id && draggingColId !== column.id;

            return (
              <div 
                key={column.id} 
                className={`kanban-column ${isTouchTarget || isDesktopTarget ? 'is-drag-over' : ''} ${isColDragging ? 'is-col-dragging-placeholder' : ''} ${isColReorderTarget ? 'is-col-reorder-target' : ''}`}
                data-column-id={column.id}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDesktopDragOverColId(column.id);
                }}
                onDragLeave={() => {
                  if (desktopDragOverColId === column.id) {
                    setDesktopDragOverColId(null);
                  }
                }}
                onDrop={(e) => handleDrop(e, column.id)}
              >
                <div 
                  className="kanban-column-header"
                  onTouchStart={(e) => handleHandleTouchStart(e, column.id)}
                  onTouchMove={handleHandleTouchMove}
                  onTouchEnd={handleHandleTouchEnd}
                  onTouchCancel={handleHandleTouchCancel}
                >
                  <div className="column-title">
                    <span 
                      className="dot" 
                      style={{ backgroundColor: column.color || '#3b82f6' }} 
                    />
                    <span>{column.name}</span>
                    <span className="count-badge">{columnCards.length}</span>
                  </div>

                  <div className="column-header-actions">
                    <span className="column-total-price">
                      {columnTotal.toLocaleString('ru-RU')} ₽
                    </span>
                    {!isWorker && (
                      <div className="dropdown" style={{ position: 'relative' }}>
                        <button 
                          className="btn-icon" 
                          onClick={() => openColumnEditModal(column)}
                          title="Редактировать колонку"
                        >
                          <MoreVertical size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="kanban-cards">
                  {columnCards.map(card => renderCard(card))}
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
    </div>
  );
};

export default Kanban;
