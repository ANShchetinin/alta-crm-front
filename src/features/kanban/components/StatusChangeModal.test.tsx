import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { StatusChangeModal } from './StatusChangeModal';

describe('StatusChangeModal', () => {
  it('does not render when data is null or isOpen is false', () => {
    const { rerender } = render(
      <StatusChangeModal data={null} onClose={() => {}} onConfirm={() => {}} />
    );
    expect(screen.queryByText('Смена статуса заявки')).not.toBeInTheDocument();

    rerender(
      <StatusChangeModal
        data={{
          isOpen: false,
          orderId: 1,
          orderNumber: '#101',
          targetStatusId: 2,
          targetStatusName: 'В работе'
        }}
        onClose={() => {}}
        onConfirm={() => {}}
      />
    );
    expect(screen.queryByText('Смена статуса заявки')).not.toBeInTheDocument();
  });

  it('renders modal details and confirms with comment', async () => {
    const handleClose = vi.fn();
    const handleConfirm = vi.fn();

    render(
      <StatusChangeModal
        data={{
          isOpen: true,
          orderId: 10,
          orderNumber: 'ORD-10',
          sourceStatusName: 'Новые',
          sourceStatusColor: '#3b82f6',
          targetStatusId: 20,
          targetStatusName: 'Замер назначен',
          targetStatusColor: '#10b981'
        }}
        onClose={handleClose}
        onConfirm={handleConfirm}
      />
    );

    expect(screen.getByText('Смена статуса заявки')).toBeInTheDocument();
    expect(screen.getByText('ORD-10')).toBeInTheDocument();
    expect(screen.getByText('Новые')).toBeInTheDocument();
    expect(screen.getByText('Замер назначен')).toBeInTheDocument();

    const textarea = screen.getByPlaceholderText(/Например: Замер согласован/i);
    fireEvent.change(textarea, { target: { value: 'Договорились на понедельник' } });

    const submitBtn = screen.getByText('Переместить');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(handleConfirm).toHaveBeenCalledWith('Договорились на понедельник');
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });

  it('confirms without comment if textarea is empty', async () => {
    const handleClose = vi.fn();
    const handleConfirm = vi.fn();

    render(
      <StatusChangeModal
        data={{
          isOpen: true,
          orderId: 10,
          orderNumber: 'ORD-10',
          targetStatusId: 20,
          targetStatusName: 'Замер назначен'
        }}
        onClose={handleClose}
        onConfirm={handleConfirm}
      />
    );

    const submitBtn = screen.getByText('Переместить');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(handleConfirm).toHaveBeenCalledWith(undefined);
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });
});
