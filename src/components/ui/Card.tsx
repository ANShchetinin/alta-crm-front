import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  hoverable?: boolean;
  compact?: boolean;
  className?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  header,
  footer,
  hoverable = false,
  compact = false,
  className = '',
  style,
  ...props
}) => {
  return (
    <div
      className={`crm-card ${hoverable ? 'crm-card-hover' : ''} ${className}`}
      style={{
        backgroundColor: 'var(--bg-secondary, #ffffff)',
        border: '1px solid var(--glass-border, #e2e8f0)',
        borderRadius: 'var(--radius-md, 10px)',
        boxShadow: 'var(--card-shadow, 0 1px 3px rgba(0, 0, 0, 0.04))',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        transition: 'border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease',
        ...style
      }}
      {...props}
    >
      {header && (
        <div
          style={{
            padding: compact ? '8px 12px' : '12px 16px',
            borderBottom: '1px solid var(--glass-border, #e2e8f0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            background: 'var(--bg-surface-elevated, transparent)'
          }}
        >
          {header}
        </div>
      )}

      <div
        style={{
          padding: compact ? '10px 12px' : '16px',
          flex: 1
        }}
      >
        {children}
      </div>

      {footer && (
        <div
          style={{
            padding: compact ? '8px 12px' : '10px 16px',
            borderTop: '1px solid var(--glass-border, #e2e8f0)',
            background: 'var(--table-header-bg, #f8fafc)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px'
          }}
        >
          {footer}
        </div>
      )}
    </div>
  );
};
