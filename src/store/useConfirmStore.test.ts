import { describe, it, expect, beforeEach } from 'vitest';
import { useConfirmStore } from './useConfirmStore';
import { confirm } from '../utils/confirm';

describe('useConfirmStore & confirm helper', () => {
  beforeEach(() => {
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

  it('opens confirmation and resolves true when confirmed', async () => {
    const promise = confirm({
      title: 'Удалить заявку?',
      message: 'Все данные будут удалены',
      danger: true
    });

    const state = useConfirmStore.getState();
    expect(state.isOpen).toBe(true);
    expect(state.title).toBe('Удалить заявку?');
    expect(state.danger).toBe(true);

    // Simulate clicking Confirm
    state.closeConfirm(true);

    const result = await promise;
    expect(result).toBe(true);
    expect(useConfirmStore.getState().isOpen).toBe(false);
  });

  it('resolves false when cancelled', async () => {
    const promise = confirm('Отменить действие?');

    const state = useConfirmStore.getState();
    expect(state.isOpen).toBe(true);
    expect(state.title).toBe('Отменить действие?');

    // Simulate clicking Cancel
    state.closeConfirm(false);

    const result = await promise;
    expect(result).toBe(false);
    expect(useConfirmStore.getState().isOpen).toBe(false);
  });
});
