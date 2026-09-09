import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useToastStore, type ToastItem, type ToastType } from '../../store/useToastStore';

const ToastItemComponent: React.FC<{ toast: ToastItem; onDismiss: (id: string) => void }> = ({
  toast,
  onDismiss
}) => {
  useEffect(() => {
    if (!toast.duration || toast.duration <= 0) return;
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, toast.duration);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onDismiss]);

  const getIcon = (type: ToastType) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 size={18} className="toast-icon toast-icon-success" />;
      case 'error':
        return <AlertCircle size={18} className="toast-icon toast-icon-error" />;
      case 'warning':
        return <AlertTriangle size={18} className="toast-icon toast-icon-warning" />;
      case 'info':
      default:
        return <Info size={18} className="toast-icon toast-icon-info" />;
    }
  };

  return (
    <div
      className={`crm-toast-item crm-toast-${toast.type} animate-fade-in`}
      role="alert"
      onClick={() => onDismiss(toast.id)}
    >
      <div className="crm-toast-icon-wrapper">
        {getIcon(toast.type)}
      </div>

      <div className="crm-toast-content">
        {toast.title && <div className="crm-toast-title">{toast.title}</div>}
        <div className="crm-toast-message">{toast.message}</div>
      </div>

      <button
        type="button"
        className="crm-toast-close"
        onClick={(e) => {
          e.stopPropagation();
          onDismiss(toast.id);
        }}
        aria-label="Закрыть уведомление"
      >
        <X size={14} />
      </button>

      {toast.duration && toast.duration > 0 && (
        <div
          className="crm-toast-progress"
          style={{ animationDuration: `${toast.duration}ms` }}
        />
      )}
    </div>
  );
};

export const ToastContainer: React.FC = () => {
  const toasts = useToastStore((state) => state.toasts);
  const removeToast = useToastStore((state) => state.removeToast);

  if (typeof document === 'undefined' || toasts.length === 0) {
    return null;
  }

  return createPortal(
    <div className="crm-toast-container" aria-live="polite">
      {toasts.map((t) => (
        <ToastItemComponent key={t.id} toast={t} onDismiss={removeToast} />
      ))}
    </div>,
    document.body
  );
};
