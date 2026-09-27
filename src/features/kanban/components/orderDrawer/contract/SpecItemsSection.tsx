import React from 'react';
import { CheckCircle2, Plus, RefreshCw, Ruler, Sparkles, Table, Trash2 } from 'lucide-react';
import type { OrderContractState } from '../../../hooks/useOrderContract';

interface SpecItemsSectionProps {
  contract: OrderContractState;
  orderId: number | null;
  hasAiEstimate: boolean;
  onOpenMeasurement: () => void;
  onOpenAiEstimate: () => void;
}

/**
 * Спецификация позиций сметы для договора и акта: синхронизация с замером, AI-смета и ручное редактирование строк.
 */
export const SpecItemsSection: React.FC<SpecItemsSectionProps> = ({
  contract,
  orderId,
  hasAiEstimate,
  onOpenMeasurement,
  onOpenAiEstimate
}) => {
  const { specItems, addSpecItem, updateSpecItem, removeSpecItem, isSyncingMeasurement, syncFromMeasurement } = contract;

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
          3. Спецификация позиций сметы (для договора и акта)
        </h4>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {orderId && (
            <button
              type="button"
              onClick={syncFromMeasurement}
              disabled={isSyncingMeasurement}
              className="btn btn-ghost"
              style={{ fontSize: '0.8rem', padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: '5px', color: 'var(--accent-primary)', border: '1px solid var(--glass-border)' }}
              title="Синхронизировать позиции и цены из вкладки «Замер и смета»"
            >
              <RefreshCw size={13} className={isSyncingMeasurement ? 'animate-spin' : ''} />
              {isSyncingMeasurement ? 'Синхронизация...' : 'Обновить из замера'}
            </button>
          )}
          <button
            type="button"
            onClick={onOpenMeasurement}
            className="btn btn-ghost"
            style={{ fontSize: '0.8rem', padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#a855f7', border: '1px solid var(--glass-border)' }}
            title="Перейти в интерактивный калькулятор замера"
          >
            <Ruler size={13} /> Замер и смета
          </button>
          {hasAiEstimate && orderId && (
            <button
              type="button"
              onClick={onOpenAiEstimate}
              className="btn btn-ghost"
              style={{
                fontSize: '0.8rem',
                padding: '4px 10px',
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
          <button
            type="button"
            onClick={addSpecItem}
            className="btn btn-secondary"
            style={{ fontSize: '0.8rem', padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
          >
            <Plus size={14} /> Добавить позицию
          </button>
        </div>
      </div>

      {/* Информационная плашка синхронизации */}
      {specItems.length > 0 ? (
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
          color: '#34d399',
          gap: '8px',
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={15} style={{ color: '#10b981', flexShrink: 0 }} />
            <span>Спецификация сформирована из замера и подставляется в печатную форму договора/акта (тег <code>&#123;&#123;spec_table&#125;&#125;</code>).</span>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            Позиций: {specItems.length} • Сумма: {specItems.reduce((sum, it) => sum + (it.total || 0), 0).toLocaleString('ru-RU')} ₽
          </span>
        </div>
      ) : (
        <div style={{
          padding: '12px 14px',
          background: 'rgba(59, 130, 246, 0.08)',
          border: '1px solid rgba(59, 130, 246, 0.25)',
          borderRadius: 'var(--radius-sm)',
          marginBottom: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: '#93c5fd' }}>
            <Ruler size={16} style={{ color: '#60a5fa', flexShrink: 0 }} />
            <span>Позиции не заполнены. Вы можете составить смету во вкладке <strong>«Замер и смета»</strong> или добавить строки вручную.</span>
          </div>
        </div>
      )}

      {specItems.length === 0 ? (
        <div style={{
          padding: '20px',
          textAlign: 'center',
          background: 'rgba(255, 255, 255, 0.01)',
          border: '1px dashed var(--glass-border)',
          borderRadius: 'var(--radius-sm)',
          color: 'var(--text-secondary)',
          fontSize: '0.85rem'
        }}>
          Позиции сметы отсутствуют. Нажмите «Обновить из замера» или «Добавить позицию».
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-secondary)', textAlign: 'left' }}>
                <th style={{ padding: '6px 8px', width: '36px' }}>№</th>
                <th style={{ padding: '6px 8px' }}>Наименование</th>
                <th style={{ padding: '6px 8px', width: '80px' }}>Кол-во</th>
                <th style={{ padding: '6px 8px', width: '70px' }}>Ед.</th>
                <th style={{ padding: '6px 8px', width: '100px' }}>Цена (₽)</th>
                <th style={{ padding: '6px 8px', width: '110px' }}>Сумма (₽)</th>
                <th style={{ padding: '6px 8px', width: '36px' }}></th>
              </tr>
            </thead>
            <tbody>
              {specItems.map((item, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <td style={{ padding: '6px 8px', color: 'var(--text-secondary)' }}>{idx + 1}</td>
                  <td style={{ padding: '4px 6px' }}>
                    <input
                      type="text"
                      value={item.name}
                      placeholder="Наименование товара / услуги..."
                      onChange={(e) => updateSpecItem(idx, { name: e.target.value })}
                      className="search-input"
                      style={{ width: '100%', fontSize: '0.85rem', padding: '4px 8px' }}
                    />
                  </td>
                  <td style={{ padding: '4px 6px' }}>
                    <input
                      type="text"
                      value={item.quantity}
                      onChange={(e) => updateSpecItem(idx, { quantity: e.target.value })}
                      className="search-input"
                      style={{ width: '100%', fontSize: '0.85rem', padding: '4px 8px' }}
                    />
                  </td>
                  <td style={{ padding: '4px 6px' }}>
                    <input
                      type="text"
                      value={item.unit}
                      onChange={(e) => updateSpecItem(idx, { unit: e.target.value })}
                      className="search-input"
                      style={{ width: '100%', fontSize: '0.85rem', padding: '4px 8px' }}
                    />
                  </td>
                  <td style={{ padding: '4px 6px' }}>
                    <input
                      type="number"
                      value={item.price || ''}
                      onChange={(e) => updateSpecItem(idx, { price: parseFloat(e.target.value) || 0 })}
                      className="search-input"
                      style={{ width: '100%', fontSize: '0.85rem', padding: '4px 8px' }}
                    />
                  </td>
                  <td style={{ padding: '6px 8px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {(item.total || 0).toLocaleString('ru-RU')} ₽
                  </td>
                  <td style={{ padding: '4px 6px', textAlign: 'center' }}>
                    <button
                      type="button"
                      onClick={() => removeSpecItem(idx)}
                      className="btn btn-ghost"
                      style={{ padding: '4px', color: 'var(--danger)' }}
                      title="Удалить строку"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
