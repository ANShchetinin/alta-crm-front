import React, { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string | number;
  width?: string | number;
  className?: string;
  bodyClassName?: string;
  closeOnOverlayClick?: boolean;
  closeOnEsc?: boolean;
  headerExtra?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidth = '560px',
  width = '95%',
  className = '',
  bodyClassName = '',
  closeOnOverlayClick = true,
  closeOnEsc = true,
  headerExtra
}) => {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (closeOnEsc && e.key === 'Escape') {
      onClose();
    }
  }, [closeOnEsc, onClose]);

  useEffect(() => {
    if (!isOpen) return;

    document.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="modal-overlay"
      onClick={closeOnOverlayClick ? onClose : undefined}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`modal-content ${className}`}
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: typeof maxWidth === 'number' ? `${maxWidth}px` : maxWidth,
          width: typeof width === 'number' ? `${width}px` : width,
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh'
        }}
      >
        {(title || headerExtra) && (
          <div className="modal-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
              {typeof title === 'string' ? <h2 style={{ margin: 0 }}>{title}</h2> : title}
              {headerExtra}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="btn-icon"
              aria-label="Закрыть"
            >
              <X size={20} />
            </button>
          </div>
        )}

        <div
          className={`modal-body ${bodyClassName}`}
          style={{
            flex: 1,
            overflowY: 'auto',
            minHeight: 0
          }}
        >
          {children}
        </div>

        {footer && (
          <div className="modal-actions" style={{ marginTop: 'auto', flexShrink: 0 }}>
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
