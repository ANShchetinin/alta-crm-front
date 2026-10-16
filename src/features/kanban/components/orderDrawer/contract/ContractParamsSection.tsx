import React from 'react';
import { Pencil, Ruler, Tag } from 'lucide-react';
import type { ContractFieldDefinition } from '../../../../../api/settings';
import type { ContractSummary } from '../../../../../api/kanban';
import type { OrderContractState } from '../../../hooks/useOrderContract';
import { DateInput } from '../../../../../components/ui/DateInput';
import type { RoomParamDefinition } from '../../../../../api/roomParams';
import { useRoomParamsQuery } from '../../../../../hooks/queries/useRoomParamsQuery';
import { measuredContractFields, type MeasuredContractField } from '../../../../measurements/utils/roomParams';

interface ContractParamsSectionProps {
  contract: OrderContractState;
  fieldDefinitions?: ContractFieldDefinition[];
  /** Параметры потолка, посчитанные бэкендом по замеру (до загрузки — нет). */
  summary: ContractSummary | undefined;
  onOpenMeasurement: () => void;
}

const NOTES: Record<ContractSummary['source'], string> = {
  MEASUREMENT: 'Параметры посчитаны по помещениям замера и попадут в договор из него.',
  MANUAL: 'Параметры введены вручную до замера и попадут в договор как есть. После заполнения замера договор возьмет их из него.',
  NONE: 'Площадь, периметр, полотна и другие параметры потолка договор берет из замера.'
};

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
  gap: '10px',
  marginBottom: '12px'
};

/**
 * Подпись поля сетки в одну строку с многоточием (полный текст — в подсказке): если длинная подпись переносится,
 * её поле съезжает вниз и ряд становится неровным.
 */
const gridLabelStyle: React.CSSProperties = {
  fontSize: '0.78rem',
  display: 'block',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis'
};

interface ParamInputProps {
  label: string;
  placeholder: string;
  value: string | undefined;
  onChange: (value: string) => void;
}

const ParamInput: React.FC<ParamInputProps> = ({ label, placeholder, value, onChange }) => (
  <div className="form-group" style={{ marginBottom: 0, minWidth: 0 }}>
    <label style={gridLabelStyle} title={label}>{label}</label>
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

const EMPTY_PARAMS: RoomParamDefinition[] = [];

/** Значение из замера (только просмотр) с подписью, откуда оно взято. */
const MeasuredField: React.FC<{ field: MeasuredContractField }> = ({ field }) => (
  <div className="form-group" style={{ marginBottom: 0, minWidth: 0 }}>
    <label style={gridLabelStyle} title={field.label}>{field.label}</label>
    <input
      type="text"
      placeholder="—"
      value={field.value}
      readOnly
      className="search-input estimate-readonly-field"
      style={{ width: '100%', paddingLeft: '10px' }}
    />
    <small className="contract-measured-source">{field.source}</small>
  </div>
);

/**
 * Параметры спецификации договора: поля, настроенные компанией, либо сводные параметры натяжного потолка.
 * Параметры потолка считаются по замеру и правятся только в нем; у старых заказов без замера показываются
 * значения, введенные вручную (только просмотр).
 */
export const ContractParamsSection: React.FC<ContractParamsSectionProps> = ({
  contract,
  fieldDefinitions,
  summary,
  onOpenMeasurement
}) => {
  const { contractParams, updateContractParam, updateCustomContractParam } = contract;
  const customFields = fieldDefinitions && fieldDefinitions.length > 0 ? fieldDefinitions : null;
  const source = summary?.source ?? 'NONE';
  const fromMeasurement = source === 'MEASUREMENT';
  const showMeasured = !customFields && summary !== undefined && source !== 'NONE';
  // Названия параметров помещения — из настроек
  const { data: roomParams = EMPTY_PARAMS } = useRoomParamsQuery(showMeasured);

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

      {!customFields && (
        <div className="contract-params-note">
          <span>{NOTES[source]}</span>
          <button type="button" className="btn btn-ghost" onClick={onOpenMeasurement}>
            {fromMeasurement ? <><Pencil size={13} /> Изменить в замере</> : <><Ruler size={13} /> Заполнить замер</>}
          </button>
        </div>
      )}

      {customFields && (
        <div style={gridStyle}>
          {customFields.map(field => (
            <ParamInput
              key={field.id}
              label={field.label}
              placeholder={field.placeholder || ''}
              value={contractParams.customParams?.[field.key]}
              onChange={(value) => updateCustomContractParam(field.key, value)}
            />
          ))}
        </div>
      )}

      {showMeasured && summary && (
        <div style={gridStyle}>
          {measuredContractFields(summary, roomParams).map(field => <MeasuredField key={field.key} field={field} />)}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
        {showMeasured && summary && (
          <MeasuredField field={{
            key: 'canvas_article',
            label: 'Артикул полотна (фактура)',
            value: summary.canvasArticle ?? '',
            source: fromMeasurement ? 'полотна помещений' : 'введено вручную до замера'
          }} />
        )}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label style={{ fontSize: '0.78rem' }}>Дата сдачи объекта</label>
          <DateInput
            value={contractParams.handoverDate || ''}
            onChange={(value) => updateContractParam('handoverDate', value)}
            style={{ width: '100%', paddingLeft: '10px' }}
          />
        </div>
      </div>
    </div>
  );
};
