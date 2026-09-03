import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export interface ColumnModalProps {
  isOpen: boolean;
  editingColumnId: number | null;
  columnName: string;
  setColumnName: (name: string) => void;
  columnColor: string;
  setColumnColor: (color: string) => void;
  includeInFinances: boolean;
  setIncludeInFinances: (include: boolean) => void;
  isCompleted: boolean;
  setIsCompleted: (completed: boolean) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

const PRESET_COLORS = [
  '#3b82f6', '#06b6d4', '#10b981', '#22c55e', '#84cc16', '#eab308', '#f97316',
  '#ef4444', '#f43f5e', '#ec4899', '#a855f7', '#8b5cf6', '#6366f1', '#64748b'
];

export const ColumnModal: React.FC<ColumnModalProps> = ({
  isOpen,
  editingColumnId,
  columnName,
  setColumnName,
  columnColor,
  setColumnColor,
  includeInFinances,
  setIncludeInFinances,
  isCompleted,
  setIsCompleted,
  onClose,
  onSubmit
}) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return createPortal(
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '420px' }}>
        <div className="modal-header">
          <h2>{editingColumnId ? t('kanban.editColumn') : t('kanban.addColumn')}</h2>
          <button 
            type="button" 
            onClick={onClose} 
            className="btn-icon"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div className="modal-body">
            <div className="form-group">
              <label>{t('kanban.columnName')}</label>
              <input 
                type="text" 
                required
                value={columnName}
                onChange={(e) => setColumnName(e.target.value)}
                className="search-input" 
                style={{ width: '100%', paddingLeft: '12px' }}
              />
            </div>
            <div className="form-group">
              <label>{t('kanban.columnColor')}</label>
              
              {/* Preset colors grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', marginBottom: '14px' }}>
                {PRESET_COLORS.map(color => (
                  <button 
                    key={color}
                    type="button"
                    onClick={() => setColumnColor(color)}
                    style={{
                      width: '100%',
                      aspectRatio: '1',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: color, 
                      cursor: 'pointer',
                      border: columnColor.toLowerCase() === color.toLowerCase() ? '2px solid white' : '1px solid rgba(255, 255, 255, 0.1)',
                      boxShadow: columnColor.toLowerCase() === color.toLowerCase() ? '0 0 0 2px var(--accent-primary), 0 2px 8px rgba(0, 0, 0, 0.2)' : 'none',
                      transform: columnColor.toLowerCase() === color.toLowerCase() ? 'scale(1.08)' : 'scale(1)',
                      transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                      outline: 'none',
                      padding: 0
                    }}
                    title={color}
                  />
                ))}
              </div>

              {/* Custom color input with picker + hex input + preview */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255, 255, 255, 0.03)', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
                <div style={{ position: 'relative', width: '36px', height: '36px', flexShrink: 0 }}>
                  <input 
                    type="color" 
                    value={columnColor.startsWith('#') && columnColor.length === 7 ? columnColor : '#3b82f6'} 
                    onChange={(e) => setColumnColor(e.target.value)}
                    style={{ 
                      position: 'absolute', 
                      top: 0, 
                      left: 0, 
                      width: '100%', 
                      height: '100%', 
                      opacity: 0, 
                      cursor: 'pointer' 
                    }} 
                    title="Выбрать цвет из палитры"
                  />
                  <div 
                    style={{ 
                      width: '100%', 
                      height: '100%', 
                      borderRadius: 'var(--radius-sm)', 
                      backgroundColor: columnColor || '#3b82f6', 
                      border: '2px solid rgba(255, 255, 255, 0.3)',
                      boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15)',
                      pointerEvents: 'none'
                    }} 
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <input 
                    type="text" 
                    value={columnColor} 
                    onChange={(e) => setColumnColor(e.target.value)}
                    className="search-input" 
                    placeholder="#3B82F6"
                    style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.9rem', padding: '6px 10px' }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)', paddingLeft: '4px', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: columnColor || '#3b82f6', display: 'inline-block', flexShrink: 0 }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{columnName || 'Статус'}</span>
                </div>
              </div>
            </div>

            <div className="form-group" style={{ marginTop: '16px', marginBottom: 0 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.88rem' }}>
                <input 
                  type="checkbox"
                  checked={includeInFinances}
                  onChange={(e) => setIncludeInFinances(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                />
                <span>Учитывать заявки этого статуса в блоке финансов</span>
              </label>
            </div>

            <div className="form-group" style={{ marginTop: '12px', marginBottom: 0 }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', fontSize: '0.88rem' }}>
                <input 
                  type="checkbox"
                  checked={isCompleted}
                  onChange={(e) => setIsCompleted(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--accent-primary)', cursor: 'pointer', marginTop: '2px', flexShrink: 0 }}
                />
                <div>
                  <span style={{ fontWeight: 500 }}>Статус завершения (архивировать заявки)</span>
                  <span style={{ display: 'block', fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Заявки в этом статусе за предыдущие месяцы будут автоматически перемещаться в раздел «Архив»
                  </span>
                </div>
              </label>
            </div>
          </div>
          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn btn-ghost">
              {t('kanban.modal.cancel')}
            </button>
            <button type="submit" className="btn btn-primary">
              {t('kanban.modal.save')}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
