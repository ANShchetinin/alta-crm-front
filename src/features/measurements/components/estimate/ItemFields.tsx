import type { CSSProperties } from 'react';
import type { MeasurementCalculationItemDto } from '../../../../api/measurements';
import type { EstimationServiceSlot } from '../../../../api/estimationServices';
import { SearchSelect } from '../../../../components/SearchSelect';
import { UNIT_OPTIONS, unitChange } from '../../utils/measurementEstimate';

export interface EstimateRowProps {
  item: MeasurementCalculationItemDto;
  index: number;
  /** Слот пакета работ позиции — у него могут быть альтернативные материалы. */
  linkedSlot?: EstimationServiceSlot;
  /** Единица позиции в едином написании. */
  unit: string;
  /** Помещений больше одного — у позиции показывается помещение. */
  showRoom: boolean;
  onUpdate: (patch: Partial<MeasurementCalculationItemDto>) => void;
  onRemove: () => void;
  onSwitchMaterial: (materialId: number) => void;
}

const OPTION_STYLE = { background: 'var(--dropdown-bg, #1e293b)', color: 'var(--text-primary)' } as const;

/** Селект единицы измерения; нестандартная единица позиции тоже остается в списке. */
export const UnitSelect = ({ item, unit, onUpdate, style }: Pick<EstimateRowProps, 'item' | 'unit' | 'onUpdate'> & { style: CSSProperties }) => (
  <select value={unit} onChange={e => onUpdate(unitChange(item, e.target.value))} style={style}>
    {UNIT_OPTIONS.map(option => (
      <option key={option} value={option} style={OPTION_STYLE}>{option}</option>
    ))}
    {!UNIT_OPTIONS.includes(unit) && <option value={unit} style={OPTION_STYLE}>{unit}</option>}
  </select>
);

/**
 * Наименование позиции: выбор из альтернативных материалов слота, если они есть, иначе свободный ввод.
 */
export const ItemNameField = ({ item, linkedSlot, showRoom, onUpdate, onSwitchMaterial, compact }: Pick<
  EstimateRowProps, 'item' | 'linkedSlot' | 'showRoom' | 'onUpdate' | 'onSwitchMaterial'
> & { compact: boolean }) => {
  const hasAlternatives = Boolean(linkedSlot && linkedSlot.materials && linkedSlot.materials.length > 1);

  if (hasAlternatives && linkedSlot) {
    return (
      <SearchSelect
        options={linkedSlot.materials.map(alt => ({
          value: alt.materialId,
          label: alt.materialName,
          price: alt.salePrice,
          unit: alt.unit,
          subLabel: showRoom && item.roomName ? `${item.roomName} • ${linkedSlot.name}` : linkedSlot.name
        }))}
        value={item.materialId}
        onChange={val => {
          if (val) {
            onSwitchMaterial(Number(val));
          }
        }}
        allowClear={false}
        placeholder="Поиск материала..."
        style={{ width: '100%', minHeight: '38px', fontSize: compact ? '0.88rem' : '0.86rem' }}
      />
    );
  }

  return (
    <input
      type="text"
      value={item.name}
      onChange={e => onUpdate({ name: e.target.value })}
      placeholder="Наименование позиции"
      style={compact ? {
        width: '100%',
        height: '38px',
        background: 'var(--input-bg)',
        border: '1px solid var(--glass-border)',
        borderRadius: '6px',
        color: 'var(--text-primary)',
        padding: '0 10px',
        fontSize: '0.88rem',
        fontWeight: 500,
        boxSizing: 'border-box',
        outline: 'none'
      } : {
        width: '100%',
        height: '38px',
        background: 'var(--input-bg, rgba(255,255,255,0.03))',
        border: '1px solid var(--glass-border)',
        borderRadius: 'var(--radius-sm)',
        color: 'var(--text-primary)',
        padding: '0 10px',
        fontSize: '0.86rem',
        boxSizing: 'border-box'
      }}
      onFocus={compact ? undefined : e => (e.target.style.borderColor = 'var(--accent-primary)')}
      onBlur={compact ? undefined : e => (e.target.style.borderColor = 'var(--glass-border)')}
    />
  );
};
