import React from 'react';
import { CheckCircle2, Pencil, Ruler, Sparkles, Table } from 'lucide-react';
import type { OrderContractState } from '../../../hooks/useOrderContract';

interface SpecItemsSectionProps {
  contract: OrderContractState;
  orderId: number | null;
  hasAiEstimate: boolean;
  onOpenMeasurement: () => void;
  onOpenAiEstimate: () => void;
}

const cellStyle: React.CSSProperties = { padding: '6px 8px' };

/**
 * Спецификация договора и акта — только просмотр: позиции правятся в одном месте, во вкладке «Замер и смета»
 * (или ИИ-сметой), и попадают в договор оттуда.
 */
export const SpecItemsSection: React.FC<SpecItemsSectionProps> = ({
  contract,
  orderId,
  hasAiEstimate,
  onOpenMeasurement,
  onOpenAiEstimate
}) => {
  const { specItems } = contract;
  const total = specItems.reduce((sum, it) => sum + (it.total || 0), 0);

  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.02)',
      border: '1px solid var(--glass-border)',
      borderRadius: 'var(--radius-md)',
      padding: '16px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
        <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Table size={15} style={{ color: '#10b981' }} />
          2. Спецификация позиций сметы (для договора и акта)
        </h4>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={onOpenMeasurement}
            className="btn btn-secondary"
            style={{ fontSize: '0.8rem', padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: '5px', minHeight: '36px' }}
            title="Позиции правятся во вкладке «Замер и смета»"
          >
            <Pencil size={13} /> Изменить в смете
          </button>
          {hasAiEstimate && orderId && (
            <button
              type="button"
              onClick={onOpenAiEstimate}
              className="btn btn-ghost"
              style={{
                fontSize: '0.8rem',
                padding: '4px 10px',
                minHeight: '36px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                color: '#8b5cf6',
                background: 'rgba(139, 92, 246, 0.08)',
                border: '1px solid rgba(139, 92, 246, 0.3)'
              }}
              title="AI-наполнение сметы материалами со склада голосом или текстом"
            >
              <Sparkles size={14} style={{ color: '#8b5cf6' }} />
              <span>AI-Смета</span>
              <span style={{
                fontSize: '0.62rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                padding: '1px 5px',
                borderRadius: '4px',
                background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)',
                color: '#ffffff',
                lineHeight: 1.2
              }}>
                beta
              </span>
            </button>
          )}
        </div>
      </div>

      {specItems.length > 0 ? (
        <>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 12px',
            background: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '12px',
            fontSize: '0.8rem',
            color: 'var(--success)',
            gap: '8px',
            flexWrap: 'wrap'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={15} style={{ flexShrink: 0 }} />
              <span>Позиции из сметы заказа подставляются в договор и акт (тег <code>&#123;&#123;spec_table&#125;&#125;</code>).</span>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Позиций: {specItems.length} • Сумма: {total.toLocaleString('ru-RU')} ₽
            </span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-secondary)', textAlign: 'left' }}>
                  <th style={{ ...cellStyle, width: '36px' }}>№</th>
                  <th style={cellStyle}>Наименование</th>
                  <th style={{ ...cellStyle, width: '80px' }}>Кол-во</th>
                  <th style={{ ...cellStyle, width: '70px' }}>Ед.</th>
                  <th style={{ ...cellStyle, width: '100px', textAlign: 'right' }}>Цена (₽)</th>
                  <th style={{ ...cellStyle, width: '110px', textAlign: 'right' }}>Сумма (₽)</th>
                </tr>
              </thead>
              <tbody>
                {specItems.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-primary)' }}>
                    <td style={{ ...cellStyle, color: 'var(--text-secondary)' }}>{idx + 1}</td>
                    <td style={cellStyle}>{item.name}</td>
                    <td style={cellStyle}>{item.quantity}</td>
                    <td style={cellStyle}>{item.unit}</td>
                    <td style={{ ...cellStyle, textAlign: 'right' }}>{(item.price || 0).toLocaleString('ru-RU')}</td>
                    <td style={{ ...cellStyle, textAlign: 'right', fontWeight: 600 }}>{(item.total || 0).toLocaleString('ru-RU')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div style={{
          padding: '12px 14px',
          background: 'rgba(59, 130, 246, 0.08)',
          border: '1px solid rgba(59, 130, 246, 0.25)',
          borderRadius: 'var(--radius-sm)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '0.82rem',
          color: 'var(--text-secondary)'
        }}>
          <Ruler size={16} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
          <span>Позиций пока нет. Составьте смету во вкладке <strong>«Замер и смета»</strong> — она попадет в договор.</span>
        </div>
      )}
    </div>
  );
};
