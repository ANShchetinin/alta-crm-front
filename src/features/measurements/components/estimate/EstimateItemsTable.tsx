import { Trash2 } from 'lucide-react';
import { ItemNameField, UnitSelect, type EstimateRowProps } from './ItemFields';
import { parseQuantityInput } from '../../utils/measurementEstimate';

const CELL = { padding: '6px 10px' } as const;
const FIELD = {
  width: '100%',
  height: '38px',
  background: 'var(--input-bg, rgba(255,255,255,0.04))',
  border: '1px solid var(--glass-border)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-primary)',
  boxSizing: 'border-box'
} as const;

const EMPTY_TEXT = 'Нет позиций в смете. Выберите нужные виды работ выше или добавьте позиции со склада кнопкой «+ Со склада».';

const EstimateTableRow = ({ item, index, linkedSlot, unit, showRoom, onUpdate, onRemove, onSwitchMaterial }: EstimateRowProps) => (
  <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
    <td style={{ ...CELL, color: 'var(--text-secondary)', fontWeight: 600 }}>{index + 1}</td>
    <td style={CELL}>
      <div>
        <ItemNameField
          item={item}
          linkedSlot={linkedSlot}
          showRoom={showRoom}
          onUpdate={onUpdate}
          onSwitchMaterial={onSwitchMaterial}
          compact={false}
        />
        {showRoom && item.roomName && (
          <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', paddingLeft: '4px', marginTop: '3px', fontWeight: 500 }}>
            📍 {item.roomName}
          </div>
        )}
      </div>
    </td>
    <td style={CELL}>
      <input
        type="number"
        step={unit === 'шт' ? '1' : '0.01'}
        min="0"
        value={item.quantity || ''}
        onChange={e => onUpdate({ quantity: parseQuantityInput(e.target.value, unit) })}
        placeholder="0"
        style={{ ...FIELD, textAlign: 'center', fontWeight: 700, fontSize: '0.92rem', padding: '0 6px', outline: 'none' }}
      />
    </td>
    <td style={CELL}>
      <UnitSelect
        item={item}
        unit={unit}
        onUpdate={onUpdate}
        style={{ ...FIELD, textAlign: 'center', fontWeight: 600, fontSize: '0.86rem', padding: '0 4px', outline: 'none', cursor: 'pointer' }}
      />
    </td>
    <td style={CELL}>
      <input
        type="number"
        step="0.01"
        min="0"
        value={item.unitSalePrice || ''}
        onChange={e => onUpdate({ unitSalePrice: parseFloat(e.target.value) || 0 })}
        placeholder="0"
        style={{ ...FIELD, textAlign: 'right', padding: '0 10px', fontWeight: 600, fontSize: '0.92rem' }}
      />
    </td>
    <td style={{ ...CELL, textAlign: 'right', fontWeight: 800, fontSize: '0.95rem', color: '#16a34a', whiteSpace: 'nowrap' }}>
      {(item.totalSalePrice || 0).toLocaleString('ru-RU')} ₽
    </td>
    <td style={{ ...CELL, textAlign: 'center' }}>
      <button
        type="button"
        onClick={onRemove}
        style={{
          background: 'none',
          border: 'none',
          color: '#ef4444',
          cursor: 'pointer',
          padding: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: 0.8
        }}
        title="Удалить позицию"
      >
        <Trash2 size={15} />
      </button>
    </td>
  </tr>
);

/** Смета таблицей для экранов шире 768px. */
export const EstimateItemsTable = ({ rows }: { rows: EstimateRowProps[] }) => (
  <div className="wizard-table-desktop" style={{
    background: 'var(--table-bg, rgba(0, 0, 0, 0.2))',
    borderRadius: '8px',
    border: '1px solid var(--glass-border)',
    overflowX: 'auto',
    WebkitOverflowScrolling: 'touch'
  }}>
    <table style={{ width: '100%', minWidth: '640px', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
      <thead>
        <tr style={{ background: 'var(--table-header-bg, rgba(255, 255, 255, 0.06))', color: 'var(--text-secondary)', textAlign: 'left' }}>
          <th style={{ padding: '8px 4px', width: '30px', textAlign: 'center' }}>#</th>
          <th style={{ padding: '8px 8px', minWidth: '180px' }}>Наименование позиции / выбор материала</th>
          <th style={{ padding: '8px 4px', width: '84px', textAlign: 'center' }}>Кол-во</th>
          <th style={{ padding: '8px 4px', width: '76px', textAlign: 'center' }}>Ед.</th>
          <th style={{ padding: '8px 6px', width: '105px', textAlign: 'right' }}>Цена (₽)</th>
          <th style={{ padding: '8px 8px', width: '110px', textAlign: 'right' }}>Сумма (₽)</th>
          <th style={{ padding: '8px 2px', width: '32px' }}></th>
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>{EMPTY_TEXT}</td>
          </tr>
        ) : (
          rows.map(row => <EstimateTableRow key={row.index} {...row} />)
        )}
      </tbody>
    </table>
  </div>
);
