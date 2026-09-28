import type { ReactNode } from 'react';

interface FilterChipProps {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}

/** Кнопка-фильтр в панели `finances-payment-filters`. */
export const FilterChip = ({ active, onClick, children }: FilterChipProps) => (
  <button
    type="button"
    onClick={onClick}
    style={{
      padding: '5px 10px',
      borderRadius: 'var(--radius-sm)',
      fontSize: '0.78rem',
      fontWeight: active ? 600 : 400,
      border: active ? '1px solid var(--accent-primary)' : '1px solid var(--glass-border)',
      background: active ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.02)',
      color: active ? '#60a5fa' : 'var(--text-secondary)',
      cursor: 'pointer',
      whiteSpace: 'nowrap'
    }}
  >
    {children}
  </button>
);
