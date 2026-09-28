import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useExpenseEditor } from './useExpenseEditor';
import { createExpense, deleteExpense, updateExpense, type Expense } from '../../../api/finances';
import { confirm } from '../../../utils/confirm';
import { toast } from '../../../utils/toast';

vi.mock('../../../api/finances', () => ({
  createExpense: vi.fn(),
  updateExpense: vi.fn(),
  deleteExpense: vi.fn()
}));
vi.mock('../../../utils/confirm', () => ({ confirm: vi.fn() }));
vi.mock('../../../utils/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() }
}));

const existing: Expense = {
  id: 7,
  title: 'Аренда',
  category: 'RENT',
  amount: 15000,
  expenseDate: '2026-09-01',
  orderId: 12,
  comment: 'Сентябрь'
} as Expense;

/** Подключает хук к списку расходов в памяти, как это делает кеш React Query. */
const setup = (initial: Expense[] = []) => {
  let list = initial;
  const setExpenses = vi.fn((updater: (prev: Expense[]) => Expense[]) => {
    list = updater(list);
  });
  const hook = renderHook(() => useExpenseEditor(setExpenses));
  return { hook, current: () => list };
};

describe('useExpenseEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates an expense from the trimmed form and prepends it', async () => {
    vi.mocked(createExpense).mockResolvedValue({ ...existing, id: 8, title: 'Реклама' });
    const { hook, current } = setup([existing]);

    act(() => hook.result.current.openCreate());
    act(() => hook.result.current.setForm({
      ...hook.result.current.form,
      title: '  Реклама ',
      category: 'MARKETING',
      amount: '2500.5',
      orderId: '12',
      comment: '  '
    }));
    await act(() => hook.result.current.save());

    expect(createExpense).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Реклама',
      category: 'MARKETING',
      amount: 2500.5,
      orderId: 12,
      comment: undefined
    }));
    expect(current().map(e => e.id)).toEqual([8, 7]);
    expect(hook.result.current.isOpen).toBe(false);
    expect(toast.success).toHaveBeenCalledWith('Расход добавлен');
  });

  it('fills the form from an existing expense and replaces it after saving', async () => {
    vi.mocked(updateExpense).mockResolvedValue({ ...existing, amount: 16000 });
    const { hook, current } = setup([existing]);

    act(() => hook.result.current.openEdit(existing));
    expect(hook.result.current.editingId).toBe(7);
    expect(hook.result.current.form).toMatchObject({ title: 'Аренда', amount: '15000', orderId: '12', comment: 'Сентябрь' });

    await act(() => hook.result.current.save());

    expect(updateExpense).toHaveBeenCalledWith(7, expect.objectContaining({ amount: 15000 }));
    expect(current()[0].amount).toBe(16000);
  });

  it('does not save a form without a title or amount', async () => {
    const { hook } = setup();

    act(() => hook.result.current.openCreate());
    await act(() => hook.result.current.save());

    expect(createExpense).not.toHaveBeenCalled();
    expect(hook.result.current.isOpen).toBe(true);
  });

  it('keeps the modal open and reports an error when saving fails', async () => {
    vi.mocked(createExpense).mockRejectedValue(new Error('500'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { hook } = setup();

    act(() => hook.result.current.openCreate());
    act(() => hook.result.current.setForm({ ...hook.result.current.form, title: 'Бензин', amount: '100' }));
    await act(() => hook.result.current.save());

    expect(hook.result.current.isOpen).toBe(true);
    expect(toast.error).toHaveBeenCalledWith('Не удалось сохранить расход');
  });

  it('deletes only after confirmation', async () => {
    vi.mocked(confirm).mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    vi.mocked(deleteExpense).mockResolvedValue(undefined);
    const { hook, current } = setup([existing]);

    await act(() => hook.result.current.remove(7, 'Аренда'));
    expect(deleteExpense).not.toHaveBeenCalled();

    await act(() => hook.result.current.remove(7, 'Аренда'));
    expect(deleteExpense).toHaveBeenCalledWith(7);
    expect(current()).toEqual([]);
  });
});
