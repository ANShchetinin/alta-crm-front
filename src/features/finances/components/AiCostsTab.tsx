import { Bot, Coins, Cpu, ExternalLink, Phone, RefreshCw, Sparkles } from 'lucide-react';
import type { AiUsageLogDto, AiUsageSummaryDto } from '../../../api/aiUsage';
import { formatDateTimeInTimezone } from '../../../utils/dateUtils';
import { KpiCard } from './KpiCard';

interface AiCostsTabProps {
  summary: AiUsageSummaryDto | null;
  loading: boolean;
  onReload: () => void;
  timezone?: string;
  onOpenOrder: (orderId: number) => void;
}

const formatDuration = (seconds: number) => `${Math.floor(seconds / 60)} мин ${String(seconds % 60).padStart(2, '0')} сек`;

/** Подпись и цвета бейджа сервиса ИИ в журнале обращений. */
const serviceBadge = (serviceType: AiUsageLogDto['serviceType']) => {
  if (serviceType === 'SPEECHKIT') {
    return { label: '🎙️ SpeechKit', background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc' };
  }
  if (serviceType === 'GPT_CHAT') {
    return { label: '💬 AI Чат', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' };
  }
  const labels: Partial<Record<AiUsageLogDto['serviceType'], string>> = {
    GPT_SALES_ADVICE: '🎯 Дожим',
    GPT_CUSTOM: '⚙️ Свой промпт'
  };
  return { label: labels[serviceType] ?? '📋 Саммари', background: 'rgba(234, 179, 8, 0.15)', color: '#facc15' };
};

const CELL = { padding: '10px 12px' } as const;

/** Вкладка расходов компании на ИИ: итоги по сервисам и журнал обращений за период. */
export const AiCostsTab = ({ summary, loading, onReload, timezone, onOpenOrder }: AiCostsTabProps) => {
  const logs = summary?.recentLogs ?? [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div className="finances-kpi-grid" style={{ marginBottom: 0 }}>
        <KpiCard
          label="Всего расходов на ИИ"
          icon={Coins}
          color="#38bdf8"
          rgb="56, 189, 248"
          emphasized
          value={`${Number(summary?.totalCostRubles || 0).toFixed(2)} ₽`}
          hint={`За выбранный период (${summary?.totalRequestsCount || 0} обращений)`}
        />
        <KpiCard
          label="SpeechKit (Распознавание)"
          icon={Phone}
          color="#c084fc"
          rgb="168, 85, 247"
          value={`${Number(summary?.speechkitCostRubles || 0).toFixed(2)} ₽`}
          hint={`Длительность звонков: ${formatDuration(summary?.totalAudioDurationSeconds || 0)}`}
        />
        <KpiCard
          label="YandexGPT Pro 5"
          icon={Sparkles}
          color="#facc15"
          rgb="234, 179, 8"
          value={`${Number(summary?.gptCostRubles || 0).toFixed(2)} ₽`}
          hint={`Токены: ${(summary?.totalTokens || 0).toLocaleString('ru-RU')} `
            + `(вход: ${(summary?.inputTokens || 0).toLocaleString('ru-RU')}, ответ: ${(summary?.outputTokens || 0).toLocaleString('ru-RU')})`}
        />

        <div className="glass-panel" style={{ padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255, 255, 255, 0.08)', background: 'rgba(255, 255, 255, 0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Тарифы Yandex Cloud</span>
            <div style={{ background: 'rgba(255, 255, 255, 0.08)', color: 'var(--text-primary)', padding: '5px', borderRadius: '8px' }}>
              <Cpu size={18} />
            </div>
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '3px', marginTop: '4px' }}>
            <div>• <strong>SpeechKit:</strong> 0.36 ₽ / мин (0.006 ₽ / сек)</div>
            <div>• <strong>GPT Вход:</strong> 0.40 ₽ / 1 000 токенов</div>
            <div>• <strong>GPT Ответ:</strong> 1.20 ₽ / 1 000 токенов</div>
          </div>
        </div>
      </div>

      <div className="glass-panel" style={{ borderRadius: 'var(--radius-md)', padding: '16px', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Bot size={18} style={{ color: '#38bdf8' }} />
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>История обращений и списаний</h3>
            <span style={{ fontSize: '0.75rem', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '2px 8px', borderRadius: '10px', fontWeight: 600 }}>
              {logs.length} записей
            </span>
          </div>

          <button
            type="button"
            onClick={onReload}
            disabled={loading}
            className="btn btn-ghost"
            style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} /> {loading ? 'Обновление...' : 'Обновить'}
          </button>
        </div>

        {loading ? (
          <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            Загрузка данных по расходам на ИИ...
          </div>
        ) : logs.length === 0 ? (
          <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            За выбранный период обращений к ИИ не зафиксировано
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-secondary)', fontSize: '0.8rem', textAlign: 'left' }}>
                  <th style={CELL}>Дата и время</th>
                  <th style={CELL}>Заказ</th>
                  <th style={CELL}>Сервис / Операция</th>
                  <th style={CELL}>Объем (Токены / Время)</th>
                  <th style={{ ...CELL, textAlign: 'right' }}>Сумма (₽)</th>
                  <th style={CELL}>Сотрудник / Детали</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(logItem => {
                  const isSpeech = logItem.serviceType === 'SPEECHKIT';
                  const badge = serviceBadge(logItem.serviceType);
                  return (
                    <tr key={logItem.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)', fontSize: '0.85rem' }}>
                      <td style={{ ...CELL, whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>
                        {formatDateTimeInTimezone(logItem.createdAt, timezone)}
                      </td>
                      <td style={CELL}>
                        {logItem.orderId ? (
                          <button
                            type="button"
                            onClick={() => logItem.orderId && onOpenOrder(logItem.orderId)}
                            style={{
                              background: 'none',
                              border: 'none',
                              padding: 0,
                              color: 'var(--accent-primary)',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontWeight: 600,
                              textAlign: 'left'
                            }}
                          >
                            {logItem.orderNumber ? `№ ${logItem.orderNumber}` : `#${logItem.orderId}`}
                            {logItem.orderAddress && (
                              <span style={{ fontWeight: 400, color: 'var(--text-secondary)', marginLeft: '4px', fontSize: '0.78rem' }}>
                                • {logItem.orderAddress}
                              </span>
                            )}
                            <ExternalLink size={12} />
                          </button>
                        ) : (
                          <span style={{ color: 'var(--text-secondary)' }}>Общий запрос</span>
                        )}
                      </td>
                      <td style={CELL}>
                        <span style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          background: badge.background,
                          color: badge.color
                        }}>
                          {badge.label}
                        </span>
                      </td>
                      <td style={{ ...CELL, color: 'var(--text-secondary)' }}>
                        {isSpeech ? (
                          <span>{formatDuration(logItem.audioDurationSeconds)}</span>
                        ) : (
                          <span>
                            {logItem.totalTokens} токенов{' '}
                            <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>(вх: {logItem.inputTokens} / вых: {logItem.outputTokens})</span>
                          </span>
                        )}
                      </td>
                      <td style={{ ...CELL, textAlign: 'right', fontWeight: 700, color: '#facc15', whiteSpace: 'nowrap' }}>
                        {Number(logItem.costRubles).toFixed(4)} ₽
                      </td>
                      <td style={{ ...CELL, color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                        {logItem.employeeName && (
                          <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{logItem.employeeName} </span>
                        )}
                        {logItem.details && <span>({logItem.details})</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
