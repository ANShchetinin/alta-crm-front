import { useState, type CSSProperties } from 'react';
import { Plus, SlidersHorizontal } from 'lucide-react';
import type { MeasurementRoomDto } from '../../../api/measurements';
import type { RoomParamDefinition } from '../../../api/roomParams';
import { withParamValue } from '../utils/measurementEstimate';
import { roomParamLabel } from '../utils/roomParams';
import { RoomParamModal } from './RoomParamModal';
import { inputStyle, labelStyle, sectionHeaderStyle } from './wizardStyles';

/** Названия параметров бывают длинными: переносятся на вторую строку (поля в сетке выровнены по низу). */
const paramLabelStyle: CSSProperties = { ...labelStyle, whiteSpace: 'normal', height: 'auto', lineHeight: '1.3' };

interface RoomParamsSectionProps {
  room: MeasurementRoomDto;
  /** Действующие параметры компании в порядке показа. */
  params: RoomParamDefinition[];
  onChange: (patch: Partial<MeasurementRoomDto>) => void;
  /** Может ли пользователь добавить параметр компании (владелец, менеджер). */
  canAddParam: boolean;
}

/** Параметры помещения компании: свет, трубы, брус и свои параметры; из них договор берёт сводные значения. */
export const RoomParamsSection = ({ room, params, onChange, canAddParam }: RoomParamsSectionProps) => {
  const [adding, setAdding] = useState(false);

  if (params.length === 0 && !canAddParam) {
    return null;
  }

  const setValue = (key: string, value: string) =>
    onChange({ paramValues: withParamValue(room.paramValues, key, value) });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <div style={{ ...sectionHeaderStyle, marginBottom: 0 }}>
          <SlidersHorizontal size={15} style={{ color: 'var(--accent-primary)' }} />
          Параметры помещения
        </div>
        {canAddParam && (
          <button type="button" onClick={() => setAdding(true)} className="btn btn-ghost room-param-add-btn">
            <Plus size={15} /> Параметр
          </button>
        )}
      </div>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '4px 0 10px' }}>
        Из параметров считаются договор и позиции сметы, привязанные к ним
      </div>

      {params.length > 0 && (
        <div className="wizard-geometry-grid">
          {params.map(param => (
            <div key={param.key} style={{ minWidth: 0 }}>
              <label style={paramLabelStyle} htmlFor={`room-param-${param.key}`}>
                {roomParamLabel(param)}
              </label>
              <input
                id={`room-param-${param.key}`}
                type="text"
                inputMode={param.valueType === 'NUMBER' ? 'decimal' : 'text'}
                value={room.paramValues?.[param.key] ?? ''}
                onChange={e => setValue(param.key, e.target.value)}
                placeholder={param.valueType === 'NUMBER' ? '0' : ''}
                style={{ ...inputStyle, fontSize: '16px' }}
              />
            </div>
          ))}
        </div>
      )}

      {adding && <RoomParamModal onClose={() => setAdding(false)} />}
    </div>
  );
};
