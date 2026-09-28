import { Plus } from 'lucide-react';
import type { MeasurementRoomDto } from '../../../api/measurements';
import { PRESET_ROOMS } from '../utils/measurementEstimate';

interface RoomTabsProps {
  rooms: MeasurementRoomDto[];
  activeIdx: number;
  onSelect: (idx: number) => void;
  onAdd: (preset?: string) => void;
}

/** Вкладки помещений с площадью, добавление помещения и шаблоны названий. */
export const RoomTabs = ({ rooms, activeIdx, onSelect, onAdd }: RoomTabsProps) => (
  <>
    <div className="wizard-room-tabs-bar">
      {rooms.map((room, idx) => {
        const isActive = idx === activeIdx;
        return (
          <button
            key={idx}
            type="button"
            onClick={() => onSelect(idx)}
            className={`wizard-room-tab-btn ${isActive ? 'active' : ''}`}
          >
            <span>{room.roomName || `Помещение ${idx + 1}`}</span>
            <span style={{
              fontSize: '0.74rem',
              opacity: 0.9,
              background: isActive ? 'rgba(0, 0, 0, 0.25)' : 'var(--wizard-stat-bg, rgba(255, 255, 255, 0.08))',
              color: isActive ? '#ffffff' : 'var(--text-primary)',
              padding: '2px 7px',
              borderRadius: '10px',
              fontWeight: 600
            }}>
              {room.area || 0} м²
            </span>
          </button>
        );
      })}

      <button
        type="button"
        onClick={() => onAdd()}
        style={{
          padding: '8px 14px',
          borderRadius: 'var(--radius-md)',
          background: 'transparent',
          border: '1px dashed var(--accent-primary, rgba(59, 130, 246, 0.5))',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '0.85rem',
          color: 'var(--accent-primary)',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          flexShrink: 0,
          fontWeight: 500,
          minHeight: '40px'
        }}
      >
        <Plus size={15} /> Добавить
      </button>
    </div>

    <div className="wizard-presets-row">
      <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Шаблоны:</span>
      {PRESET_ROOMS.map(preset => (
        <button key={preset} type="button" onClick={() => onAdd(preset)} className="wizard-preset-chip">
          + {preset}
        </button>
      ))}
    </div>
  </>
);
