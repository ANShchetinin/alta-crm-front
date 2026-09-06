import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export type SheetSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

export interface SheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: SheetSize;
  className?: string;
  closeOnBackdrop?: boolean;
}

const sizeWidths: Record<SheetSize, string> = {
  sm: '400px',
  md: '520px',
  lg: '640px',
  xl: '780px',
  full: '100vw'
};

export const Sheet: React.FC<SheetProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'lg',
  className = '',
  closeOnBackdrop = true
}) => {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const targetWidth = sizeWidths[size];

  const sheetContent = (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'stretch'
      }}
    >
      {/* Backdrop */}
      <div
        onClick={closeOnBackdrop ? onClose : undefined}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          transition: 'opacity 0.25s ease',
          animation: 'sheetFadeIn 0.25s ease-out forwards'
        }}
      />

      {/* Slide-over Sheet Panel */}
      <div
        ref={panelRef}
        className={`sheet-panel ${className}`}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: targetWidth,
          height: '100%',
          maxHeight: '100vh',
          backgroundColor: 'var(--bg-secondary, #ffffff)',
          color: 'var(--text-primary, #0f172a)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-8px 0 32px rgba(0, 0, 0, 0.2)',
          borderLeft: '1px solid var(--glass-border, #e2e8f0)',
          zIndex: 10000,
          animation: 'sheetSlideIn 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--glass-border, #e2e8f0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexShrink: 0,
            background: 'var(--bg-secondary, #ffffff)'
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            {title && (
              <div style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary, #0f172a)', lineHeight: 1.3 }}>
                {title}
              </div>
            )}
            {description && (
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary, #64748b)', marginTop: '2px' }}>
                {description}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary, #64748b)',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '8px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.15s ease, color 0.15s ease'
            }}
            className="btn-icon"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: '20px',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          {children}
        </div>

        {/* Footer (if provided) */}
        {footer && (
          <div
            style={{
              padding: '14px 20px',
              borderTop: '1px solid var(--glass-border, #e2e8f0)',
              background: 'var(--bg-secondary, #ffffff)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '10px',
              flexShrink: 0
            }}
          >
            {footer}
          </div>
        )}
      </div>

      <style>{`
        @keyframes sheetFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes sheetSlideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @media (max-width: 768px) {
          .sheet-panel {
            max-width: 100% !important;
            border-left: none !important;
            border-top: 1px solid var(--glass-border, #e2e8f0) !important;
          }
        }
      `}</style>
    </div>
  );

  return createPortal(sheetContent, document.body);
};
