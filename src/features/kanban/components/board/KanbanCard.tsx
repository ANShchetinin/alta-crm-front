import type { DragEvent, MouseEvent, PointerEvent, TouchEvent } from 'react';
import { Building2, GripVertical, MessageSquare, Paperclip } from 'lucide-react';
import type { Order, OrderStatus } from '../../../../api/kanban';
import type { Client } from '../../../../api/clients';
import type { Employee } from '../../../../api/employees';
import type { OrderReminderDto } from '../../../../api/reminders';
import { getClientInitials } from '../../../../utils/avatarUtils';
import { isCompletedStatus } from '../../../../utils/orderStatus';
import { formatClientNameLines, isActFile } from '../../constants';
import { reminderStateOf, type CardDropPosition } from '../../utils/board';
import {
  CardAddress,
  CardCompletion,
  CardContacts,
  CardInstaller,
  CardSchedule,
  ContractNumberBadge,
  RemindersBadge
} from './CardParts';
import { stopCardGesture } from './cardGestures';

/** Состояние и обработчики перетаскивания карточки (мышью на десктопе, пальцем за ручку на телефоне). */
export interface CardDragBindings {
  isMobile: boolean;
  activeOrderId: number | null;
  desktopDraggingCardId: number | null;
  touchDraggingCardId: number | null;
  touchTargetCardId: number | null;
  touchTargetPosition: CardDropPosition | null;
  onDesktopDragStart: (e: DragEvent, cardId: number) => void;
  onDesktopDragEnd: () => void;
  onGripPointerDown: (e: PointerEvent, card: Order) => void;
  onGripTouchStart: (e: TouchEvent, card: Order) => void;
  onTouchMove: (e: TouchEvent) => void;
  onTouchEnd: (e: TouchEvent) => void;
  onTouchCancel: () => void;
  isClickAllowed: () => boolean;
}

interface KanbanCardProps {
  card: Order;
  clients: Client[];
  employees: Employee[];
  columns: OrderStatus[];
  reminders?: OrderReminderDto[];
  drag: CardDragBindings;
  onOpen: (orderId: number) => void;
  onOpenComments: (orderId: number) => void;
  onComplete: (e: MouseEvent, orderId: number) => void;
}

/** Карточка заявки на доске и в мобильном списке. */
export const KanbanCard = ({ card, clients, employees, columns, reminders, drag, onOpen, onOpenComments, onComplete }: KanbanCardProps) => {
  const client = clients.find(cl => cl.id === card.clientId);
  const clientName = card.clientName || client?.name || `Клиент #${card.clientId}`;
  const avatarUrl = card.clientAvatarUrl || client?.avatarUrl;
  const isLegal = (card.clientType || client?.clientType) === 'LEGAL_ENTITY';

  const assignee = employees.find(e => e.id === card.assigneeId);
  const installers = card.installers && card.installers.length > 0 ? card.installers : [];
  const leadInstaller = installers.find(i => i.isLead) || installers[0];
  const installerEmployee = employees.find(e =>
    e.id === (leadInstaller?.employeeId || card.installedById) || e.name === (leadInstaller?.employeeName || card.installedByName));
  const installerName = leadInstaller?.employeeName || card.installedByName || installerEmployee?.name;
  const installerAvatarUrl = leadInstaller?.employeeAvatarUrl || card.installedByAvatarUrl || installerEmployee?.avatarUrl;

  const reminderState = reminderStateOf(reminders);
  const isCompleted = isCompletedStatus(columns.find(c => c.id === card.statusId));
  const hasAct = (card.attachments || []).some(a => isActFile(a.fileName, a.isAct));
  const isTouchTarget = drag.touchTargetCardId === card.id && drag.touchDraggingCardId !== card.id;
  const clientNameLines = formatClientNameLines(clientName);

  const cardClassName = [
    'kanban-card',
    drag.activeOrderId === card.id ? 'is-active-card' : '',
    drag.touchDraggingCardId === card.id ? 'is-touch-dragging-placeholder' : '',
    drag.desktopDraggingCardId === card.id ? 'is-card-dragging' : ''
  ].join(' ');

  return (
    <div className="kanban-card-item-wrapper">
      {isTouchTarget && drag.touchTargetPosition === 'before' && <div className="kanban-card-insert-indicator top" />}

      <div
        className={cardClassName}
        data-card-id={card.id}
        data-card-status-id={card.statusId}
        draggable={!drag.isMobile}
        onDragStart={(e) => {
          if (drag.isMobile) {
            return;
          }
          e.stopPropagation();
          drag.onDesktopDragStart(e, card.id);
        }}
        onDragEnd={drag.onDesktopDragEnd}
        onClick={() => {
          if (drag.isClickAllowed()) {
            onOpen(card.id);
          }
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: 1, flexWrap: 'wrap' }}>
            <div
              className={`card-grip-handle ${drag.touchDraggingCardId === card.id ? 'is-dragging' : ''}`}
              onPointerDown={(e) => drag.onGripPointerDown(e, card)}
              onTouchStart={(e) => drag.onGripTouchStart(e, card)}
              onTouchMove={drag.onTouchMove}
              onTouchEnd={drag.onTouchEnd}
              onTouchCancel={drag.onTouchCancel}
              onClick={(e) => e.stopPropagation()}
              title="Перетащить заявку"
            >
              <GripVertical size={16} />
            </div>

            <div
              className="card-client-avatar"
              style={{
                overflow: 'hidden',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                background: avatarUrl ? 'transparent' : '#0047ab',
                flexShrink: 0
              }}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt={clientName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                isLegal ? <Building2 size={14} /> : getClientInitials(clientName)
              )}
            </div>

            <span className="card-order-id" style={{ flexShrink: 0 }}>#{card.id}</span>
            {card.orderNumber && <ContractNumberBadge orderNumber={card.orderNumber} />}
            <RemindersBadge {...reminderState} />
          </div>

          <CardContacts
            phone={card.clientPhone || client?.phone}
            whatsapp={client?.whatsapp}
            telegram={client?.telegram}
            assignee={assignee}
          />
        </div>

        {clientNameLines.length > 0 && (
          <div className="card-client-name-block">
            {clientNameLines.map((line, idx) => (
              <div key={idx} className="card-client-name-line">{line}</div>
            ))}
          </div>
        )}

        <CardAddress card={card} />

        {card.description && (
          <div className="card-desc" title={card.description}>{card.description}</div>
        )}

        <CardSchedule card={card} />

        <div className="kanban-finance-box">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="card-price-main">
              {card.totalPrice != null && card.totalPrice > 0 ? `${card.totalPrice.toLocaleString('ru-RU')} ₽` : '0 ₽'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {card.attachments && card.attachments.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  <Paperclip size={12} /> {card.attachments.length}
                </div>
              )}
              {card.commentsCount != null && card.commentsCount > 0 && (
                <button
                  type="button"
                  onTouchStart={stopCardGesture.onTouchStart}
                  onTouchEnd={stopCardGesture.onTouchEnd}
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenComments(card.id);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px',
                    fontSize: '0.8rem',
                    color: 'var(--text-secondary)',
                    background: 'none',
                    border: 'none',
                    padding: '0 2px',
                    cursor: 'pointer'
                  }}
                  title={`Комментарии (${card.commentsCount})`}
                >
                  <MessageSquare size={12} /> {card.commentsCount}
                </button>
              )}
              {card.profitMargin != null && card.profitMargin > 0 && (
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#16a34a' }}>+{card.profitMargin.toFixed(1)}%</span>
              )}
            </div>
          </div>

          <div className="card-finance-sub">
            <span>Аванс: <strong style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{(card.prepayment || 0).toLocaleString('ru-RU')} ₽</strong></span>
            <span style={{ margin: '0 8px', opacity: 0.35 }}>|</span>
            <span>
              Остаток: <strong style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
                {((card.remainder != null ? card.remainder : card.totalPrice) || 0).toLocaleString('ru-RU')} ₽
              </strong>
            </span>
          </div>
        </div>

        {installerName && <CardInstaller name={installerName} avatarUrl={installerAvatarUrl ?? undefined} installers={installers} />}

        <CardCompletion
          isCompleted={isCompleted}
          installedAt={card.installedAt}
          installerName={installerName}
          hasAct={hasAct}
          onComplete={(e) => onComplete(e, card.id)}
        />
      </div>

      {isTouchTarget && drag.touchTargetPosition === 'after' && <div className="kanban-card-insert-indicator bottom" />}
    </div>
  );
};
