import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

interface KpiCardProps {
  label: string;
  icon: LucideIcon;
  /** Цвет акцента (иконка и значение). */
  color: string;
  /** Тот же цвет в виде "r, g, b" для полупрозрачных рамки и фона. */
  rgb: string;
  /** Более заметная карточка (итоговый показатель). */
  emphasized?: boolean;
  value: ReactNode;
  /** Цвет значения, если отличается от акцента (например, знак результата). */
  valueColor?: string;
  hint: ReactNode;
}

/** Карточка показателя в сетке `finances-kpi-grid`. */
export const KpiCard = ({ label, icon: Icon, color, rgb, emphasized = false, value, valueColor, hint }: KpiCardProps) => (
  <div
    className="glass-panel"
    style={{
      padding: '16px',
      borderRadius: 'var(--radius-md)',
      border: `1px solid rgba(${rgb}, ${emphasized ? 0.3 : 0.25})`,
      background: `linear-gradient(135deg, rgba(${rgb}, ${emphasized ? 0.1 : 0.08}), rgba(255, 255, 255, 0.02))`
    }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
      <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{label}</span>
      <div style={{ background: `rgba(${rgb}, ${emphasized ? 0.2 : 0.15})`, color, padding: '5px', borderRadius: '8px' }}>
        <Icon size={18} />
      </div>
    </div>
    <div style={{ fontSize: '1.45rem', fontWeight: 700, color: valueColor ?? color }}>
      {value}
    </div>
    <div style={{ fontSize: '0.73rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
      {hint}
    </div>
  </div>
);
