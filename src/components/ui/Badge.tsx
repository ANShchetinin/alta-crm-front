import React from 'react';

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'purple';
export type BadgeSize = 'sm' | 'md';

export interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  dotColor?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}

const variantStyles: Record<BadgeVariant, { bg: string; color: string; border: string }> = {
  success: {
    bg: 'rgba(34, 197, 94, 0.15)',
    color: '#4ade80',
    border: 'rgba(34, 197, 94, 0.3)'
  },
  warning: {
    bg: 'rgba(245, 158, 11, 0.15)',
    color: '#fbbf24',
    border: 'rgba(245, 158, 11, 0.3)'
  },
  danger: {
    bg: 'rgba(239, 68, 68, 0.15)',
    color: '#f87171',
    border: 'rgba(239, 68, 68, 0.3)'
  },
  info: {
    bg: 'rgba(59, 130, 246, 0.15)',
    color: '#60a5fa',
    border: 'rgba(59, 130, 246, 0.3)'
  },
  neutral: {
    bg: 'rgba(255, 255, 255, 0.08)',
    color: 'var(--text-secondary)',
    border: 'rgba(255, 255, 255, 0.15)'
  },
  purple: {
    bg: 'rgba(168, 85, 247, 0.15)',
    color: '#c084fc',
    border: 'rgba(168, 85, 247, 0.3)'
  }
};

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  size = 'md',
  dot = false,
  dotColor,
  icon,
  children,
  style,
  className = ''
}) => {
  const currentVariant = variantStyles[variant];

  return (
    <span
      className={`badge badge-${variant} ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: size === 'sm' ? '4px' : '6px',
        padding: size === 'sm' ? '2px 6px' : '4px 10px',
        fontSize: size === 'sm' ? '0.72rem' : '0.8rem',
        fontWeight: 600,
        borderRadius: 'var(--radius-sm, 6px)',
        background: currentVariant.bg,
        color: currentVariant.color,
        border: `1px solid ${currentVariant.border}`,
        whiteSpace: 'nowrap',
        lineHeight: 1.2,
        ...style
      }}
    >
      {dot && (
        <span
          style={{
            width: size === 'sm' ? '6px' : '8px',
            height: size === 'sm' ? '6px' : '8px',
            borderRadius: '50%',
            backgroundColor: dotColor || currentVariant.color,
            flexShrink: 0
          }}
        />
      )}
      {icon && <span style={{ display: 'inline-flex', alignItems: 'center' }}>{icon}</span>}
      {children}
    </span>
  );
};
