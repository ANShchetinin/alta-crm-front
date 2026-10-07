import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ExpenseModal } from './ExpenseModal';
import type { ExpenseFormData } from '../hooks/useExpenseEditor';

const form = (category: ExpenseFormData['category']): ExpenseFormData => ({
  title: 'Премия',
  category,
  amount: '1000',
  expenseDate: '2026-10-07',
  orderId: '',
  comment: ''
});

const renderModal = (category: ExpenseFormData['category']) => render(
  <ExpenseModal isEditing={false} form={form(category)} onChange={vi.fn()} orders={[]} onSave={vi.fn()} onClose={vi.fn()} />
);

describe('ExpenseModal', () => {
  it('warns that installers are paid automatically when the salary category is chosen', () => {
    renderModal('SALARY');

    expect(screen.getByRole('note')).toHaveTextContent(/учитывается автоматически/);
  });

  it('shows no salary hint for other categories', () => {
    renderModal('RENT');

    expect(screen.queryByRole('note')).not.toBeInTheDocument();
  });
});
