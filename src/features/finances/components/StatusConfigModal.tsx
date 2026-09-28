import { createPortal } from 'react-dom';
import { Check, SlidersHorizontal, X } from 'lucide-react';
import type { Order, OrderStatus } from '../../../api/kanban';

interface StatusConfigModalProps {
  statuses: OrderStatus[];
  /** Все заказы — для счетчика заявок в каждом статусе. */
  orders: Order[];
  settings: Record<number, boolean>;
  saving: boolean;
  onToggle: (statusId: number, included: boolean) => void;
  onSetAll: (included: boolean) => void;
  onSave: () => void;
  onClose: () => void;
}

const bulkButtonStyle = {
  fontSize: '0.78rem',
  padding: '5px 12px',
  borderRadius: 'var(--radius-sm)',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid var(--glass-border)',
  cursor: 'pointer'
} as const;

/** Модальное окно выбора статусов, заявки из которых учитываются в финансах. */
export const StatusConfigModal = ({ statuses, orders, settings, saving, onToggle, onSetAll, onSave, onClose }: StatusConfigModalProps) =>
  createPortal(
    <div className="modal-overlay" onClick={() => !saving && onClose()}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px', width: '95%' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <SlidersHorizontal size={20} style={{ color: 'var(--accent-primary)' }} />
            <h2 style={{ margin: 0, fontSize: '1.15rem' }}>Статусы, учитываемые в финансах</h2>
          </div>
          <button type="button" onClick={onClose} className="btn-icon" aria-label="Close" disabled={saving}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body" style={{ padding: '16px 20px' }}>
          <p style={{ margin: '0 0 16px 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Отметьте этапы и статусы воронки, заявки из которых должны формировать кассу, выручку, дебиторку и финансовые отчеты (P&L):
          </p>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
            <button type="button" onClick={() => onSetAll(true)} style={{ ...bulkButtonStyle, color: 'var(--text-primary)' }}>
              Выбрать все
            </button>
            <button type="button" onClick={() => onSetAll(false)} style={{ ...bulkButtonStyle, color: 'var(--text-secondary)' }}>
              Снять все
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '360px', overflowY: 'auto' }}>
            {statuses.map(st => {
              const isChecked = settings[st.id] !== false;
              const count = orders.filter(o => o.statusId === st.id).length;

              return (
                <label
                  key={st.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-sm)',
                    background: isChecked ? 'rgba(59, 130, 246, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                    border: isChecked ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid var(--glass-border)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: st.color || '#3b82f6', flexShrink: 0 }} />
                    <span style={{ fontWeight: 600, fontSize: '0.9rem', color: isChecked ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                      {st.name}
                    </span>
                    <span style={{
                      fontSize: '0.75rem',
                      color: 'var(--text-secondary)',
                      background: 'rgba(255, 255, 255, 0.06)',
                      padding: '2px 7px',
                      borderRadius: '8px'
                    }}>
                      {count} заявок
                    </span>
                  </div>

                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => onToggle(st.id, e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                  />
                </label>
              );
            })}
          </div>
        </div>

        <div className="modal-actions" style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button type="button" onClick={onClose} className="btn btn-ghost" disabled={saving}>
            Отмена
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Check size={16} /> {saving ? 'Сохранение...' : 'Применить и сохранить'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
