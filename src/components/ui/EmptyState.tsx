import React from 'react';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = '',
  style
}) => {
  return (
    <div
      className={`crm-empty-state ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '36px 20px',
        textAlign: 'center',
        borderRadius: 'var(--radius-lg, 12px)',
        border: '1px dashed var(--glass-border, #e2e8f0)',
        backgroundColor: 'var(--table-header-bg, rgba(248, 250, 252, 0.5))',
        ...style
      }}
    >
      {icon && (
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            backgroundColor: 'var(--input-bg, rgba(59, 130, 246, 0.08))',
            color: 'var(--accent-primary, #2563eb)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '12px'
          }}
        >
          {icon}
        </div>
      )}

      <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary, #0f172a)', marginBottom: '4px' }}>
        {title}
      </div>

      {description && (
        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary, #64748b)', maxWidth: '380px', marginBottom: action ? '16px' : 0 }}>
          {description}
        </div>
      )}

      {action && (
        <div style={{ marginTop: '12px' }}>
          {action}
        </div>
      )}
    </div>
  );
};
