import React, { useState, useEffect } from 'react';
import { 
  X, Phone, MessageSquare, Globe, Calendar, Calculator, 
  Trash2, Save, ArrowRight, Loader2, Copy, Check 
} from 'lucide-react';
import { updateSiteRequest, type SiteRequestItem, type CalcDataPayload } from '../../api/siteRequests';
import { formatTimeAgo, formatDateTime } from '../../utils/dateUtils';
import { toast } from '../../utils/toast';

interface SiteRequestModalProps {
  siteRequest: SiteRequestItem | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
  onDelete: (id: number) => void;
  onConvertToOrder: (siteRequest: SiteRequestItem) => void;
}

export const SiteRequestModal: React.FC<SiteRequestModalProps> = ({
  siteRequest,
  isOpen,
  onClose,
  onUpdated,
  onDelete,
  onConvertToOrder,
}) => {
  const [clientName, setClientName] = useState('');
  const [phone, setPhone] = useState('');
  const [managerNotes, setManagerNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);

  useEffect(() => {
    if (siteRequest) {
      setClientName(siteRequest.clientName || '');
      setPhone(siteRequest.phone || '');
      setManagerNotes(siteRequest.managerNotes || '');
    }
  }, [siteRequest]);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !siteRequest) return null;

  let parsedCalcData: CalcDataPayload | null = null;
  if (siteRequest.calcData) {
    try {
      parsedCalcData = JSON.parse(siteRequest.calcData);
    } catch (e) {
      console.error('Failed to parse calcData', e);
    }
  }

  const handleCopyPhone = () => {
    if (siteRequest.phone && navigator?.clipboard) {
      navigator.clipboard.writeText(siteRequest.phone);
      setCopiedPhone(true);
      toast.success('Телефон скопирован');
      setTimeout(() => setCopiedPhone(false), 2000);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim() || !phone.trim()) {
      toast.error('Имя и телефон обязательны');
      return;
    }

    try {
      setSaving(true);
      await updateSiteRequest(siteRequest.id, {
        clientName: clientName.trim(),
        phone: phone.trim(),
        managerNotes: managerNotes.trim() || undefined,
      });
      toast.success('Заявка успешно обновлена');
      onUpdated();
    } catch (err: any) {
      console.error('Failed to update site request', err);
      toast.error(err.response?.data?.error || 'Ошибка при сохранении заявки');
    } finally {
      setSaving(false);
    }
  };

  const cleanPhone = siteRequest.phone ? siteRequest.phone.replace(/[^0-9]/g, '') : '';

  return (
    <div className="modal-overlay sr-modal-overlay" onClick={onClose}>
      <div 
        className="modal-content sr-modal-content" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div style={{ paddingRight: '8px' }}>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Заявка с сайта #{siteRequest.id}
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              <Calendar size={14} />
              <span>{formatDateTime(siteRequest.createdAt)} ({formatTimeAgo(siteRequest.createdAt)})</span>
            </div>
          </div>
          <button 
            type="button" 
            className="btn-icon modal-close-btn" 
            onClick={onClose}
            aria-label="Закрыть"
            title="Закрыть"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          {/* Scrollable body */}
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Source info bar */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              flexWrap: 'wrap',
              padding: '10px 14px',
              background: 'var(--surface-bg, rgba(0,0,0,0.03))',
              borderRadius: 'var(--radius-md, 8px)',
              border: '1px solid var(--border-color)',
              fontSize: '0.85rem'
            }}>
              {siteRequest.site && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-primary)', fontWeight: 600 }}>
                  <Globe size={15} />
                  <span>{siteRequest.site}</span>
                </div>
              )}
              {(siteRequest.formName || siteRequest.formType) && (
                <div style={{ color: 'var(--text-secondary)' }}>
                  Форма: <strong style={{ color: 'var(--text-primary)' }}>{siteRequest.formName || siteRequest.formType}</strong>
                </div>
              )}
              {siteRequest.calculatedPrice && (
                <div style={{ marginLeft: 'auto', color: '#10b981', fontWeight: 700 }}>
                  {siteRequest.calculatedPrice.toLocaleString('ru-RU')} ₽
                </div>
              )}
            </div>

            {/* Contacts */}
            <div className="sr-modal-contacts-grid">
              <div className="form-group">
                <label className="form-label" style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Имя клиента *
                </label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="search-input"
                  style={{ width: '100%', boxSizing: 'border-box' }}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Телефон *
                </label>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="search-input"
                    style={{ flex: 1, minWidth: '130px', boxSizing: 'border-box' }}
                    required
                  />
                  <button
                    type="button"
                    onClick={handleCopyPhone}
                    className="btn btn-secondary"
                    style={{ padding: '0 8px', height: '38px', flexShrink: 0, minWidth: '38px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                    title="Скопировать телефон"
                    aria-label="Скопировать телефон"
                  >
                    {copiedPhone ? <Check size={16} color="#10b981" /> : <Copy size={16} />}
                  </button>
                  {cleanPhone && (
                    <>
                      <a
                        href={`tel:+${cleanPhone}`}
                        className="sr-quick-action-btn"
                        style={{ width: '38px', height: '38px', padding: 0, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                        title="Позвонить"
                        aria-label="Позвонить"
                      >
                        <Phone size={16} />
                      </a>
                      <a
                        href={`https://wa.me/${cleanPhone}`}
                        target="_blank"
                        rel="noreferrer"
                        className="sr-quick-action-btn wa"
                        style={{ width: '38px', height: '38px', padding: 0, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                        title="WhatsApp"
                        aria-label="WhatsApp"
                      >
                        <MessageSquare size={16} />
                      </a>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Comment from customer */}
            {siteRequest.comment && (
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Сообщение / комментарий с сайта:
                </label>
                <div style={{
                  padding: '10px 12px',
                  background: 'var(--surface-bg, rgba(0,0,0,0.02))',
                  borderLeft: '3px solid var(--accent-primary)',
                  borderRadius: '4px',
                  fontSize: '0.9rem',
                  color: 'var(--text-primary)',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}>
                  {siteRequest.comment}
                </div>
              </div>
            )}

            {/* Calculator Data */}
            {parsedCalcData && (
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  <Calculator size={15} />
                  <span>Параметры расчета с калькулятора:</span>
                </label>
                <div className="sr-modal-calc-grid">
                  {parsedCalcData.area && (
                    <div className="sr-modal-calc-item">
                      <span className="sr-modal-calc-label">Площадь</span>
                      <span className="sr-modal-calc-value">{parsedCalcData.area} м²</span>
                    </div>
                  )}
                  {parsedCalcData.perimeter && (
                    <div className="sr-modal-calc-item">
                      <span className="sr-modal-calc-label">Периметр</span>
                      <span className="sr-modal-calc-value">{parsedCalcData.perimeter} м</span>
                    </div>
                  )}
                  {parsedCalcData.texture && (
                    <div className="sr-modal-calc-item">
                      <span className="sr-modal-calc-label">Фактура</span>
                      <span className="sr-modal-calc-value">{parsedCalcData.texture}</span>
                    </div>
                  )}
                  {parsedCalcData.lights && (
                    <div className="sr-modal-calc-item">
                      <span className="sr-modal-calc-label">Светильники</span>
                      <span className="sr-modal-calc-value">{parsedCalcData.lights} шт.</span>
                    </div>
                  )}
                  {parsedCalcData.chandeliers && (
                    <div className="sr-modal-calc-item">
                      <span className="sr-modal-calc-label">Люстры</span>
                      <span className="sr-modal-calc-value">{parsedCalcData.chandeliers} шт.</span>
                    </div>
                  )}
                  {parsedCalcData.curtainToggle && (
                    <div className="sr-modal-calc-item">
                      <span className="sr-modal-calc-label">Гардина</span>
                      <span className="sr-modal-calc-value">{parsedCalcData.curtain ? `${parsedCalcData.curtain} м` : 'Да'}</span>
                    </div>
                  )}
                  {parsedCalcData.selectedPlan && (
                    <div className="sr-modal-calc-item">
                      <span className="sr-modal-calc-label">Тариф</span>
                      <span className="sr-modal-calc-value">{parsedCalcData.selectedPlan}</span>
                    </div>
                  )}
                  {parsedCalcData.selectedPrice && (
                    <div className="sr-modal-calc-item">
                      <span className="sr-modal-calc-label">Расчетная цена</span>
                      <span className="sr-modal-calc-value" style={{ color: '#10b981' }}>{parsedCalcData.selectedPrice}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Manager Notes */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Внутренняя заметка менеджера:
              </label>
              <textarea
                value={managerNotes}
                onChange={(e) => setManagerNotes(e.target.value)}
                placeholder="Заметки по звонку, результат переговоров..."
                rows={2}
                className="search-input"
                style={{ width: '100%', resize: 'vertical' }}
              />
            </div>
          </div>

          {/* Fixed/Sticky Actions bar */}
          <div className="modal-actions sr-modal-actions">
            <button
              type="button"
              onClick={() => onDelete(siteRequest.id)}
              className="btn btn-ghost"
              style={{ color: 'var(--danger)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Trash2 size={16} />
              <span>Удалить заявку</span>
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="submit"
                disabled={saving}
                className="btn btn-secondary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                <span>Сохранить</span>
              </button>

              <button
                type="button"
                onClick={() => onConvertToOrder(siteRequest)}
                className="btn btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <span>Создать заказ</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
