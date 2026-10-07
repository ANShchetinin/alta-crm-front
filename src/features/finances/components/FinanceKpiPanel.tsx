import { useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Box, Clock, Sparkles, User } from 'lucide-react';
import { KpiCard } from './KpiCard';
import type { CashMetrics } from '../utils/financeCalculations';

const rub = (value: number) => `${value.toLocaleString('ru-RU')} ₽`;

interface FinanceKpiPanelProps {
  metrics: CashMetrics;
  expensesCount: number;
}

/** Ключевые показатели (прибыль по завершённым заказам, полученные деньги, долги): сетка карточек и компактная сворачиваемая строка на телефоне. */
export const FinanceKpiPanel = ({ metrics, expensesCount }: FinanceKpiPanelProps) => {
  const [collapsedOnMobile, setCollapsedOnMobile] = useState(true);
  const resultColor = metrics.profit >= 0 ? '#4ade80' : '#ef4444';

  return (
    <>
      <div className="finances-kpi-mobile-banner">
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', flex: 1 }}>
          <div style={{ fontSize: '0.82rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Приход: </span>
            <strong style={{ color: '#4ade80' }}>+{rub(metrics.totalCashInflow)}</strong>
          </div>
          <div style={{ fontSize: '0.82rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Прибыль: </span>
            <strong style={{ color: resultColor }}>{rub(metrics.profit)}</strong>
          </div>
          <div style={{ fontSize: '0.82rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Долги: </span>
            <strong style={{ color: '#f59e0b' }}>{rub(metrics.pendingReceivables)}</strong>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setCollapsedOnMobile(!collapsedOnMobile)}
          style={{
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid var(--glass-border)',
            borderRadius: 'var(--radius-sm)',
            padding: '4px 8px',
            fontSize: '0.75rem',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          {collapsedOnMobile ? 'Все показатели ▾' : 'Свернуть ▴'}
        </button>
      </div>

      <div className={`finances-kpi-grid ${collapsedOnMobile ? 'collapsed-mobile' : ''}`}>
        <KpiCard
          label="Реально получено"
          icon={ArrowDownRight}
          color="#4ade80"
          rgb="34, 197, 94"
          value={rub(metrics.totalCashInflow)}
          hint={`Авансы: ${rub(metrics.receivedPrepayments)} • Доплаты: ${rub(metrics.receivedRemainders)}`}
        />
        <KpiCard
          label="Дебиторка (Долги)"
          icon={Clock}
          color="#f59e0b"
          rgb="245, 158, 11"
          value={rub(metrics.pendingReceivables)}
          hint="Неоплаченные остатки и авансы по сделкам"
        />
        <KpiCard
          label="Затраты на материалы"
          icon={Box}
          color="#fbbf24"
          rgb="251, 191, 36"
          value={rub(metrics.materialsCost)}
          hint="Себестоимость материалов завершённых заказов"
        />
        <KpiCard
          label="Расходы компании"
          icon={ArrowUpRight}
          color="#ef4444"
          rgb="239, 68, 68"
          value={rub(metrics.totalExpenses)}
          hint={`Аренда, маркетинг, доставка и прочее (${expensesCount} записей)`}
        />
        <KpiCard
          label="Начислено монтажникам"
          icon={User}
          color="#60a5fa"
          rgb="59, 130, 246"
          value={rub(metrics.completedInstallationsCost)}
          hint="По фактически завершённым монтажам"
        />
        <KpiCard
          label="Прибыль за период"
          icon={Sparkles}
          color="#c084fc"
          rgb="168, 85, 247"
          emphasized
          value={rub(metrics.profit)}
          valueColor={resultColor}
          hint={`Выручка завершённых заказов (${rub(metrics.completedRevenue)}) − Затраты (${rub(metrics.totalCosts)})`}
        />
      </div>
    </>
  );
};
