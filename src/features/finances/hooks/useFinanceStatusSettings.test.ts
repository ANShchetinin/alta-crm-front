import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useFinanceStatusSettings } from './useFinanceStatusSettings';
import { updateFinanceStatuses, type OrderStatus } from '../../../api/kanban';
import { toast } from '../../../utils/toast';

vi.mock('../../../api/kanban', () => ({ updateFinanceStatuses: vi.fn() }));
vi.mock('../../../utils/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() }
}));

const statuses: OrderStatus[] = [
  { id: 1, name: 'Новая', color: '#3b82f6', sortOrder: 1, includeInFinances: true },
  { id: 2, name: 'Спам', color: '#ef4444', sortOrder: 2, includeInFinances: false },
  { id: 3, name: 'Готово', color: '#22c55e', sortOrder: 3 }
];

describe('useFinanceStatusSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts from the current statuses, applies changes and saves them', async () => {
    vi.mocked(updateFinanceStatuses).mockResolvedValue(statuses);
    const onSaved = vi.fn();
    const { result } = renderHook(() => useFinanceStatusSettings(statuses, onSaved));

    act(() => result.current.open());
    expect(result.current.settings).toEqual({ 1: true, 2: false, 3: true });

    act(() => result.current.setIncluded(2, true));
    act(() => result.current.setIncluded(3, false));
    await act(() => result.current.save());

    expect(updateFinanceStatuses).toHaveBeenCalledWith({ 1: true, 2: true, 3: false });
    expect(onSaved).toHaveBeenCalledWith(statuses);
    expect(result.current.isOpen).toBe(false);
    expect(result.current.saving).toBe(false);
  });

  it('selects and clears all statuses at once', () => {
    const { result } = renderHook(() => useFinanceStatusSettings(statuses, vi.fn()));

    act(() => result.current.setAll(false));
    expect(result.current.settings).toEqual({ 1: false, 2: false, 3: false });

    act(() => result.current.setAll(true));
    expect(result.current.settings).toEqual({ 1: true, 2: true, 3: true });
  });

  it('stays open when saving fails', async () => {
    vi.mocked(updateFinanceStatuses).mockRejectedValue(new Error('403'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const onSaved = vi.fn();
    const { result } = renderHook(() => useFinanceStatusSettings(statuses, onSaved));

    act(() => result.current.open());
    await act(() => result.current.save());

    expect(onSaved).not.toHaveBeenCalled();
    expect(result.current.isOpen).toBe(true);
    expect(toast.error).toHaveBeenCalledWith('Не удалось сохранить настройки статусов');
  });
});
