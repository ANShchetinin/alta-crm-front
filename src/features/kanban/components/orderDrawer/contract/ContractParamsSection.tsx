import React from 'react';
import { Tag } from 'lucide-react';
import type { ContractFieldDefinition } from '../../../../../api/settings';
import type { ContractParams } from '../../../../../api/kanban';
import type { OrderContractState } from '../../../hooks/useOrderContract';
import { DateInput } from '../../../../../components/ui/DateInput';

interface ContractParamsSectionProps {
  contract: OrderContractState;
  fieldDefinitions?: ContractFieldDefinition[];
}

type CeilingField = 'area' | 'perimeter' | 'canvasesCount' | 'insertLength' | 'pipeCount' | 'lightsCount' | 'timberLength';

const CEILING_FIELDS: { key: CeilingField; label: string; placeholder: string }[] = [
  { key: 'area', label: 'Площадь (м²)', placeholder: '70,3' },
  { key: 'perimeter', label: 'Периметр (м/п)', placeholder: '110,5' },
  { key: 'canvasesCount', label: 'Кол-во полотен', placeholder: '5' },
  { key: 'insertLength', label: 'Вставка (м/п)', placeholder: '20' },
  { key: 'pipeCount', label: 'Обвод труб (шт)', placeholder: '0' },
  { key: 'lightsCount', label: 'Свет. пр. (точек)', placeholder: '30' },
  { key: 'timberLength', label: 'Брус (м/п)', placeholder: '17' }
];

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
  gap: '10px',
  marginBottom: '12px'
};

interface ParamInputProps {
  label: string;
  placeholder: string;
  value: string | undefined;
  onChange: (value: string) => void;
}

const ParamInput: React.FC<ParamInputProps> = ({ label, placeholder, value, onChange }) => (
  <div className="form-group" style={{ marginBottom: 0 }}>
    <label style={{ fontSize: '0.78rem' }}>{label}</label>
    <input
      type="text"
      placeholder={placeholder}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      className="search-input"
      style={{ width: '100%', paddingLeft: '10px' }}
    />
  </div>
);

/**
 * Параметры спецификации договора: поля, настроенные компанией, либо сводные параметры натяжного потолка.
 */
export const ContractParamsSection: React.FC<ContractParamsSectionProps> = ({ contract, fieldDefinitions }) => {
  const { contractParams, updateContractParam, updateCustomContractParam } = contract;
  const customFields = fieldDefinitions && fieldDefinitions.length > 0 ? fieldDefinitions : null;
  const setParam = (key: keyof ContractParams) => (value: string) => updateContractParam(key, value);

  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.02)',
      border: '1px solid var(--glass-border)',
      borderRadius: 'var(--radius-md)',
      padding: '16px',
      marginBottom: '18px'
    }}>
      <h4 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <Tag size={15} style={{ color: 'var(--accent-primary)' }} />
        1. {customFields ? 'Параметры спецификации договора' : 'Сводные параметры потолка'}
      </h4>

      <div style={gridStyle}>
        {customFields
          ? customFields.map(field => (
            <ParamInput
              key={field.id}
              label={field.label}
              placeholder={field.placeholder || ''}
              value={contractParams.customParams?.[field.key]}
              onChange={(value) => updateCustomContractParam(field.key, value)}
            />
          ))
          : CEILING_FIELDS.map(field => (
            <ParamInput
              key={field.key}
              label={field.label}
              placeholder={field.placeholder}
              value={contractParams[field.key]}
              onChange={setParam(field.key)}
            />
          ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
        {!customFields && (
          <ParamInput
            label="Артикул полотна (фактура)"
            placeholder="Полотно Мат 303"
            value={contractParams.canvasArticle}
            onChange={setParam('canvasArticle')}
          />
        )}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label style={{ fontSize: '0.78rem' }}>Дата сдачи объекта</label>
          <DateInput
            value={contractParams.handoverDate || ''}
            onChange={setParam('handoverDate')}
            style={{ width: '100%', paddingLeft: '10px' }}
          />
        </div>
      </div>
    </div>
  );
};
