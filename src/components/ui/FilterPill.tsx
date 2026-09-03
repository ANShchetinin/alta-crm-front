import React from 'react';

export interface FilterPillProps {
  active: boolean;
  onClick: () => void;
  label: React.ReactNode;
  count?: number | string;
  icon?: React.ReactNode;
  variant?: 'default' | 'warning' | 'danger' | 'success';
}

const variantStyles: Record<string, { activeBg: string; activeColor: string; activeBorder: string }> = {
  default: {
    activeBg: 'rgba(59, 130, 246, 0.18)',
    activeColor: 'var(--accent-primary)',
    activeBorder: 'var(--accent-primary)'
  },
  warning: {
    activeBg: 'rgba(245, 158, 11, 0.18)',
    activeColor: '#f59e0b',
    activeBorder: '#f59e0b'
  },
  danger: {
    activeBg: 'rgba(239, 68, 68, 0.18)',
    activeColor: '#ef4444',
    activeBorder: '#ef4444'
  },
  success: {
    activeBg: 'rgba(34, 197, 94, 0.18)',
    activeColor: '#22c55e',
    activeBorder: '#22c55e'
  }
};

export const FilterPill: React.FC<FilterPillProps> = ({
  active,
  onClick,
  label,
  count,
  icon,
  variant = 'default'
}) => {
  const currentVariant = variantStyles[variant] || variantStyles.default;

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 12px',
        borderRadius: '20px',
        fontSize: '0.82rem',
        fontWeight: active ? 600 : 500,
        border: active ? `1px solid ${currentVariant.activeBorder}` : '1px solid var(--glass-border)',
        background: active ? currentVariant.activeBg : 'rgba(255, 255, 255, 0.04)',
        color: active ? currentVariant.activeColor : 'var(--text-secondary)',
        cursor: 'pointer',
        transition: 'all var(--transition-fast)',
        whiteSpace: 'nowrap'
      }}
    >
      {icon && <span style={{ display: 'inline-flex', alignItems: 'center' }}>{icon}</span>}
      <span>{label}</span>
      {count !== undefined && (
        <span
          style={{
            padding: '1px 6px',
            borderRadius: '10px',
            fontSize: '0.72rem',
            fontWeight: 700,
            background: active ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.06)',
            color: active ? currentVariant.activeColor : 'var(--text-secondary)'
          }}
        >
          {count}
        </span>
      )}
    </button>
  );
};
