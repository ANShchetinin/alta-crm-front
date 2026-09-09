import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ToastContainer } from './ToastContainer';
import { useToastStore } from '../../store/useToastStore';
import { toast } from '../../utils/toast';

describe('ToastContainer Component', () => {
  beforeEach(() => {
    act(() => {
      useToastStore.getState().clearAll();
    });
  });

  it('renders nothing when there are no toasts', () => {
    const { container } = render(<ToastContainer />);
    expect(container.firstChild).toBeNull();
  });

  it('renders active toasts with title and message', () => {
    render(<ToastContainer />);
    act(() => {
      toast.success('Заказ сохранен', { title: 'Успешно' });
    });

    expect(screen.getByText('Успешно')).toBeInTheDocument();
    expect(screen.getByText('Заказ сохранен')).toBeInTheDocument();
  });

  it('dismisses toast on close button click', () => {
    render(<ToastContainer />);
    act(() => {
      toast.error('Ошибка сохранения');
    });

    expect(screen.getByText('Ошибка сохранения')).toBeInTheDocument();
    const closeBtn = screen.getByLabelText('Закрыть уведомление');
    act(() => {
      fireEvent.click(closeBtn);
    });

    expect(screen.queryByText('Ошибка сохранения')).not.toBeInTheDocument();
  });
});
