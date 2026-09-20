import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, MessageSquare, X, Check } from 'lucide-react';

export interface StatusChangePromptData {
  isOpen: boolean;
  orderId: number;
  orderNumber: string;
  sourceStatusName?: string;
  sourceStatusColor?: string;
  targetStatusId: number;
  targetStatusName: string;
  targetStatusColor?: string;
}

interface StatusChangeModalProps {
  data: StatusChangePromptData | null;
  onClose: () => void;
  onConfirm: (comment?: string) => Promise<void> | void;
}

export const StatusChangeModal: React.FC<StatusChangeModalProps> = ({
  data,
  onClose,
  onConfirm
}) => {
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (data?.isOpen) {
      setComment('');
      setSubmitting(false);
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 50);
    }
  }, [data?.isOpen]);

  if (!data || !data.isOpen) {
    return null;
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    if (submitting) {
      return;
    }
    try {
      setSubmitting(true);
      await onConfirm(comment.trim() ? comment.trim() : undefined);
      onClose();
    } catch (err) {
      console.error('Failed to change status with comment', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return createPortal(
    <div className="modal-overlay" style={{ zIndex: 1000000 }} onClick={onClose}>
      <div 
        className="modal-content animate-scale-up" 
        style={{ maxWidth: '460px', width: '100%', padding: '20px' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(59, 130, 246, 0.15)',
              color: '#3b82f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <MessageSquare size={17} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary)', fontWeight: 700 }}>
                Смена статуса заявки
              </h3>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Заказ: <strong style={{ color: 'var(--text-primary)' }}>{data.orderNumber}</strong>
              </div>
            </div>
          </div>
          <button type="button" className="btn-icon" onClick={onClose} aria-label="Закрыть">
            <X size={18} />
          </button>
        </div>

        {/* Status transition visual */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          padding: '10px 14px',
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid var(--glass-border)',
          borderRadius: 'var(--radius-sm)',
          marginBottom: '16px',
          flexWrap: 'wrap'
        }}>
          {data.sourceStatusName && (
            <>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '3px 8px',
                borderRadius: '4px',
                background: 'rgba(255, 255, 255, 0.05)',
                fontSize: '0.82rem',
                color: 'var(--text-secondary)'
              }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: data.sourceStatusColor || '#6b7280' }} />
                {data.sourceStatusName}
              </span>
              <ArrowRight size={14} style={{ color: 'var(--text-secondary)', opacity: 0.6 }} />
            </>
          )}
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            padding: '3px 10px',
            borderRadius: '4px',
            background: 'rgba(59, 130, 246, 0.12)',
            border: '1px solid rgba(59, 130, 246, 0.25)',
            fontSize: '0.84rem',
            fontWeight: 600,
            color: 'var(--text-primary)'
          }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: data.targetStatusColor || '#3b82f6' }} />
            {data.targetStatusName}
          </span>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', marginBottom: '6px' }}>
              <span>Комментарий к статусу</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 400 }}>необязательно</span>
            </label>
            <textarea
              ref={textareaRef}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Например: Замер согласован на пятницу 14:00..."
              rows={3}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--glass-border)',
                background: 'rgba(0, 0, 0, 0.15)',
                color: 'var(--text-primary)',
                fontSize: '0.88rem',
                lineHeight: '1.45',
                resize: 'vertical',
                fontFamily: 'inherit',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onClose}
              disabled={submitting}
              style={{ padding: '8px 14px', fontSize: '0.85rem' }}
            >
              Отмена
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
              style={{
                padding: '8px 18px',
                fontSize: '0.85rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Check size={15} />
              {submitting ? 'Перемещение...' : 'Переместить'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
