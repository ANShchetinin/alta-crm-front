import React from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, Check } from 'lucide-react';

interface UnsavedChangesDialogProps {
  onSave: () => void;
  onDiscard: () => void;
  onContinue: () => void;
}

/**
 * Подтверждение закрытия заказа с несохраненными изменениями.
 */
export const UnsavedChangesDialog: React.FC<UnsavedChangesDialogProps> = ({ onSave, onDiscard, onContinue }) => createPortal(
  <div className="modal-overlay dialog-overlay" style={{ zIndex: 100060, pointerEvents: 'auto' }} onClick={onContinue}>
    <div className="modal-content dialog-content animate-fade-in" onClick={e => e.stopPropagation()}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
        <div style={{
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          background: 'rgba(245, 158, 11, 0.15)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#f59e0b',
          flexShrink: 0
        }}>
          <AlertCircle size={24} />
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Несохраненные изменения
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
            В заказе есть несохраненные данные. Сохранить их перед закрытием?
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
        <button
          type="button"
          className="btn btn-primary"
          onClick={onSave}
          style={{ width: '100%', justifyContent: 'center', height: '42px', fontWeight: 600 }}
        >
          <Check size={16} /> Сохранить изменения
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={onDiscard}
          style={{ width: '100%', justifyContent: 'center', height: '40px', color: 'var(--danger)' }}
        >
          Не сохранять
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={onContinue}
          style={{ width: '100%', justifyContent: 'center', height: '38px', color: 'var(--text-secondary)' }}
        >
          Продолжить редактирование
        </button>
      </div>
    </div>
  </div>,
  document.body
);
