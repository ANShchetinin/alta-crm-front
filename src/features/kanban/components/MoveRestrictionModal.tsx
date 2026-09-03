import React from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, AlertCircle, FileCheck, X } from 'lucide-react';

export interface MoveRestrictionData {
  isOpen: boolean;
  orderId?: number;
  orderNumber?: string;
  targetStatusName: string;
  reason: string;
}

interface MoveRestrictionModalProps {
  data: MoveRestrictionData | null;
  onClose: () => void;
  onOpenOrderFiles: (orderId: number) => void;
}

export const MoveRestrictionModal: React.FC<MoveRestrictionModalProps> = ({
  data,
  onClose,
  onOpenOrderFiles
}) => {
  if (!data || !data.isOpen) return null;

  return createPortal(
    <div className="modal-overlay" style={{ zIndex: 1000000 }} onClick={onClose}>
      <div 
        className="modal-content animate-scale-up move-restriction-card" 
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div className="move-restriction-icon-box">
            <AlertTriangle size={28} />
          </div>
          <button type="button" className="btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="move-restriction-body">
          <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)', fontWeight: 700 }}>
            Перемещение карточки невозможно
          </h3>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Заявка: <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{data.orderNumber}</span>
          </div>

          <div className="move-restriction-reason-box">
            <div style={{ fontWeight: 600, color: '#ef4444', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <AlertCircle size={15} /> Причина запрета:
            </div>
            <div>{data.reason}</div>
          </div>

          <div className="move-restriction-hint-box">
            <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
              💡 Как завершить заявку:
            </div>
            <div>
              Откройте карточку заявки, перейдите во вкладку <strong>«Файлы»</strong> и прикрепите скан/фото подписанного Акта выполненных работ (или отсканируйте камерой).
            </div>
          </div>
        </div>

        <div className="modal-actions" style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={onClose}
          >
            Понятно
          </button>
          {data.orderId && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => onOpenOrderFiles(data.orderId!)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <FileCheck size={16} /> Прикрепить Акт
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
