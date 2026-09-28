import { PieChart } from 'lucide-react';
import type { CashMetrics } from '../utils/financeCalculations';

const rub = (value: number) => `${value.toLocaleString('ru-RU')} ₽`;

/** Доля затрат от прихода для полосы ДДС, в процентах. */
const shareOfInflow = (value: number, inflow: number) => (inflow > 0 ? Math.min(100, (value / inflow) * 100) : 0);

const LEGEND_SWATCH = { width: '10px', height: '10px', borderRadius: '2px' } as const;

/** Вкладка движения денежных средств: полоса структуры расходов и отчет P&L кассовым методом. */
export const CashFlowTab = ({ metrics }: { metrics: CashMetrics }) => {
  const inflow = metrics.totalCashInflow;
  const segments = [
    { key: 'materials', color: '#f59e0b', width: shareOfInflow(metrics.materialsCost, inflow), title: `Материалы: ${rub(metrics.materialsCost)}` },
    {
      key: 'installation',
      color: '#60a5fa',
      width: shareOfInflow(metrics.completedInstallationsCost, inflow),
      title: `Монтаж: ${rub(metrics.completedInstallationsCost)}`
    },
    { key: 'expenses', color: '#ef4444', width: shareOfInflow(metrics.totalExpenses, inflow), title: `Расходы компании: ${rub(metrics.totalExpenses)}` },
    {
      key: 'profit',
      color: '#4ade80',
      width: inflow > 0 ? Math.max(0, (metrics.netCashProfit / inflow) * 100) : 0,
      title: `Чистая прибыль: ${rub(metrics.netCashProfit)}`
    }
  ];
  const legend = [
    { color: '#f59e0b', label: 'Себестоимость материалов', value: metrics.materialsCost },
    { color: '#60a5fa', label: 'Оплата монтажных работ', value: metrics.completedInstallationsCost },
    { color: '#ef4444', label: 'Прочие расходы компании', value: metrics.totalExpenses },
    { color: '#4ade80', label: 'Чистый остаток кассы', value: metrics.netCashProfit }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--radius-md)' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <PieChart size={20} style={{ color: 'var(--accent-primary)' }} /> Структура движения денежных средств (ДДС)
        </h3>

        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '6px' }}>
            <span style={{ color: '#4ade80', fontWeight: 600 }}>
              Приход: +{rub(inflow)} (100%)
            </span>
            <span style={{ color: '#ef4444', fontWeight: 600 }}>
              Расход: −{rub(metrics.totalCashOutflow)}
            </span>
          </div>
          <div style={{ height: '14px', borderRadius: '7px', background: 'rgba(255, 255, 255, 0.05)', overflow: 'hidden', display: 'flex' }}>
            {segments.map(segment => (
              <div key={segment.key} style={{ width: `${segment.width}%`, background: segment.color }} title={segment.title} />
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
              <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                <td style={{ padding: '8px 0', fontWeight: 600 }}>1. Фактический приход денежных средств</td>
                <td style={{ textAlign: 'right', fontWeight: 700, color: '#4ade80' }}>+{rub(inflow)}</td>
              </tr>
              <tr style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                <td style={{ padding: '4px 0 4px 16px' }}>— Полученные авансы клиентов</td>
                <td style={{ textAlign: 'right' }}>+{rub(metrics.receivedPrepayments)}</td>
              </tr>
              <tr style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                <td style={{ padding: '4px 0 8px 16px' }}>— Полученные доплаты (остатки)</td>
                <td style={{ textAlign: 'right' }}>+{rub(metrics.receivedRemainders)}</td>
              </tr>

              <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                <td style={{ padding: '8px 0', fontWeight: 600 }}>2. Фактические затраты и выплаты</td>
                <td style={{ textAlign: 'right', fontWeight: 700, color: '#ef4444' }}>−{rub(metrics.totalCashOutflow)}</td>
              </tr>
              <tr style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                <td style={{ padding: '4px 0 4px 16px' }}>— Себестоимость комплектующих и материалов</td>
                <td style={{ textAlign: 'right' }}>−{rub(metrics.materialsCost)}</td>
              </tr>
              <tr style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                <td style={{ padding: '4px 0 4px 16px' }}>— Вознаграждение монтажникам (выполненные монтажи)</td>
                <td style={{ textAlign: 'right' }}>−{rub(metrics.completedInstallationsCost)}</td>
              </tr>
              <tr style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                <td style={{ padding: '4px 0 8px 16px' }}>— Статьи операционных расходов компании</td>
                <td style={{ textAlign: 'right' }}>−{rub(metrics.totalExpenses)}</td>
              </tr>

              <tr style={{ background: 'rgba(255, 255, 255, 0.03)' }}>
                <td style={{ padding: '12px 10px', fontWeight: 700, fontSize: '1rem' }}>ИТОГО ЧИСТЫЙ ДЕНЕЖНЫЙ РЕЗУЛЬТАТ:</td>
                <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: 700, fontSize: '1.2rem', color: metrics.netCashProfit >= 0 ? '#4ade80' : '#ef4444' }}>
                  {rub(metrics.netCashProfit)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
