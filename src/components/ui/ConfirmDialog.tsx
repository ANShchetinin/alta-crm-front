import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { AlertTriangle } from 'lucide-react';

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDanger?: boolean;
  loading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Подтвердить',
  cancelText = 'Отмена',
  onConfirm,
  onCancel,
  isDanger = false,
  loading = false
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isDanger && <AlertTriangle size={20} style={{ color: '#ef4444' }} />}
          <span>{title}</span>
        </div>
      }
      maxWidth="440px"
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', width: '100%' }}>
          <Button variant="secondary" onClick={onCancel} disabled={loading}>
            {cancelText}
          </Button>
          <Button
            variant={isDanger ? 'danger' : 'primary'}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmText}
          </Button>
        </div>
      }
    >
      <div style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.5, padding: '8px 0' }}>
        {message}
      </div>
    </Modal>
  );
};
