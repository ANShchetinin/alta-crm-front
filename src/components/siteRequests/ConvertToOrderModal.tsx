import React, { useState, useEffect } from 'react';
import { X, Check, MapPin, ArrowRight, Loader2 } from 'lucide-react';
import { getOrderStatuses, type OrderStatus } from '../../api/kanban';
import { convertSiteRequestToOrder, type SiteRequestItem } from '../../api/siteRequests';
import { useOrderDrawerStore } from '../../store/useOrderDrawerStore';
import { toast } from '../../utils/toast';

interface ConvertToOrderModalProps {
  siteRequest: SiteRequestItem;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ConvertToOrderModal: React.FC<ConvertToOrderModalProps> = ({
  siteRequest,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [statuses, setStatuses] = useState<OrderStatus[]>([]);
  const [selectedStatusId, setSelectedStatusId] = useState<number | null>(null);
  const [address, setAddress] = useState('');
  const [additionalComment, setAdditionalComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingStatuses, setFetchingStatuses] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const fetchStatuses = async () => {
      try {
        setFetchingStatuses(true);
        const data = await getOrderStatuses();
        const sorted = [...data].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
        setStatuses(sorted);
        if (sorted.length > 0) {
          setSelectedStatusId(sorted[0].id);
        }
      } catch (err) {
        console.error('Failed to load statuses', err);
        toast.error('Не удалось загрузить этапы заказов');
      } finally {
        setFetchingStatuses(false);
      }
    };

    fetchStatuses();
    setAddress('');
    setAdditionalComment('');
  }, [isOpen]);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  const handleConvert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStatusId) {
      toast.error('Пожалуйста, выберите статус (этап) для заказа');
      return;
    }

    try {
      setLoading(true);
      const createdOrder = await convertSiteRequestToOrder(siteRequest.id, {
        statusId: selectedStatusId,
        address: address.trim() || undefined,
        additionalComment: additionalComment.trim() || undefined,
      });

      toast.success(`Заказ №${createdOrder.orderNumber || createdOrder.id} успешно создан!`);
      onSuccess();
      onClose();

      // Immediately open the created order in full drawer
      if (createdOrder.id) {
        useOrderDrawerStore.getState().openOrder(createdOrder.id);
      }
    } catch (err: any) {
      console.error('Failed to convert site request to order', err);
      const errorMsg = err.response?.data?.error || err.response?.data?.message || err.message || 'Ошибка при создании заказа';
      toast.error(errorMsg);
      // Если заявка уже была кем-то обработана, закрываем модалку и обновляем список
      if (errorMsg.includes('уже') || err.response?.status === 400 || err.response?.status === 409 || err.response?.status === 404) {
        onSuccess();
        onClose();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay sr-modal-overlay" onClick={onClose}>
      <div 
        className="modal-content sr-modal-content" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '520px' }}
      >
        <div className="modal-header">
          <div style={{ paddingRight: '8px' }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Создать заказ
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
              {siteRequest.clientName} ({siteRequest.phone})
            </p>
          </div>
          <button 
            type="button" 
            className="btn-icon modal-close-btn" 
            onClick={onClose}
            disabled={loading}
            aria-label="Закрыть"
            title="Закрыть"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleConvert} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Status Selection */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
                Выберите этап (статус) на доске заказов <span style={{ color: 'var(--danger)' }}>*</span>
              </label>

              {fetchingStatuses ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', padding: '12px 0' }}>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Загрузка этапов...</span>
                </div>
              ) : (
                <div className="sr-status-picker-grid">
                  {statuses.map((status) => {
                    const isSelected = selectedStatusId === status.id;
                    return (
                      <button
                        key={status.id}
                        type="button"
                        onClick={() => setSelectedStatusId(status.id)}
                        className={`sr-status-option ${isSelected ? 'selected' : ''}`}
                      >
                        <span 
                          className="sr-status-color-dot" 
                          style={{ background: status.color || '#3b82f6' }}
                        />
                        <span style={{ flex: 1, fontWeight: 500, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                          {status.name}
                        </span>
                        {isSelected && (
                          <Check size={18} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Address */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                Адрес объекта (необязательно)
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Например: ул. Пушкина 12, кв 45"
                  className="search-input"
                  style={{ width: '100%', paddingLeft: '34px', boxSizing: 'border-box' }}
                />
                <MapPin size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              </div>
            </div>

            {/* Additional comment */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                Заметка менеджера к заказу (необязательно)
              </label>
              <textarea
                value={additionalComment}
                onChange={(e) => setAdditionalComment(e.target.value)}
                placeholder="Дополнительные детали или примечания для замерщика/монтажников..."
                rows={2}
                className="search-input"
                style={{ width: '100%', resize: 'vertical', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div className="modal-actions sr-modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Отмена
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !selectedStatusId}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Создание...</span>
                </>
              ) : (
                <>
                  <span>Создать заказ</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
