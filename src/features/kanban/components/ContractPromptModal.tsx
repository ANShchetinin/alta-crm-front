import React from 'react';
import { createPortal } from 'react-dom';
import { FileCheck, X, AlertCircle, FileText } from 'lucide-react';

export interface ContractPromptData {
  clientId: number;
  name: string;
  phone: string;
  secondPhone: string;
  birthDate: string;
  passportSeriesNumber: string;
  passportIssuedBy: string;
  passportIssuedDate: string;
  passportDepartmentCode: string;
  registrationAddress: string;
  installationAddress: string;
  area: string;
  perimeter: string;
  canvasesCount: string;
  insertLength: string;
  pipeCount: string;
  lightsCount: string;
  timberLength: string;
  canvasArticle: string;
  discount: string;
  handoverDate: string;
}

export interface ContractPromptModalProps {
  isOpen: boolean;
  contractPromptData: ContractPromptData;
  setContractPromptData: React.Dispatch<React.SetStateAction<ContractPromptData>>;
  contractPromptLoading: boolean;
  onClose: () => void;
  onOpenPassportScanner: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const ContractPromptModal: React.FC<ContractPromptModalProps> = ({
  isOpen,
  contractPromptData,
  setContractPromptData,
  contractPromptLoading,
  onClose,
  onOpenPassportScanner,
  onSubmit
}) => {
  if (!isOpen) return null;

  return createPortal(
    <div className="modal-overlay" onClick={() => !contractPromptLoading && onClose()}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '580px', width: '92%' }}>
        <div className="modal-header">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.05rem', margin: 0 }}>
            <FileCheck size={20} style={{ color: 'var(--accent-primary)' }} />
            Данные Заказчика для договора
          </h2>
          <button 
            type="button" 
            onClick={onClose} 
            className="btn-icon"
            aria-label="Close"
            disabled={contractPromptLoading}
          >
            <X size={20} />
          </button>
        </div>
        <form onSubmit={onSubmit}>
          <div className="modal-body" style={{ maxHeight: '65vh', overflowY: 'auto', padding: '16px 20px' }}>
            <div style={{
              background: 'rgba(59, 130, 246, 0.08)',
              border: '1px solid rgba(59, 130, 246, 0.25)',
              borderRadius: 'var(--radius-sm)',
              padding: '10px 14px',
              marginBottom: '16px',
              fontSize: '0.85rem',
              color: '#93c5fd',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '8px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>Для договора физлица заполните паспортные данные:</span>
              </div>
              <button
                type="button"
                onClick={onOpenPassportScanner}
                className="btn btn-secondary"
                style={{
                  fontSize: '0.78rem',
                  padding: '4px 10px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  background: 'rgba(59, 130, 246, 0.2)',
                  borderColor: 'rgba(59, 130, 246, 0.4)',
                  color: '#60a5fa'
                }}
              >
                📷 Распознать паспорт РФ
              </button>
            </div>

            <div className="form-group">
              <label>ФИО Заказчика *</label>
              <input
                type="text"
                required
                placeholder="Иванов Иван Иванович"
                value={contractPromptData.name}
                onChange={(e) => setContractPromptData(prev => ({ ...prev, name: e.target.value }))}
                className="search-input"
                style={{ width: '100%', paddingLeft: '12px' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
              <div className="form-group">
                <label>Телефон 1 *</label>
                <input
                  type="text"
                  required
                  placeholder="+7 (917) 000-00-00"
                  value={contractPromptData.phone}
                  onChange={(e) => setContractPromptData(prev => ({ ...prev, phone: e.target.value }))}
                  className="search-input"
                  style={{ width: '100%', paddingLeft: '12px' }}
                />
              </div>
              <div className="form-group">
                <label>Телефон 2 (дополнительный)</label>
                <input
                  type="text"
                  placeholder="+7 (987) 000-00-00"
                  value={contractPromptData.secondPhone}
                  onChange={(e) => setContractPromptData(prev => ({ ...prev, secondPhone: e.target.value }))}
                  className="search-input"
                  style={{ width: '100%', paddingLeft: '12px' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
              <div className="form-group">
                <label>Дата рождения *</label>
                <input
                  type="text"
                  required
                  placeholder="21.05.1985"
                  value={contractPromptData.birthDate}
                  onChange={(e) => setContractPromptData(prev => ({ ...prev, birthDate: e.target.value }))}
                  className="search-input"
                  style={{ width: '100%', paddingLeft: '12px' }}
                />
              </div>
              <div className="form-group">
                <label>Серия и номер паспорта *</label>
                <input
                  type="text"
                  required
                  placeholder="6315 123456"
                  value={contractPromptData.passportSeriesNumber}
                  onChange={(e) => setContractPromptData(prev => ({ ...prev, passportSeriesNumber: e.target.value }))}
                  className="search-input"
                  style={{ width: '100%', paddingLeft: '12px' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label>Кем выдан паспорт *</label>
                <input
                  type="text"
                  required
                  placeholder="Отделом УФМС России по Саратовской обл..."
                  value={contractPromptData.passportIssuedBy}
                  onChange={(e) => setContractPromptData(prev => ({ ...prev, passportIssuedBy: e.target.value }))}
                  className="search-input"
                  style={{ width: '100%', paddingLeft: '12px' }}
                />
              </div>
              <div className="form-group">
                <label>Дата выдачи паспорта *</label>
                <input
                  type="text"
                  required
                  placeholder="11.06.2015"
                  value={contractPromptData.passportIssuedDate}
                  onChange={(e) => setContractPromptData(prev => ({ ...prev, passportIssuedDate: e.target.value }))}
                  className="search-input"
                  style={{ width: '100%', paddingLeft: '12px' }}
                />
              </div>
              <div className="form-group">
                <label>Код подразделения</label>
                <input
                  type="text"
                  placeholder="770-001"
                  value={contractPromptData.passportDepartmentCode}
                  onChange={(e) => setContractPromptData(prev => ({ ...prev, passportDepartmentCode: e.target.value }))}
                  className="search-input"
                  style={{ width: '100%', paddingLeft: '12px' }}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Адрес по прописке (регистрации) *</label>
              <input
                type="text"
                required
                placeholder="г. Саратов, ул. Чернышевского, д. 10, кв. 5"
                value={contractPromptData.registrationAddress}
                onChange={(e) => setContractPromptData(prev => ({ ...prev, registrationAddress: e.target.value }))}
                className="search-input"
                style={{ width: '100%', paddingLeft: '12px' }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Адрес установки (монтажа) *</label>
              <input
                type="text"
                required
                placeholder="г. Саратов, 1-й проезд Степана Разина, 3/7 кв. 222"
                value={contractPromptData.installationAddress}
                onChange={(e) => setContractPromptData(prev => ({ ...prev, installationAddress: e.target.value }))}
                className="search-input"
                style={{ width: '100%', paddingLeft: '12px' }}
              />
            </div>
          </div>
          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onClose}
              disabled={contractPromptLoading}
            >
              Отмена
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={contractPromptLoading}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <FileText size={16} />
              {contractPromptLoading ? 'Формирование договора...' : 'Сохранить и сформировать договор (Word)'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
