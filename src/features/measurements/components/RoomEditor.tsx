import { Check, Layers, Minus, Plus, Ruler, Trash2 } from 'lucide-react';
import type { MeasurementRoomDto } from '../../../api/measurements';
import type { EstimationService } from '../../../api/estimationServices';
import { inputStyle, labelStyle, sectionHeaderStyle } from './wizardStyles';

interface RoomEditorProps {
  room: MeasurementRoomDto;
  canRemove: boolean;
  onChange: (patch: Partial<MeasurementRoomDto>) => void;
  onRemove: () => void;
  services: EstimationService[];
  isServiceActive: (service: EstimationService) => boolean;
  onToggleService: (service: EstimationService) => void;
}

/** Карточка помещения: название, геометрия и пакеты работ для сметы. */
export const RoomEditor = ({ room, canRemove, onChange, onRemove, services, isServiceActive, onToggleService }: RoomEditorProps) => (
  <div style={{
    background: 'var(--card-bg, rgba(255, 255, 255, 0.02))',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-lg)',
    padding: '18px',
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
    boxSizing: 'border-box'
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
      <div style={{ flex: 1, minWidth: '200px', maxWidth: '340px' }}>
        <input
          type="text"
          value={room.roomName}
          onChange={e => onChange({ roomName: e.target.value })}
          placeholder="Название помещения"
          style={{
            ...inputStyle,
            fontSize: '1.05rem',
            fontWeight: 600,
            background: 'var(--input-bg)',
            border: '1px solid var(--accent-primary, rgba(59, 130, 246, 0.4))'
          }}
        />
      </div>

      {canRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="btn-icon"
          style={{
            color: '#ef4444',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            borderRadius: '8px',
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer',
            fontSize: '0.82rem',
            fontWeight: 500,
            minHeight: '38px'
          }}
          title="Удалить это помещение"
        >
          <Trash2 size={15} /> Удалить комнату
        </button>
      )}
    </div>

    <div>
      <div style={sectionHeaderStyle}>
        <Ruler size={15} style={{ color: 'var(--accent-primary)' }} />
        Геометрия помещения
      </div>
      <div className="wizard-geometry-grid">
        <div style={{ minWidth: 0 }}>
          <label style={labelStyle}>Площадь (м²)</label>
          <input
            type="number"
            step="0.1"
            min="0"
            value={room.area || ''}
            onChange={e => onChange({ area: parseFloat(e.target.value) || 0 })}
            style={{ ...inputStyle, fontWeight: 700, fontSize: '1.05rem', color: '#16a34a' }}
          />
        </div>

        <div style={{ minWidth: 0 }}>
          <label style={labelStyle}>Периметр (м.пог)</label>
          <input
            type="number"
            step="0.1"
            min="0"
            value={room.perimeter || ''}
            onChange={e => onChange({ perimeter: parseFloat(e.target.value) || 0 })}
            style={{ ...inputStyle, fontWeight: 600 }}
          />
        </div>

        <div style={{ minWidth: 0 }}>
          <label style={labelStyle}>Высота стен (м)</label>
          <input
            type="number"
            step="0.05"
            min="1"
            value={room.height || 2.7}
            onChange={e => onChange({ height: parseFloat(e.target.value) || 2.7 })}
            style={inputStyle}
          />
        </div>

        <div style={{ minWidth: 0 }}>
          <label style={labelStyle}>Доп. углы (&gt;4)</label>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            height: '42px',
            background: 'var(--input-bg)',
            border: '1px solid var(--glass-border)',
            borderRadius: 'var(--radius-sm)',
            overflow: 'hidden',
            boxSizing: 'border-box'
          }}>
            <button
              type="button"
              onClick={() => onChange({ extraCorners: Math.max(0, (room.extraCorners || 0) - 1) })}
              className="wizard-stepper-btn"
            >
              <Minus size={18} />
            </button>
            <input
              type="number"
              min="0"
              value={room.extraCorners || 0}
              onChange={e => onChange({ extraCorners: parseInt(e.target.value) || 0 })}
              style={{
                flex: 1,
                minWidth: 0,
                width: '100%',
                height: '100%',
                border: 'none',
                background: 'transparent',
                color: 'var(--text-primary)',
                textAlign: 'center',
                fontWeight: 700,
                fontSize: '1rem',
                outline: 'none',
                padding: 0
              }}
            />
            <button
              type="button"
              onClick={() => onChange({ extraCorners: (room.extraCorners || 0) + 1 })}
              className="wizard-stepper-btn"
            >
              <Plus size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>

    {services.length > 0 && (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
          <div style={sectionHeaderStyle}>
            <Layers size={15} style={{ color: 'var(--accent-primary)' }} />
            Виды работ и комплектация
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            Нажмите, чтобы включить или исключить пакет работ из сметы
          </span>
        </div>

        <div className="wizard-services-grid">
          {services.map(service => {
            const active = isServiceActive(service);
            return (
              <button
                key={service.id}
                type="button"
                onClick={() => onToggleService(service)}
                className={`wizard-service-chip ${active ? 'active' : ''}`}
              >
                {active ? <Check size={16} /> : <Plus size={16} style={{ opacity: 0.6 }} />}
                <span>{service.name}</span>
                <span style={{
                  fontSize: '0.72rem',
                  opacity: 0.85,
                  background: active ? 'rgba(0,0,0,0.2)' : 'var(--wizard-stat-bg, rgba(255,255,255,0.06))',
                  color: active ? '#ffffff' : 'var(--text-primary)',
                  padding: '1px 6px',
                  borderRadius: '10px'
                }}>
                  {service.slots?.length || 0} поз.
                </span>
              </button>
            );
          })}
        </div>
      </div>
    )}
  </div>
);
