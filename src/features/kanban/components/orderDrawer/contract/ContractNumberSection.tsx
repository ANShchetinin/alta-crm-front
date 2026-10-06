import React from 'react';
import { AlertCircle, AlertTriangle, FileText, RefreshCw, X } from 'lucide-react';
import type { ContractTemplateStatus } from '../../../../../api/settings';
import { toast } from '../../../../../utils/toast';
import { toLocalDateString } from '../../../../../utils/dateUtils';
import type { OrderContractState } from '../../../hooks/useOrderContract';
import type { SetOrderFormData } from '../../../utils/orderForm';

interface ContractNumberSectionProps {
  orderNumber: string;
  setFormData: SetOrderFormData;
  contract: OrderContractState;
  templateStatus: ContractTemplateStatus | null;
}

/**
 * Номер и дата договора, проверка наличия шаблона и запуск формирования договора Word.
 */
export const ContractNumberSection: React.FC<ContractNumberSectionProps> = ({ orderNumber, setFormData, contract, templateStatus }) => {
  const { contractParams, selectedClient, updateContractParam, generateOrderNumber, promptLoading, startGenerate } = contract;
  const isLegal = selectedClient?.clientType === 'LEGAL_ENTITY';
  const hasTemplate = isLegal ? !!templateStatus?.legal : !!templateStatus?.individual;
  const missingTemplateMsg = `Шаблон договора для ${isLegal ? 'юридических' : 'физических'} лиц не загружен.\n\n`
    + 'Пожалуйста, перейдите в раздел «Шаблоны договоров» и загрузите .docx файл договора.';

  return (
    <div style={{
      background: 'rgba(59, 130, 246, 0.06)',
      border: '1px solid rgba(59, 130, 246, 0.25)',
      borderRadius: 'var(--radius-md)',
      padding: '14px 16px',
      marginBottom: '18px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
        <label style={{ margin: 0, fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', color: '#60a5fa', fontSize: '0.9rem' }}>
          <FileText size={16} /> Номер и формирование договора
        </label>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            type="button"
            onClick={generateOrderNumber}
            className="btn btn-ghost"
            style={{ padding: '4px 8px', fontSize: '0.78rem', color: 'var(--accent-primary)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            title="Сгенерировать следующий номер по шаблону"
          >
            <RefreshCw size={12} /> Сгенерировать
          </button>
          {orderNumber && (
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, orderNumber: '' }))}
              className="btn btn-ghost"
              style={{ padding: '4px 8px', fontSize: '0.78rem', color: 'var(--danger)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              title="Очистить номер"
            >
              <X size={12} /> Очистить
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', boxSizing: 'border-box' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', width: '100%', boxSizing: 'border-box' }}>
          <div style={{ minWidth: 0 }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Номер договора</label>
            <input
              type="text"
              placeholder="ДОГ-2026/001"
              value={orderNumber || ''}
              onChange={e => setFormData(prev => ({ ...prev, orderNumber: e.target.value }))}
              className="search-input"
              style={{ width: '100%', boxSizing: 'border-box', fontFamily: 'monospace', fontWeight: 700, color: '#4ade80', paddingLeft: '12px' }}
            />
          </div>
          <div style={{ minWidth: 0 }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Дата создания договора</label>
            <input
              type="date"
              value={contractParams.contractDate || toLocalDateString(new Date())}
              onChange={e => updateContractParam('contractDate', e.target.value)}
              className="custom-date-input"
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
          </div>
        </div>
        {!hasTemplate && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            padding: '10px 14px',
            background: 'rgba(245, 158, 11, 0.12)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: 'var(--radius-sm)',
            color: '#fbbf24',
            fontSize: '0.85rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>Шаблон договора для {isLegal ? 'юр. лиц' : 'физ. лиц'} не загружен</span>
            </div>
            <a 
              href="/contract-templates" 
              target="_blank" 
              rel="noreferrer"
              style={{
                fontSize: '0.78rem',
                fontWeight: 600,
                color: '#ffffff',
                background: '#f59e0b',
                padding: '4px 10px',
                borderRadius: '6px',
                textDecoration: 'none',
                whiteSpace: 'nowrap'
              }}
            >
              Загрузить шаблон
            </a>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
          <button
            type="button"
            onClick={startGenerate}
            className="btn btn-primary"
            disabled={promptLoading || !hasTemplate}
            style={{
              flex: 1,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontWeight: 600,
              height: '44px',
              fontSize: '0.92rem',
              opacity: !hasTemplate ? 0.55 : 1,
              cursor: !hasTemplate ? 'not-allowed' : 'pointer'
            }}
            title={!hasTemplate ? `Шаблон договора для ${isLegal ? 'юр. лиц' : 'физ. лиц'} не загружен. Перейдите в раздел «Шаблоны договоров».` : 'Сформировать и скачать договор в формате Word (.docx)'}
          >
            <FileText size={17} /> {promptLoading ? 'Формирование договора...' : 'Сформировать договор (Word)'}
          </button>

          {!hasTemplate && (
            <button
              type="button"
              onClick={() => toast.info(missingTemplateMsg)}
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '8px',
                background: 'rgba(245, 158, 11, 0.15)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                color: '#fbbf24',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0
              }}
              title="Шаблон не загружен! Нажмите для справки"
            >
              <AlertTriangle size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
