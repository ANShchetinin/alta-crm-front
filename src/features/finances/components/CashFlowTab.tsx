import { PieChart } from 'lucide-react';
import type { CashMetrics } from '../utils/financeCalculations';

const rub = (value: number) => `${value.toLocaleString('ru-RU')} ₽`;

/** Доля от выручки для полосы структуры, в процентах. */
const shareOfRevenue = (value: number, revenue: number) => (revenue > 0 ? Math.min(100, (value / revenue) * 100) : 0);

const LEGEND_SWATCH = { width: '10px', height: '10px', borderRadius: '2px' } as const;
const ROW_BORDER = '1px solid rgba(255, 255, 255, 0.04)';
const SUB_ROW = { color: 'var(--text-secondary)', fontSize: '0.82rem' } as const;

/**
 * Вкладка прибыли за период (P&L по завершённым заказам): полоса структуры выручки, расчёт прибыли
 * и справочно — деньги, фактически полученные за период.
 */
export const CashFlowTab = ({ metrics }: { metrics: CashMetrics }) => {
  const revenue = metrics.completedRevenue;
  const segments = [
    { key: 'materials', color: '#f59e0b', value: metrics.materialsCost, title: 'Материалы' },
    { key: 'installation', color: '#60a5fa', value: metrics.completedInstallationsCost, title: 'Монтаж' },
    { key: 'expenses', color: '#ef4444', value: metrics.totalExpenses, title: 'Расходы компании' },
    { key: 'ai', color: '#c084fc', value: metrics.aiCosts, title: 'Расходы на ИИ' },
    { key: 'profit', color: '#4ade80', value: Math.max(0, metrics.profit), title: 'Прибыль' }
  ];
  const legend = [
    { color: '#f59e0b', label: 'Себестоимость материалов', value: metrics.materialsCost },
    { color: '#60a5fa', label: 'Оплата монтажных работ', value: metrics.completedInstallationsCost },
    { color: '#ef4444', label: 'Прочие расходы компании', value: metrics.totalExpenses },
    { color: '#c084fc', label: 'Расходы на ИИ', value: metrics.aiCosts },
    { color: '#4ade80', label: 'Прибыль', value: metrics.profit }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--radius-md)' }}>
        <h3 style={{ margin: '0 0 6px 0', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <PieChart size={20} style={{ color: 'var(--accent-primary)' }} /> Прибыль за период
        </h3>
        <p style={{ margin: '0 0 16px 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          По заказам, завершённым в выбранном периоде: их выручка минус материалы и монтаж, а также расходы компании и расходы на ИИ за период.
        </p>

        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px 12px', fontSize: '0.82rem', marginBottom: '6px' }}>
            <span style={{ color: '#4ade80', fontWeight: 600 }}>
              Выручка: +{rub(revenue)} (100%)
            </span>
            <span style={{ color: '#ef4444', fontWeight: 600 }}>
              Затраты: −{rub(metrics.totalCosts)}
            </span>
          </div>
          <div style={{ height: '14px', borderRadius: '7px', background: 'rgba(255, 255, 255, 0.05)', overflow: 'hidden', display: 'flex' }}>
            {segments.map(segment => (
              <div
                key={segment.key}
                style={{ width: `${shareOfRevenue(segment.value, revenue)}%`, background: segment.color }}
                title={`${segment.title}: ${rub(segment.value)}`}
              />
            ))}
          </div>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '10px', fontSize: '0.78rem' }}>
            {legend.map(item => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ ...LEGEND_SWATCH, background: item.color }} />
                <span>{item.label}: <strong>{rub(item.value)}</strong></span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '16px' }}>
          <table style={{ width: '100%', fontSize: '0.88rem' }}>
            <tbody>
              <tr style={{ borderBottom: ROW_BORDER }}>
                <td style={{ padding: '8px 0', fontWeight: 600 }}>1. Выручка завершённых заказов</td>
                <td style={{ textAlign: 'right', fontWeight: 700, color: '#4ade80' }}>+{rub(revenue)}</td>
              </tr>

              <tr style={{ borderBottom: ROW_BORDER }}>
                <td style={{ padding: '8px 0', fontWeight: 600 }}>2. Затраты</td>
                <td style={{ textAlign: 'right', fontWeight: 700, color: '#ef4444' }}>−{rub(metrics.totalCosts)}</td>
              </tr>
              <tr style={SUB_ROW}>
                <td style={{ padding: '4px 0 4px 16px' }}>— Себестоимость материалов</td>
                <td style={{ textAlign: 'right' }}>−{rub(metrics.materialsCost)}</td>
              </tr>
              <tr style={SUB_ROW}>
                <td style={{ padding: '4px 0 4px 16px' }}>— Вознаграждение монтажникам</td>
                <td style={{ textAlign: 'right' }}>−{rub(metrics.completedInstallationsCost)}</td>
              </tr>
              <tr style={SUB_ROW}>
                <td style={{ padding: '4px 0 4px 16px' }}>— Расходы компании за период</td>
                <td style={{ textAlign: 'right' }}>−{rub(metrics.totalExpenses)}</td>
              </tr>
              <tr style={{ ...SUB_ROW, borderBottom: ROW_BORDER }}>
                <td style={{ padding: '4px 0 8px 16px' }}>— Расходы на ИИ за период</td>
                <td style={{ textAlign: 'right' }}>−{rub(metrics.aiCosts)}</td>
              </tr>

              <tr style={{ background: 'rgba(255, 255, 255, 0.03)' }}>
                <td style={{ padding: '12px 10px', fontWeight: 700, fontSize: '1rem' }}>ИТОГО ПРИБЫЛЬ ЗА ПЕРИОД:</td>
                <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: 700, fontSize: '1.2rem', color: metrics.profit >= 0 ? '#4ade80' : '#ef4444' }}>
                  {rub(metrics.profit)}
                </td>
              </tr>

              <tr>
                <td style={{ padding: '16px 0 8px', fontWeight: 600 }}>Справочно: получено денег за период</td>
                <td style={{ padding: '16px 0 8px', textAlign: 'right', fontWeight: 700 }}>+{rub(metrics.totalCashInflow)}</td>
              </tr>
              <tr style={SUB_ROW}>
                <td style={{ padding: '4px 0 4px 16px' }}>— Авансы клиентов (в том числе по незавершённым заказам)</td>
                <td style={{ textAlign: 'right' }}>+{rub(metrics.receivedPrepayments)}</td>
              </tr>
              <tr style={SUB_ROW}>
                <td style={{ padding: '4px 0 4px 16px' }}>— Доплаты (остатки)</td>
                <td style={{ textAlign: 'right' }}>+{rub(metrics.receivedRemainders)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
