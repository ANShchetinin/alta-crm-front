import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import type { AppNotificationItem } from '../../api/notifications';
import { useAppStore } from '../../store/useAppStore';
import { useOrderDrawerStore } from '../../store/useOrderDrawerStore';
import { formatTimeAgo } from '../../utils/dateUtils';
import { useClickOutside } from './hooks/useClickOutside';
import { useRecentNotifications } from './hooks/useRecentNotifications';
import { getNotificationTarget } from './notificationTarget';

interface NotificationsMenuProps {
  enabled: boolean;
  /** Показывать заканчивающиеся материалы склада (монтажнику не показываются). */
  showLowStock: boolean;
  onOpenPushSettings: () => void;
}

const NotificationCard = ({ notification, onClick }: { notification: AppNotificationItem; onClick: () => void }) => {
  const timezone = useAppStore(state => state.tenantSettings?.timezone);
  const { isRead } = notification;
  return (
    <div onClick={onClick} className={`notification-item-card ${!isRead ? 'unread' : ''}`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '6px' }}>
        <div
          style={{
            fontWeight: isRead ? 500 : 700,
            fontSize: '0.83rem',
            color: isRead ? 'var(--text-primary)' : 'var(--accent-primary)',
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}
        >
          {!isRead && (
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: 'var(--accent-primary)',
                display: 'inline-block',
                flexShrink: 0
              }}
            />
          )}
          {notification.title}
        </div>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
          {formatTimeAgo(notification.createdAt, timezone)}
        </span>
      </div>
      <div style={{ fontSize: '0.77rem', color: 'var(--text-secondary)', lineHeight: 1.35, whiteSpace: 'pre-wrap' }}>
        {notification.body}
      </div>
    </div>
  );
};

const LowStockList = () => {
  const lowStockMaterials = useAppStore(state => state.lowStockMaterials);
  return (
    <div style={{ marginTop: '6px', paddingTop: '8px', borderTop: '1px solid var(--glass-border)' }}>
      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#f59e0b', marginBottom: '6px' }}>
        ⚠️ Заканчивающиеся материалы:
      </div>
      {lowStockMaterials.map(m => (
        <div key={m.id} className="notification-item" style={{ fontSize: '0.76rem', padding: '6px 8px', marginBottom: '4px' }}>
          <strong>{m.name}</strong>: остаток {m.quantityInStock} {m.unit} (мин: {m.minQuantity})
        </div>
      ))}
    </div>
  );
};

/** Колокольчик в верхней панели: уведомления за сутки и заканчивающиеся материалы. */
export const NotificationsMenu = ({ enabled, showLowStock, onOpenPushSettings }: NotificationsMenuProps) => {
  const navigate = useNavigate();
  const lowStockMaterials = useAppStore(state => state.lowStockMaterials);
  const { notifications, unreadCount, markRead, markAllRead } = useRecentNotifications(enabled);
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useClickOutside(menuRef, () => setIsOpen(false));

  const hasLowStock = showLowStock && lowStockMaterials.length > 0;
  const badgeCount = unreadCount + (showLowStock ? lowStockMaterials.length : 0);

  const handleNotificationClick = async (notification: AppNotificationItem) => {
    await markRead(notification);
    setIsOpen(false);
    const target = getNotificationTarget(notification);
    if (target.kind === 'order') {
      useOrderDrawerStore.getState().openOrder(target.orderId);
    } else {
      navigate(target.url);
    }
  };

  return (
    <div ref={menuRef} style={{ position: 'relative' }}>
      <button type="button" className="btn-icon" onClick={() => setIsOpen(!isOpen)} title="Уведомления">
        <Bell size={18} />
        {badgeCount > 0 && <span className="notification-badge" />}
      </button>
      {isOpen && (
        <div className="notifications-dropdown" style={{ right: 0, left: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h4 style={{ margin: 0, fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Bell size={15} style={{ color: 'var(--accent-primary)' }} /> Уведомления за 24 ч
            </h4>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent-primary)',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  padding: 0,
                  fontWeight: 600
                }}
              >
                Прочитать все
              </button>
            )}
          </div>

          {notifications.length === 0 && lowStockMaterials.length === 0 ? (
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', textAlign: 'center', padding: '24px 0' }}>
              За последние сутки новых уведомлений нет
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {notifications.map(n => (
                <NotificationCard key={n.id} notification={n} onClick={() => handleNotificationClick(n)} />
              ))}
              {hasLowStock && <LowStockList />}
            </div>
          )}

          <div
            style={{
              marginTop: '10px',
              paddingTop: '8px',
              borderTop: '1px solid var(--glass-border)',
              display: 'flex',
              justifyContent: 'center'
            }}
          >
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onOpenPushSettings();
              }}
              className="btn btn-ghost"
              style={{ fontSize: '0.78rem', color: 'var(--accent-primary)', padding: '4px 8px', width: '100%', justifyContent: 'center' }}
            >
              ⚙️ Настройка Push-уведомлений
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
