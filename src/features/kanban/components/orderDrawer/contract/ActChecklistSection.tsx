import React from 'react';
import { FileCheck } from 'lucide-react';
import type { OrderContractState } from '../../../hooks/useOrderContract';

interface ActChecklistSectionProps {
  contract: OrderContractState;
}

/**
 * Чек-лист выполненных работ для Акта: переключение пунктов ДА/НЕТ.
 */
export const ActChecklistSection: React.FC<ActChecklistSectionProps> = ({ contract }) => {
  const { actChecklist, toggleActItem } = contract;

  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.02)',
      border: '1px solid var(--glass-border)',
      borderRadius: 'var(--radius-md)',
      padding: '16px',
      marginBottom: '18px'
    }}>
      <h4 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <FileCheck size={15} style={{ color: '#60a5fa' }} />
        2. Чек-лист выполненных работ для Акта
      </h4>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '8px' }}>
        {actChecklist.map((actItem) => (
          <div
            key={actItem.id}
            onClick={() => toggleActItem(actItem.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              background: actItem.checked ? 'rgba(34, 197, 94, 0.08)' : 'rgba(255, 255, 255, 0.02)',
              border: actItem.checked ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid var(--glass-border)',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              userSelect: 'none'
            }}
          >
            <span style={{ fontSize: '0.8rem', color: actItem.checked ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
              {actItem.name}
            </span>
            <span style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '4px',
              background: actItem.checked ? '#22c55e' : 'rgba(255,255,255,0.08)',
              color: actItem.checked ? '#ffffff' : 'var(--text-secondary)'
            }}>
              {actItem.checked ? 'ДА' : 'НЕТ'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
