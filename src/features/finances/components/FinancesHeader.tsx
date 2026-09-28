import { Wallet, SlidersHorizontal } from 'lucide-react';
import type { OrderStatus } from '../../../api/kanban';
import { PERIOD_OPTIONS, type PeriodFilter } from '../utils/financeCalculations';

interface FinancesHeaderProps {
  statuses: OrderStatus[];
  period: PeriodFilter;
  onPeriodChange: (period: PeriodFilter) => void;
  onOpenStatusConfig: () => void;
}

/** Заголовок страницы финансов: настройка учитываемых статусов и выбор периода. */
export const FinancesHeader = ({ statuses, period, onPeriodChange, onOpenStatusConfig }: FinancesHeaderProps) => (
  <div className="clients-header" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <h1 style={{ margin: 0, fontSize: '1.45rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Wallet size={24} style={{ color: 'var(--accent-primary)' }} /> Финансы и касса
        </h1>
        <span style={{ fontSize: '0.75rem', background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80', padding: '3px 8px', borderRadius: '12px', fontWeight: 600 }}>
          Кассовый метод
        </span>
      </div>
      <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
        Фактический учет поступивших денег, дебиторская задолженность, статьи расходов и выплаты
      </p>
    </div>

    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
      <button
        type="button"
        onClick={onOpenStatusConfig}
        className="btn btn-ghost"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.82rem',
          border: '1px solid var(--glass-border)',
          background: 'rgba(255, 255, 255, 0.03)',
          color: 'var(--text-primary)',
          cursor: 'pointer'
        }}
        title="Настроить статусы заявок, учитываемые в расчетах финансов"
      >
        <SlidersHorizontal size={14} style={{ color: 'var(--accent-primary)' }} />
        <span>Статусы в финансах:</span>
        <span style={{
          fontSize: '0.75rem',
          background: 'rgba(59, 130, 246, 0.15)',
          color: 'var(--accent-primary)',
          padding: '2px 7px',
          borderRadius: '10px',
          fontWeight: 600
        }}>
          {statuses.filter(s => s.includeInFinances !== false).length} из {statuses.length}
        </span>
      </button>

      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
        {PERIOD_OPTIONS.map(option => {
          const active = period === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onPeriodChange(option.value)}
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.82rem',
                fontWeight: active ? 600 : 400,
                border: active ? '1px solid var(--accent-primary)' : '1px solid var(--glass-border)',
                background: active ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.03)',
                color: active ? '#fff' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  </div>
);
