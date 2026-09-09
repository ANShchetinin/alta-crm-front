import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, HelpCircle, X } from 'lucide-react';
import { useConfirmStore } from '../../store/useConfirmStore';

export interface ConfirmDialogProps {
  isOpen?: boolean;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = (props) => {
  const store = useConfirmStore();

  const isControlled = props.isOpen !== undefined;
  const isOpen = isControlled ? Boolean(props.isOpen) : store.isOpen;
  const title = isControlled ? (props.title || '') : store.title;
  const message = isControlled ? props.message : store.message;
  const confirmText = isControlled ? (props.confirmText || 'Подтвердить') : store.confirmText;
  const cancelText = isControlled ? (props.cancelText || 'Отмена') : store.cancelText;
  const danger = isControlled ? Boolean(props.danger) : store.danger;

  const handleConfirm = () => {
    if (isControlled) {
      props.onConfirm?.();
    } else {
      store.closeConfirm(true);
    }
  };

  const handleCancel = () => {
    if (isControlled) {
      props.onCancel?.();
    } else {
      store.closeConfirm(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCancel();
      } else if (e.key === 'Enter') {
        handleConfirm();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (typeof document === 'undefined' || !isOpen) {
    return null;
  }

  return createPortal(
    <div
      className="modal-overlay dialog-overlay"
      style={{ zIndex: 100095, pointerEvents: 'auto' }}
      onClick={handleCancel}
    >
      <div
        className="modal-content dialog-content animate-fade-in"
        style={{ maxWidth: '440px' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '16px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: danger ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)',
              border: danger ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(59, 130, 246, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: danger ? 'var(--danger)' : 'var(--accent-primary)',
              flexShrink: 0
            }}
          >
            {danger ? <AlertTriangle size={24} /> : <HelpCircle size={24} />}
          </div>

          <div style={{ flex: 1, minWidth: 0, paddingTop: '2px' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              {title}
            </h3>
            {message && (
              <p
                style={{
                  margin: '6px 0 0',
                  fontSize: '0.86rem',
                  color: 'var(--text-secondary)',
                  lineHeight: '1.45',
                  whiteSpace: 'pre-line'
                }}
              >
                {message}
              </p>
            )}
          </div>

          <button
            type="button"
            className="btn-icon"
            onClick={handleCancel}
            style={{ margin: '-6px -6px 0 0', color: 'var(--text-secondary)' }}
            aria-label="Закрыть"
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={handleCancel}
            style={{ padding: '8px 18px', fontSize: '0.9rem' }}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={danger ? 'btn btn-danger' : 'btn btn-primary'}
            onClick={handleConfirm}
            style={{
              padding: '8px 20px',
              fontSize: '0.9rem',
              fontWeight: 600,
              background: danger ? 'var(--danger)' : undefined,
              borderColor: danger ? 'var(--danger)' : undefined
            }}
            autoFocus
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
