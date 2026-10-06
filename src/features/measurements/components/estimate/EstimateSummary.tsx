import { Box, ChevronDown, ChevronUp, Plus } from 'lucide-react';
import type { EstimateTotals } from '../../utils/measurementEstimate';
import { customItemButtonStyle, warehouseButtonStyle } from '../wizardStyles';

interface EstimateSummaryProps {
  totals: EstimateTotals;
  roomsCount: number;
  itemsCount: number;
  canViewCosts: boolean;
  isManualEditMode: boolean;
  showDetails: boolean;
  onToggleDetails: () => void;
  onAddWarehouseItem: () => void;
  onAddCustomItem: () => void;
}

/** Итог сметы, сводка геометрии, затраты, монтаж и прибыль (всем, кроме монтажника) и кнопки добавления позиций. */
export const EstimateSummary = ({
  totals,
  roomsCount,
  itemsCount,
  canViewCosts,
  isManualEditMode,
  showDetails,
  onToggleDetails,
  onAddWarehouseItem,
  onAddCustomItem
}: EstimateSummaryProps) => (
  <>
    <div className="wizard-summary-top">
      <div>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: 600 }}>
          ИТОГОВАЯ СМЕТА
        </div>
        <div className="wizard-summary-price">
          {totals.totalSalePrice.toLocaleString('ru-RU')} ₽
        </div>
      </div>

      <div className="wizard-stat-pill">
        <div>
          <span>Общая площадь: </span>
          <strong style={{ color: 'var(--text-primary)' }}>{totals.totalArea} м²</strong>
        </div>
        <div>
          <span>Периметр: </span>
          <strong style={{ color: 'var(--text-primary)' }}>{totals.totalPerimeter} м.пог</strong>
        </div>
        <div>
          <span>Помещений: </span>
          <strong style={{ color: 'var(--text-primary)' }}>{roomsCount}</strong>
        </div>
      </div>

      {canViewCosts && (
        <div className="wizard-stat-pill" style={{ fontSize: '0.84rem' }}>
          <div>
            <span style={{ color: 'var(--text-secondary)' }}>Затраты на материалы: </span>
            <strong style={{ color: 'var(--text-primary)' }}>{totals.materialsCost.toLocaleString('ru-RU')} ₽</strong>
          </div>
          {totals.installationPrice > 0 && (
            <div style={{ borderLeft: '1px solid var(--glass-border)', paddingLeft: '12px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Монтаж: </span>
              <strong style={{ color: 'var(--text-primary)' }}>{totals.installationPrice.toLocaleString('ru-RU')} ₽</strong>
            </div>
          )}
          <div style={{ borderLeft: '1px solid var(--glass-border)', paddingLeft: '12px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Прибыль: </span>
            <strong style={{ color: 'var(--accent-primary)' }}>{totals.profit.toLocaleString('ru-RU')} ₽</strong>
            {totals.marginPercent > 0 && (
              <span style={{ marginLeft: '4px', opacity: 0.85, color: 'var(--accent-primary)' }}>
                ({totals.marginPercent}%)
              </span>
            )}
          </div>
        </div>
      )}
    </div>

    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          type="button"
          onClick={onToggleDetails}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--accent-primary)',
            fontSize: '0.88rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: 0
          }}
        >
          {showDetails ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          {showDetails ? 'Скрыть таблицу сметы' : `Позиции сметы (${itemsCount})`}
        </button>
        {isManualEditMode && (
          <span style={{ fontSize: '0.72rem', background: 'rgba(245, 158, 11, 0.2)', color: '#d97706', padding: '2px 8px', borderRadius: '6px', fontWeight: 600 }}>
            Пользовательские правки
          </span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <button type="button" onClick={onAddWarehouseItem} style={{ ...warehouseButtonStyle, padding: '6px 12px', fontSize: '0.82rem' }}>
          <Box size={14} /> + Со склада
        </button>
        <button type="button" onClick={onAddCustomItem} style={{ ...customItemButtonStyle, padding: '6px 12px', fontSize: '0.82rem' }}>
          <Plus size={14} /> + Своя позиция
        </button>
      </div>
    </div>
  </>
);
