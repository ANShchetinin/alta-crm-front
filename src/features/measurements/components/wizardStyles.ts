import type { CSSProperties } from 'react';

export const inputStyle: CSSProperties = {
  width: '100%',
  height: '42px',
  background: 'var(--input-bg, rgba(255, 255, 255, 0.05))',
  border: '1px solid var(--glass-border)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-primary)',
  padding: '0 12px',
  fontSize: '0.95rem',
  outline: 'none',
  boxSizing: 'border-box'
};

export const labelStyle: CSSProperties = {
  fontSize: '0.78rem',
  color: 'var(--text-secondary)',
  display: 'block',
  marginBottom: '6px',
  fontWeight: 500,
  height: '18px',
  lineHeight: '18px',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis'
};

export const sectionHeaderStyle: CSSProperties = {
  fontSize: '0.84rem',
  fontWeight: 600,
  color: 'var(--text-secondary)',
  marginBottom: '10px',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  textTransform: 'uppercase',
  letterSpacing: '0.5px'
};

/** Кнопка «+ Со склада» в разных местах сметы. */
export const warehouseButtonStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '5px',
  borderRadius: '6px',
  background: 'rgba(59, 130, 246, 0.12)',
  border: '1px solid rgba(59, 130, 246, 0.35)',
  color: 'var(--accent-primary)',
  fontWeight: 600,
  cursor: 'pointer'
};

/** Кнопка «+ Своя позиция» в разных местах сметы. */
export const customItemButtonStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '5px',
  borderRadius: '6px',
  background: 'var(--row-hover-bg, rgba(255, 255, 255, 0.06))',
  border: '1px solid var(--glass-border)',
  color: 'var(--text-primary)',
  fontWeight: 500,
  cursor: 'pointer'
};
