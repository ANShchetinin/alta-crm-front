import React from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'success' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    background: 'var(--accent-primary)',
    color: '#fff',
    border: 'none'
  },
  secondary: {
    background: 'rgba(255, 255, 255, 0.08)',
    color: 'var(--text-primary)',
    border: '1px solid var(--glass-border)'
  },
  danger: {
    background: 'rgba(239, 68, 68, 0.15)',
    color: '#ef4444',
    border: '1px solid rgba(239, 68, 68, 0.3)'
  },
  ghost: {
    background: 'transparent',
    color: 'var(--text-secondary)',
    border: 'none'
  },
  success: {
    background: 'rgba(34, 197, 94, 0.15)',
    color: '#22c55e',
    border: '1px solid rgba(34, 197, 94, 0.3)'
  },
  outline: {
    background: 'transparent',
    color: 'var(--text-primary)',
    border: '1px solid var(--glass-border)'
  }
};

const sizeStyles: Record<ButtonSize, { padding: string; fontSize: string; gap: string }> = {
  sm: { padding: '6px 12px', fontSize: '0.82rem', gap: '6px' },
  md: { padding: '9px 16px', fontSize: '0.9rem', gap: '8px' },
  lg: { padding: '12px 22px', fontSize: '1rem', gap: '10px' }
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  children,
  disabled,
  style,
  className = '',
  ...props
}) => {
  const currentVariantStyle = variantStyles[variant];
  const currentSizeStyle = sizeStyles[size];

  return (
    <button
      type={props.type || 'button'}
      disabled={disabled || loading}
      className={`btn btn-${variant} ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 'var(--radius-md)',
        fontWeight: 600,
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        transition: 'all var(--transition-fast)',
        width: fullWidth ? '100%' : 'auto',
        textDecoration: 'none',
        ...currentVariantStyle,
        ...currentSizeStyle,
        ...style
      }}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="animate-spin" size={size === 'sm' ? 14 : size === 'lg' ? 18 : 16} />
          {children && <span>{children}</span>}
        </>
      ) : (
        <>
          {icon && iconPosition === 'left' && icon}
          {children && <span>{children}</span>}
          {icon && iconPosition === 'right' && icon}
        </>
      )}
    </button>
  );
};
