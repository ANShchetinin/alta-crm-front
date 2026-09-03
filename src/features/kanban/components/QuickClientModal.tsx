import React from 'react';
import { createPortal } from 'react-dom';
import { X, User, Building2, MessageCircle, Send, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PRESET_LEAD_SOURCES } from '../../../constants/clients';

export interface QuickClientModalProps {
  isOpen: boolean;
  clientType: 'INDIVIDUAL' | 'LEGAL_ENTITY';
  setClientType: (type: 'INDIVIDUAL' | 'LEGAL_ENTITY') => void;
  name: string;
  setName: (name: string) => void;
  phone: string;
  setPhone: (phone: string) => void;
  whatsapp: string;
  setWhatsapp: (wa: string) => void;
  telegram: string;
  setTelegram: (tg: string) => void;
  inn: string;
  setInn: (inn: string) => void;
  contactPerson: string;
  setContactPerson: (cp: string) => void;
  leadSource: string;
  setLeadSource: (ls: string) => void;
  customLeadSource: string;
  setCustomLeadSource: (cls: string) => void;
  creatingClient: boolean;
  onClose: () => void;
  onOpenPassportScanner: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const QuickClientModal: React.FC<QuickClientModalProps> = ({
  isOpen,
  clientType,
  setClientType,
  name,
  setName,
  phone,
  setPhone,
  whatsapp,
  setWhatsapp,
  telegram,
  setTelegram,
  inn,
  setInn,
  contactPerson,
  setContactPerson,
  leadSource,
  setLeadSource,
  customLeadSource,
  setCustomLeadSource,
  creatingClient,
  onClose,
  onOpenPassportScanner,
  onSubmit
}) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return createPortal(
    <div className="modal-overlay" style={{ zIndex: 100000 }}>
      <div className="modal-content animate-fade-in" style={{ maxWidth: '460px' }}>
        <div className="modal-header">
          <h2>{clientType === 'LEGAL_ENTITY' ? 'Новая компания / Юрлицо' : t('clients.modal.addTitle')}</h2>
          <button 
            type="button" 
            onClick={onClose} 
            className="btn-icon"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div className="modal-body">
            {/* Type toggle */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', background: 'rgba(255,255,255,0.03)', padding: '4px', borderRadius: 'var(--radius-md)' }}>
              <button
                type="button"
                onClick={() => setClientType('INDIVIDUAL')}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '6px 10px',
                  borderRadius: 'var(--radius-sm)',
                  background: clientType === 'INDIVIDUAL' ? 'var(--accent-primary)' : 'transparent',
                  color: clientType === 'INDIVIDUAL' ? '#fff' : 'var(--text-secondary)',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.8rem'
                }}
              >
                <User size={14} />
                <span>Физлицо</span>
              </button>
              <button
                type="button"
                onClick={() => setClientType('LEGAL_ENTITY')}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '6px 10px',
                  borderRadius: 'var(--radius-sm)',
                  background: clientType === 'LEGAL_ENTITY' ? 'var(--accent-primary)' : 'transparent',
                  color: clientType === 'LEGAL_ENTITY' ? '#fff' : 'var(--text-secondary)',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.8rem'
                }}
              >
                <Building2 size={14} />
                <span>Юрлицо</span>
              </button>
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <label style={{ margin: 0 }}>{clientType === 'LEGAL_ENTITY' ? 'Наименование организации' : t('clients.modal.name')} *</label>
                {clientType === 'INDIVIDUAL' && (
                  <button
                    type="button"
                    onClick={onOpenPassportScanner}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#60a5fa',
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: 0
                    }}
                  >
                    📷 Заполнить по паспорту РФ
                  </button>
                )}
              </div>
              <input 
                type="text" 
                required
                placeholder={clientType === 'LEGAL_ENTITY' ? 'ООО «Альфа» или ИП Иванов' : (t('clients.modal.namePlaceholder') || 'Иван Иванов')}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="search-input"
                style={{ width: '100%', paddingLeft: '12px' }}
                autoFocus
              />
            </div>
            <div className="form-group">
              <label>{clientType === 'LEGAL_ENTITY' ? 'Рабочий телефон' : t('clients.modal.phone')} *</label>
              <input 
                type="tel" 
                required
                placeholder={t('clients.modal.phonePlaceholder') || '+7 (999) 000-00-00'}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="search-input"
                style={{ width: '100%', paddingLeft: '12px' }}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label>WhatsApp</label>
                <div className="input-with-icon">
                  <MessageCircle className="input-icon" size={16} />
                  <input
                    type="text"
                    placeholder="+7 (900) 123-45-67"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    className="search-input"
                    style={{ width: '100%', paddingLeft: '36px' }}
                  />
                </div>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Telegram</label>
                <div className="input-with-icon">
                  <Send className="input-icon" size={16} />
                  <input
                    type="text"
                    placeholder="@username"
                    value={telegram}
                    onChange={(e) => setTelegram(e.target.value)}
                    className="search-input"
                    style={{ width: '100%', paddingLeft: '36px' }}
                  />
                </div>
              </div>
            </div>
            {clientType === 'LEGAL_ENTITY' && (
              <>
                <div className="form-group">
                  <label>ИНН</label>
                  <input 
                    type="text" 
                    placeholder="7701234567"
                    value={inn}
                    onChange={(e) => setInn(e.target.value)}
                    className="search-input"
                    style={{ width: '100%', paddingLeft: '12px' }}
                  />
                </div>
                <div className="form-group">
                  <label>Контактное лицо (ЛПР)</label>
                  <input 
                    type="text" 
                    placeholder="Иванов Иван Иванович"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    className="search-input"
                    style={{ width: '100%', paddingLeft: '12px' }}
                  />
                </div>
              </>
            )}
            <div className="form-group">
              <label>{t('clients.modal.leadSource', 'Источник лида')}</label>
              <div className="custom-select-wrapper" style={{ marginBottom: leadSource === 'custom' ? '8px' : '0' }}>
                <select
                  value={leadSource}
                  onChange={(e) => setLeadSource(e.target.value)}
                  className="custom-select"
                >
                  <option value="">Не указан</option>
                  {PRESET_LEAD_SOURCES.map(source => (
                    <option key={source} value={source}>{source}</option>
                  ))}
                  <option value="custom">Другой вариант (ввести вручную)...</option>
                </select>
                <ChevronDown className="custom-select-icon" size={16} />
              </div>
              {leadSource === 'custom' && (
                <input
                  type="text"
                  required
                  placeholder="Укажите источник (например: Листовка, Баннер...)"
                  value={customLeadSource}
                  onChange={(e) => setCustomLeadSource(e.target.value)}
                  className="search-input"
                  style={{ width: '100%', paddingLeft: '12px', marginTop: '6px' }}
                  autoFocus
                />
              )}
            </div>
          </div>
          <div className="modal-actions">
            <button 
              type="button" 
              className="btn btn-ghost"
              onClick={onClose}
            >
              {t('clients.modal.cancel')}
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={creatingClient}
            >
              {creatingClient ? t('common.loading') : (t('clients.modal.create') || 'Создать клиента')}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
