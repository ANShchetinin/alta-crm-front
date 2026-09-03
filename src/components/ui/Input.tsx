import React, { forwardRef } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  helperText,
  icon,
  iconRight,
  style,
  className = '',
  id,
  disabled,
  ...props
}, ref) => {
  const inputId = id || (label ? `input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

  return (
    <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
      {label && (
        <label htmlFor={inputId} style={{ margin: 0, fontSize: '0.88rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
          {label}
        </label>
      )}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
        {icon && (
          <span style={{
            position: 'absolute',
            left: '12px',
            display: 'flex',
            alignItems: 'center',
            color: 'var(--text-secondary)',
            pointerEvents: 'none',
            zIndex: 1
          }}>
            {icon}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          disabled={disabled}
          className={`input-field ${error ? 'is-invalid' : ''} ${className}`}
          style={{
            width: '100%',
            padding: icon && iconRight ? '10px 36px' : icon ? '10px 12px 10px 36px' : iconRight ? '10px 36px 10px 12px' : '10px 12px',
            background: 'var(--input-bg, rgba(255, 255, 255, 0.05))',
            border: error ? '1px solid #ef4444' : '1px solid var(--glass-border, rgba(255, 255, 255, 0.12))',
            borderRadius: 'var(--radius-md, 8px)',
            color: 'var(--text-primary)',
            fontSize: '0.9rem',
            outline: 'none',
            transition: 'border-color var(--transition-fast)',
            opacity: disabled ? 0.6 : 1,
            cursor: disabled ? 'not-allowed' : 'text',
            ...style
          }}
          {...props}
        />
        {iconRight && (
          <span style={{
            position: 'absolute',
            right: '12px',
            display: 'flex',
            alignItems: 'center',
            color: 'var(--text-secondary)',
            zIndex: 1
          }}>
            {iconRight}
          </span>
        )}
      </div>
      {error && (
        <span style={{ fontSize: '0.78rem', color: '#ef4444', marginTop: '2px' }}>
          {error}
        </span>
      )}
      {!error && helperText && (
        <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
          {helperText}
        </span>
      )}
    </div>
  );
});

Input.displayName = 'Input';
