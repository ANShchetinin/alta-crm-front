import { Box, Minus, Plus, Trash2 } from 'lucide-react';
import { customItemButtonStyle, warehouseButtonStyle } from '../wizardStyles';
import { ItemNameField, UnitSelect, type EstimateRowProps } from './ItemFields';
import { parseQuantityInput } from '../../utils/measurementEstimate';

interface EstimateItemCardsProps {
  rows: EstimateRowProps[];
  onAddWarehouseItem: () => void;
  onAddCustomItem: () => void;
}

const LABEL = { fontSize: '0.74rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px', fontWeight: 500 } as const;
const STEPPER_BUTTON = {
  width: '38px',
  minWidth: '38px',
  flexShrink: 0,
  height: '100%',
  background: 'var(--row-hover-bg)',
  border: 'none',
  color: 'var(--text-primary)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  touchAction: 'manipulation'
} as const;
const FIELD = {
  width: '100%',
  height: '42px',
  background: 'var(--input-bg)',
  border: '1px solid var(--glass-border)',
  borderRadius: 'var(--radius-sm)',
  boxSizing: 'border-box',
  outline: 'none'
} as const;

const EstimateCard = ({ item, index, linkedSlot, unit, showRoom, onUpdate, onRemove, onSwitchMaterial }: EstimateRowProps) => {
  const caption = showRoom && item.roomName
    ? `${item.roomName}${linkedSlot ? ` • ${linkedSlot.name}` : ''}`
    : (linkedSlot?.name || '');
  const stepQuantity = (delta: number) => onUpdate({ quantity: Math.max(0, Math.round(((item.quantity || 0) + delta) * 100) / 100) });

  return (
    <div style={{
      background: 'var(--card-bg, rgba(255, 255, 255, 0.03))',
      border: '1px solid var(--glass-border)',
      borderRadius: 'var(--radius-md)',
      padding: '12px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      boxShadow: 'var(--glass-shadow)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
          <span style={{
            fontSize: '0.74rem',
            fontWeight: 700,
            color: 'var(--accent-primary)',
            background: 'rgba(59, 130, 246, 0.14)',
            padding: '2px 7px',
            borderRadius: '4px',
            flexShrink: 0
          }}>
            #{index + 1}
          </span>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {caption}
          </span>
        </div>

        <button
          type="button"
          onClick={onRemove}
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            borderRadius: '6px',
            color: '#ef4444',
            cursor: 'pointer',
            padding: '3px 8px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '0.74rem',
            fontWeight: 500,
            flexShrink: 0
          }}
        >
          <Trash2 size={13} /> Удалить
        </button>
      </div>

      <div>
        <ItemNameField
          item={item}
          linkedSlot={linkedSlot}
          showRoom={showRoom}
          onUpdate={onUpdate}
          onSwitchMaterial={onSwitchMaterial}
          compact
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '4px' }}>
        <div style={{ minWidth: 0 }}>
          <label style={LABEL}>Количество:</label>
          <div style={{ ...FIELD, display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
            <button type="button" onClick={() => stepQuantity(-1)} style={STEPPER_BUTTON}>
              <Minus size={16} />
            </button>
            <input
              type="number"
              step={unit === 'шт' ? '1' : '0.01'}
              min="0"
              value={item.quantity || ''}
              onChange={e => onUpdate({ quantity: parseQuantityInput(e.target.value, unit) })}
              placeholder="0"
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
                fontSize: '1.05rem',
                outline: 'none',
                padding: 0
              }}
            />
            <button type="button" onClick={() => stepQuantity(1)} style={STEPPER_BUTTON}>
              <Plus size={16} />
            </button>
          </div>
        </div>

        <div style={{ minWidth: 0 }}>
          <label style={LABEL}>Ед. измерения:</label>
          <UnitSelect
            item={item}
            unit={unit}
            onUpdate={onUpdate}
            style={{
              ...FIELD,
              color: 'var(--accent-primary)',
              fontSize: '0.95rem',
              fontWeight: 700,
              padding: '0 10px',
              textAlign: 'center',
              cursor: 'pointer'
            }}
          />
        </div>

        <div style={{ minWidth: 0 }}>
          <label style={LABEL}>Цена за ед. (₽):</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={item.unitSalePrice || ''}
            onChange={e => onUpdate({ unitSalePrice: parseFloat(e.target.value) || 0 })}
            placeholder="0"
            style={{ ...FIELD, textAlign: 'right', color: 'var(--text-primary)', padding: '0 12px', fontWeight: 600, fontSize: '0.95rem' }}
          />
        </div>

        <div style={{ minWidth: 0 }}>
          <label style={LABEL}>Итого за позицию:</label>
          <div style={{
            height: '42px',
            background: 'var(--wizard-stat-bg, rgba(22, 163, 74, 0.08))',
            border: '1px solid rgba(22, 163, 74, 0.3)',
            borderRadius: 'var(--radius-sm)',
            padding: '0 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            fontSize: '1.05rem',
            fontWeight: 800,
            color: '#16a34a',
            boxSizing: 'border-box'
          }}>
            {(item.totalSalePrice || 0).toLocaleString('ru-RU')} ₽
          </div>
        </div>
      </div>
    </div>
  );
};

/** Смета карточками для телефона (экраны до 768px) с крупными полями и степпером количества. */
export const EstimateItemCards = ({ rows, onAddWarehouseItem, onAddCustomItem }: EstimateItemCardsProps) => (
  <div className="wizard-cards-mobile">
    {rows.length === 0 ? (
      <div style={{
        padding: '24px 16px',
        textAlign: 'center',
        background: 'var(--table-bg, rgba(0, 0, 0, 0.2))',
        border: '1px solid var(--glass-border)',
        borderRadius: 'var(--radius-md)',
        color: 'var(--text-secondary)',
        fontSize: '0.84rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '12px'
      }}>
        <div>Нет позиций в смете. Выберите нужные виды работ выше или добавьте позиции со склада кнопкой «+ Со склада».</div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            type="button"
            onClick={onAddWarehouseItem}
            style={{ ...warehouseButtonStyle, gap: '6px', padding: '8px 14px', background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.4)', fontSize: '0.84rem' }}
          >
            <Box size={14} /> + Добавить со склада
          </button>
          <button type="button" onClick={onAddCustomItem} style={{ ...customItemButtonStyle, gap: '6px', padding: '8px 14px', fontSize: '0.84rem' }}>
            <Plus size={14} /> + Своя позиция
          </button>
        </div>
      </div>
    ) : (
      <>
        {rows.map(row => <EstimateCard key={row.index} {...row} />)}
        <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
          <button
            type="button"
            onClick={onAddWarehouseItem}
            style={{ ...warehouseButtonStyle, flex: 1, justifyContent: 'center', gap: '6px', padding: '10px 12px', borderRadius: '8px', fontSize: '0.85rem' }}
          >
            <Box size={15} /> + Со склада
          </button>
          <button
            type="button"
            onClick={onAddCustomItem}
            style={{ ...customItemButtonStyle, flex: 1, justifyContent: 'center', gap: '6px', padding: '10px 12px', borderRadius: '8px', fontSize: '0.85rem' }}
          >
            <Plus size={15} /> + Своя позиция
          </button>
        </div>
      </>
    )}
  </div>
);
