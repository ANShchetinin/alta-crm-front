import { Edit3, FileText, Plus, Trash2 } from 'lucide-react';
import { EXPENSE_CATEGORIES, type Expense } from '../../../api/finances';
import { formatDateOnly } from '../../../utils/dateUtils';
import { FilterChip } from './FilterChip';

interface ExpensesTabProps {
  /** Все расходы компании — для счетчика «Все категории». */
  totalCount: number;
  expenses: Expense[];
  category: string;
  onCategoryChange: (category: string) => void;
  onCreate: () => void;
  onEdit: (expense: Expense) => void;
  onDelete: (id: number, title: string) => void;
  onOpenOrder: (orderId: number) => void;
}

const categoryBadgeStyle = {
  fontWeight: 600,
  background: 'rgba(239, 68, 68, 0.12)',
  color: '#f87171',
  border: '1px solid rgba(239, 68, 68, 0.25)'
} as const;

const EMPTY_TEXT = 'Расходов за выбранный период не зафиксировано';

/** Вкладка расходов компании: фильтр по категории, таблица (десктоп) и карточки (телефон). */
export const ExpensesTab = ({
  totalCount,
  expenses,
  category,
  onCategoryChange,
  onCreate,
  onEdit,
  onDelete,
  onOpenOrder
}: ExpensesTabProps) => (
  <div>
    <div className="finances-controls-bar">
      <div className="finances-payment-filters">
        <FilterChip active={category === 'ALL'} onClick={() => onCategoryChange('ALL')}>
          Все категории ({totalCount})
        </FilterChip>
        {EXPENSE_CATEGORIES.map(cat => (
          <FilterChip key={cat.value} active={category === cat.value} onClick={() => onCategoryChange(cat.value)}>
            {cat.label}
          </FilterChip>
        ))}
      </div>

      <button
        type="button"
        onClick={onCreate}
        className="btn btn-primary"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
      >
        <Plus size={16} /> Добавить расход
      </button>
    </div>

    <div className="finances-expenses-desktop glass-panel" style={{ overflowX: 'auto', borderRadius: 'var(--radius-md)' }}>
      <table className="clients-table" style={{ width: '100%', fontSize: '0.85rem' }}>
        <thead>
          <tr>
            <th style={{ padding: '12px 14px' }}>Дата</th>
            <th>Категория</th>
            <th>Назначение расхода</th>
            <th>Привязка к сделке</th>
            <th>Сумма (₽)</th>
            <th>Автор</th>
            <th style={{ textAlign: 'right' }}>Действия</th>
          </tr>
        </thead>
        <tbody>
          {expenses.length === 0 ? (
            <tr>
              <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                {EMPTY_TEXT}
              </td>
            </tr>
          ) : (
            expenses.map(exp => (
              <tr key={exp.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                  {formatDateOnly(exp.expenseDate)}
                </td>
                <td>
                  <span style={{ ...categoryBadgeStyle, fontSize: '0.74rem', padding: '3px 8px', borderRadius: '6px' }}>
                    {exp.categoryLabel || exp.category}
                  </span>
                </td>
                <td>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{exp.title}</div>
                  {exp.comment && (
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {exp.comment}
                    </div>
                  )}
                </td>
                <td>
                  {exp.orderId ? (
                    <button
                      type="button"
                      onClick={() => exp.orderId && onOpenOrder(exp.orderId)}
                      className="btn btn-ghost"
                      style={{ padding: '2px 6px', fontSize: '0.74rem', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                    >
                      <FileText size={12} /> {exp.orderNumber ? `№ ${exp.orderNumber}` : `#${exp.orderId}`} {exp.clientName ? `(${exp.clientName})` : ''}
                    </button>
                  ) : (
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>—</span>
                  )}
                </td>
                <td style={{ fontWeight: 700, color: '#ef4444', fontSize: '0.95rem' }}>
                  −{(exp.amount || 0).toLocaleString('ru-RU')} ₽
                </td>
                <td style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                  {exp.createdByName || '—'}
                </td>
                <td style={{ textAlign: 'right', padding: '10px 14px' }}>
                  <div style={{ display: 'inline-flex', gap: '4px' }}>
                    <button type="button" onClick={() => onEdit(exp)} className="btn-icon" title="Редактировать расход" style={{ padding: '6px' }}>
                      <Edit3 size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(exp.id, exp.title)}
                      className="btn-icon"
                      title="Удалить расход"
                      style={{ padding: '6px', color: 'var(--danger)' }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>

    <div className="finances-expenses-mobile">
      {expenses.length === 0 ? (
        <div className="glass-panel" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          {EMPTY_TEXT}
        </div>
      ) : (
        expenses.map(exp => {
          const categoryLabel = EXPENSE_CATEGORIES.find(c => c.value === exp.category)?.label;
          return (
            <div key={exp.id} className="glass-panel" style={{ padding: '14px', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span style={{
                    ...categoryBadgeStyle,
                    fontSize: '0.72rem',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    display: 'inline-block',
                    marginBottom: '4px'
                  }}>
                    {categoryLabel || exp.category}
                  </span>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                    {exp.title}
                  </div>
                </div>
                <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ef4444' }}>
                  −{exp.amount.toLocaleString('ru-RU')} ₽
                </div>
              </div>

              {exp.comment && (
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', background: 'rgba(255, 255, 255, 0.02)', padding: '6px 10px', borderRadius: '4px' }}>
                  {exp.comment}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.76rem', color: 'var(--text-secondary)', borderTop: '1px solid rgba(255, 255, 255, 0.04)', paddingTop: '8px' }}>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span>📅 {formatDateOnly(exp.expenseDate)}</span>
                  {exp.orderId && (
                    <button
                      type="button"
                      onClick={() => exp.orderId && onOpenOrder(exp.orderId)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--accent-primary)',
                        fontSize: '0.76rem',
                        cursor: 'pointer',
                        padding: 0,
                        textDecoration: 'underline'
                      }}
                    >
                      Заказ #{exp.orderId}
                    </button>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => onEdit(exp)}
                    className="btn-icon"
                    style={{ width: '28px', height: '28px' }}
                    title="Редактировать расход"
                  >
                    <Edit3 size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(exp.id, exp.title)}
                    className="btn-icon delete"
                    style={{ width: '28px', height: '28px', color: 'var(--danger)' }}
                    title="Удалить расход"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  </div>
);
