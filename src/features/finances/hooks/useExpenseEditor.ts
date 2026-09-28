import { useState } from 'react';
import { createExpense, updateExpense, deleteExpense, type Expense, type ExpenseCategory } from '../../../api/finances';
import { toast } from '../../../utils/toast';
import { confirm } from '../../../utils/confirm';

export interface ExpenseFormData {
  title: string;
  category: ExpenseCategory;
  amount: string;
  expenseDate: string;
  orderId: string;
  comment: string;
}

const emptyForm = (): ExpenseFormData => ({
  title: '',
  category: 'OTHER',
  amount: '',
  expenseDate: new Date().toISOString().split('T')[0],
  orderId: '',
  comment: ''
});

const toForm = (expense: Expense): ExpenseFormData => ({
  title: expense.title,
  category: expense.category,
  amount: expense.amount.toString(),
  expenseDate: expense.expenseDate,
  orderId: expense.orderId ? expense.orderId.toString() : '',
  comment: expense.comment || ''
});

const toPayload = (form: ExpenseFormData): Partial<Expense> => ({
  title: form.title.trim(),
  category: form.category,
  amount: parseFloat(form.amount) || 0,
  expenseDate: form.expenseDate,
  orderId: form.orderId ? parseInt(form.orderId) : undefined,
  comment: form.comment.trim() || undefined
});

/** Создание, редактирование и удаление расходов компании; форма модального окна расхода. */
export const useExpenseEditor = (setExpenses: (updater: (prev: Expense[]) => Expense[]) => void) => {
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ExpenseFormData>(emptyForm);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setIsOpen(true);
  };

  const openEdit = (expense: Expense) => {
    setEditingId(expense.id);
    setForm(toForm(expense));
    setIsOpen(true);
  };

  const close = () => setIsOpen(false);

  const save = async () => {
    if (!form.title.trim() || !form.amount) {
      return;
    }
    const payload = toPayload(form);
    try {
      if (editingId) {
        const updated = await updateExpense(editingId, payload);
        setExpenses(prev => prev.map(ex => (ex.id === editingId ? updated : ex)));
        toast.success('Расход обновлен');
      } else {
        const created = await createExpense(payload);
        setExpenses(prev => [created, ...prev]);
        toast.success('Расход добавлен');
      }
      setIsOpen(false);
    } catch (err) {
      console.error('Failed to save expense', err);
      toast.error('Не удалось сохранить расход');
    }
  };

  const remove = async (id: number, title: string) => {
    const ok = await confirm({
      title: 'Удаление расхода',
      message: `Удалить статью расхода «${title}»?`,
      confirmText: 'Удалить',
      cancelText: 'Отмена',
      danger: true
    });
    if (!ok) {
      return;
    }
    try {
      await deleteExpense(id);
      setExpenses(prev => prev.filter(e => e.id !== id));
      toast.success('Расход удален');
    } catch (err) {
      console.error('Failed to delete expense', err);
      toast.error('Не удалось удалить расход');
    }
  };

  return { isOpen, editingId, form, setForm, openCreate, openEdit, close, save, remove };
};
