import { Bot, Clock, PieChart, Receipt, TrendingDown, User, type LucideIcon } from 'lucide-react';

export type FinanceTab = 'TRANSACTIONS' | 'RECEIVABLES' | 'EXPENSES' | 'INSTALLERS' | 'PL_STRUCTURE' | 'AI_COSTS';

interface TabDefinition {
  id: FinanceTab;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  color: string;
}

const TABS: TabDefinition[] = [
  { id: 'TRANSACTIONS', label: 'Взаиморасчёты и приём оплат', shortLabel: 'Оплаты', icon: Receipt, color: 'var(--accent-primary)' },
  { id: 'RECEIVABLES', label: 'Дебиторка / Должники', shortLabel: 'Дебиторка', icon: Clock, color: '#f59e0b' },
  { id: 'EXPENSES', label: 'Расходы компании', shortLabel: 'Расходы', icon: TrendingDown, color: '#ef4444' },
  { id: 'INSTALLERS', label: 'Расчёты с монтажниками', shortLabel: 'Монтажники', icon: User, color: '#60a5fa' },
  { id: 'PL_STRUCTURE', label: 'Прибыль за период (P&L)', shortLabel: 'Прибыль', icon: PieChart, color: '#c084fc' },
  { id: 'AI_COSTS', label: 'Затраты на ИИ', shortLabel: 'ИИ Расходы', icon: Bot, color: '#38bdf8' }
];

interface FinanceTabsBarProps {
  activeTab: FinanceTab;
  onChange: (tab: FinanceTab) => void;
  /** Счетчики записей на вкладках; вкладки без счетчика его не показывают. */
  counts: Partial<Record<FinanceTab, number>>;
}

/** Переключатель вкладок страницы финансов (на телефоне — короткие подписи с горизонтальной прокруткой). */
export const FinanceTabsBar = ({ activeTab, onChange, counts }: FinanceTabsBarProps) => (
  <div className="finances-tabs-bar">
    {TABS.map(tab => {
      const Icon = tab.icon;
      const active = activeTab === tab.id;
      const count = counts[tab.id];
      const isAccentVar = tab.color.startsWith('var');
      const activeColor = isAccentVar ? 'var(--accent-primary)' : tab.color;
      return (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.85rem',
            fontWeight: active ? 600 : 500,
            border: active ? `1px solid ${tab.color}` : '1px solid var(--glass-border)',
            background: active ? (isAccentVar ? 'rgba(59, 130, 246, 0.18)' : `${tab.color}22`) : 'rgba(255, 255, 255, 0.02)',
            color: active ? activeColor : 'var(--text-secondary)',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            transition: 'all 0.15s ease'
          }}
        >
          <Icon size={16} style={{ color: active ? activeColor : 'var(--text-secondary)', flexShrink: 0 }} />
          <span className="desktop-tab-label">{tab.label}</span>
          <span className="mobile-tab-label">{tab.shortLabel}</span>
          {count !== undefined && count > 0 && (
            <span style={{
              fontSize: '0.72rem',
              background: active ? (isAccentVar ? 'rgba(59, 130, 246, 0.25)' : `${tab.color}33`) : 'rgba(255, 255, 255, 0.06)',
              color: active ? activeColor : 'var(--text-secondary)',
              padding: '1px 6px',
              borderRadius: '10px',
              fontWeight: 700,
              marginLeft: '2px'
            }}>
              {count}
            </span>
          )}
        </button>
      );
    })}
  </div>
);
