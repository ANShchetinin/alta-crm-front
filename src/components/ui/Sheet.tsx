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
  sm: '420px',
  md: '540px',
  lg: '680px',
  xl: '840px',
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
      className="sheet-container-root"
    >
      {/* Backdrop */}
      <div
        className="sheet-backdrop"
        onClick={closeOnBackdrop ? onClose : undefined}
      />

      {/* Slide-over Sheet Panel */}
      <div
        ref={panelRef}
        className={`sheet-panel ${className}`}
        style={{
          maxWidth: targetWidth
        }}
      >
        {/* Mobile Pull Handle */}
        <div className="sheet-drag-handle-wrapper" onClick={onClose}>
          <div className="sheet-drag-handle" />
        </div>

        {/* Header */}
        <div className="sheet-header">
          <div style={{ flex: 1, minWidth: 0 }}>
            {title && (
              <div className="sheet-title">
                {title}
              </div>
            )}
            {description && (
              <div className="sheet-description">
                {description}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            className="btn-icon sheet-close-btn"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="sheet-body">
          {children}
        </div>

        {/* Footer (if provided) */}
        {footer && (
          <div className="sheet-footer">
            {footer}
          </div>
        )}
      </div>

      <style>{`
        .sheet-container-root {
          position: fixed;
          inset: 0;
          z-index: 10005;
          display: flex;
          justify-content: flex-end;
          align-items: stretch;
        }

        .sheet-backdrop {
          position: fixed;
          inset: 0;
          background-color: rgba(15, 23, 42, 0.65);
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
          animation: sheetFadeIn 0.22s ease-out forwards;
          z-index: 1;
        }

        .sheet-panel {
          position: relative;
          z-index: 2;
          width: 100%;
          height: 100vh;
          max-height: 100vh;
          background-color: var(--bg-secondary, #ffffff);
          color: var(--text-primary, #0f172a);
          display: flex;
          flex-direction: column;
          box-shadow: -10px 0 35px rgba(0, 0, 0, 0.2);
          border-left: 1px solid var(--glass-border, #e2e8f0);
          animation: sheetSlideInDesktop 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          box-sizing: border-box;
          overflow: hidden;
        }

        .sheet-drag-handle-wrapper {
          display: none;
          justify-content: center;
          align-items: center;
          padding: 10px 0 4px 0;
          cursor: pointer;
          flex-shrink: 0;
        }

        .sheet-drag-handle {
          width: 36px;
          height: 4px;
          border-radius: 2px;
          background: var(--text-muted, #94a3b8);
          opacity: 0.5;
        }

        .sheet-header {
          padding: 16px 20px;
          border-bottom: 1px solid var(--glass-border, #e2e8f0);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-shrink: 0;
          background: var(--bg-secondary, #ffffff);
        }

        .sheet-title {
          font-size: 1.05rem;
          font-weight: 700;
          color: var(--text-primary, #0f172a);
          line-height: 1.3;
        }

        .sheet-description {
          font-size: 0.82rem;
          color: var(--text-secondary, #64748b);
          margin-top: 2px;
        }

        .sheet-close-btn {
          background: transparent;
          border: none;
          color: var(--text-secondary, #64748b);
          cursor: pointer;
          padding: 8px;
          border-radius: 8px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .sheet-body {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          padding: 20px;
          -webkit-overflow-scrolling: touch;
          box-sizing: border-box;
        }

        .sheet-footer {
          padding: 14px 20px;
          border-top: 1px solid var(--glass-border, #e2e8f0);
          background: var(--bg-secondary, #ffffff);
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 10px;
          flex-shrink: 0;
        }

        @keyframes sheetFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes sheetSlideInDesktop {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }

        @keyframes sheetSlideUpMobile {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }

        @media (max-width: 768px) {
          .sheet-container-root {
            align-items: flex-end !important;
            justify-content: center !important;
          }

          .sheet-panel {
            max-width: 100% !important;
            height: auto !important;
            max-height: 92vh !important;
            border-left: none !important;
            border-top: 1px solid var(--glass-border, #e2e8f0) !important;
            border-radius: 16px 16px 0 0 !important;
            animation: sheetSlideUpMobile 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards !important;
            box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.25) !important;
            padding-bottom: env(safe-area-inset-bottom, 0px);
          }

          .sheet-drag-handle-wrapper {
            display: flex !important;
          }

          .sheet-header {
            padding: 10px 16px 12px 16px;
          }

          .sheet-body {
            padding: 14px 16px;
          }

          .sheet-footer {
            padding: 12px 16px;
          }
        }
      `}</style>
    </div>
  );

  return createPortal(sheetContent, document.body);
};

