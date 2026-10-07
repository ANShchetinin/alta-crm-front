import type { FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { Check, X } from 'lucide-react';
import { EXPENSE_CATEGORIES, type ExpenseCategory } from '../../../api/finances';
import type { Order } from '../../../api/kanban';
import type { ExpenseFormData } from '../hooks/useExpenseEditor';

interface ExpenseModalProps {
  isEditing: boolean;
  form: ExpenseFormData;
  onChange: (form: ExpenseFormData) => void;
  /** Заказы для привязки расхода к сделке. */
  orders: Order[];
  onSave: () => void;
  onClose: () => void;
}

/** Модальное окно создания и редактирования расхода компании. */
export const ExpenseModal = ({ isEditing, form, onChange, orders, onSave, onClose }: ExpenseModalProps) => {
  const update = (patch: Partial<ExpenseFormData>) => onChange({ ...form, ...patch });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSave();
  };

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
        <div className="modal-header">
          <h2>{isEditing ? 'Редактировать расход' : 'Новый расход компании'}</h2>
          <button type="button" onClick={onClose} className="btn-icon">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="form-group">
              <label>Название / Назначение платежа *</label>
              <input
                type="text"
                required
                placeholder="Например: Аренда офиса за Август или Реклама в Яндексе"
                value={form.title}
                onChange={(e) => update({ title: e.target.value })}
                className="search-input"
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <div className="form-group" style={{ flex: 1, minWidth: '180px' }}>
                <label>Категория расхода *</label>
                <select
                  value={form.category}
                  onChange={(e) => update({ category: e.target.value as ExpenseCategory })}
                  className="custom-select"
                  style={{ width: '100%' }}
                >
                  {EXPENSE_CATEGORIES.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ flex: 1, minWidth: '140px' }}>
                <label>Сумма расхода (₽) *</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  placeholder="0"
                  value={form.amount}
                  onChange={(e) => update({ amount: e.target.value })}
                  className="custom-number-input"
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            {form.category === 'SALARY' && (
              <div className="expense-salary-hint" role="note">
                Оплата монтажникам за монтаж по заказам учитывается автоматически («Начислено монтажникам») —
                вносите здесь только оклады и премии сверх неё, иначе выплата посчитается дважды.
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <div className="form-group" style={{ flex: 1, minWidth: '180px' }}>
                <label>Дата расхода *</label>
                <input
                  type="date"
                  required
                  value={form.expenseDate}
                  onChange={(e) => update({ expenseDate: e.target.value })}
                  className="custom-date-input"
                  style={{ width: '100%' }}
                />
              </div>

              <div className="form-group" style={{ flex: 1, minWidth: '180px' }}>
                <label>Привязка к сделке (опционально)</label>
                <select
                  value={form.orderId}
                  onChange={(e) => update({ orderId: e.target.value })}
                  className="custom-select"
                  style={{ width: '100%' }}
                >
                  <option value="">Без привязки (общефирменный)</option>
                  {orders.map(ord => (
                    <option key={ord.id} value={ord.id}>
                      {ord.orderNumber ? `№ ${ord.orderNumber}` : `#${ord.id}`} — {ord.clientName || 'Клиент'}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Комментарий / Примечание</label>
              <textarea
                rows={2}
                placeholder="Дополнительные детали платежа..."
                value={form.comment}
                onChange={(e) => update({ comment: e.target.value })}
                className="search-input"
                style={{ width: '100%', resize: 'vertical' }}
              />
            </div>
          </div>

          <div className="modal-actions" style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button type="button" onClick={onClose} className="btn btn-ghost">
              Отмена
            </button>
            <button type="submit" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Check size={16} /> Сохранить расход
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
