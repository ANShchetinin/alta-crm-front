import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ConfirmDialog } from './ConfirmDialog';
import { useConfirmStore } from '../../store/useConfirmStore';
import { confirm } from '../../utils/confirm';

describe('ConfirmDialog Component', () => {
  beforeEach(() => {
    act(() => {
      useConfirmStore.setState({
        isOpen: false,
        title: '',
        message: '',
        confirmText: 'Подтвердить',
        cancelText: 'Отмена',
        danger: false,
        resolve: undefined
      });
    });
  });

  it('renders nothing when closed', () => {
    const { container } = render(<ConfirmDialog />);
    expect(container.firstChild).toBeNull();
  });

  it('renders title, message, and buttons when opened via store', () => {
    render(<ConfirmDialog />);
    act(() => {
      confirm({
        title: 'Удалить клиента?',
        message: 'Вы уверены, что хотите удалить этого клиента?',
        confirmText: 'Да, удалить',
        cancelText: 'Отменить',
        danger: true
      });
    });

    expect(screen.getByText('Удалить клиента?')).toBeInTheDocument();
    expect(screen.getByText('Вы уверены, что хотите удалить этого клиента?')).toBeInTheDocument();
    expect(screen.getByText('Да, удалить')).toBeInTheDocument();
    expect(screen.getByText('Отменить')).toBeInTheDocument();
  });

  it('resolves false on cancel click', async () => {
    render(<ConfirmDialog />);
    let promise: Promise<boolean>;
    act(() => {
      promise = confirm({
        title: 'Подтвердить?',
        cancelText: 'Отмена'
      });
    });

    act(() => {
      fireEvent.click(screen.getByText('Отмена'));
    });
    const result = await promise!;
    expect(result).toBe(false);
  });

  it('resolves true on confirm click', async () => {
    render(<ConfirmDialog />);
    let promise: Promise<boolean>;
    act(() => {
      promise = confirm({
        title: 'Подтвердить?',
        confirmText: 'Подтвердить'
      });
    });

    act(() => {
      fireEvent.click(screen.getByText('Подтвердить'));
    });
    const result = await promise!;
    expect(result).toBe(true);
  });
});
