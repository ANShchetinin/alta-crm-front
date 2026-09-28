import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePaymentToggles } from './usePaymentToggles';
import { togglePrepaymentPaid, toggleRemainderPaid, type Order } from '../../../api/kanban';
import { toast } from '../../../utils/toast';

vi.mock('../../../api/kanban', () => ({
  togglePrepaymentPaid: vi.fn(),
  toggleRemainderPaid: vi.fn()
}));
vi.mock('../../../utils/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() }
}));

describe('usePaymentToggles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('marks the prepayment as received with the current time and updates the cached order', async () => {
    vi.mocked(togglePrepaymentPaid).mockResolvedValue({ id: 5, prepaymentPaid: true, prepaymentPaidAt: '2026-09-28T10:00:00' } as Order);
    const updateCachedOrder = vi.fn();

    await renderHook(() => usePaymentToggles(updateCachedOrder)).result.current.togglePrepayment(5, false);

    expect(togglePrepaymentPaid).toHaveBeenCalledWith(5, true, expect.any(String));
    expect(updateCachedOrder).toHaveBeenCalledWith(5, { prepaymentPaid: true, prepaymentPaidAt: '2026-09-28T10:00:00' });
    expect(toast.success).toHaveBeenCalledWith('Аванс отмечен как оплаченный');
  });

  it('cancels the remainder payment without a date', async () => {
    vi.mocked(toggleRemainderPaid).mockResolvedValue({ id: 5, remainderPaid: false } as Order);
    const updateCachedOrder = vi.fn();

    await renderHook(() => usePaymentToggles(updateCachedOrder)).result.current.toggleRemainder(5, true);

    expect(toggleRemainderPaid).toHaveBeenCalledWith(5, false, undefined);
    expect(updateCachedOrder).toHaveBeenCalledWith(5, { remainderPaid: false, remainderPaidAt: undefined });
    expect(toast.success).toHaveBeenCalledWith('Оплата остатка отменена');
  });

  it('keeps the cache untouched when the request fails', async () => {
    vi.mocked(togglePrepaymentPaid).mockRejectedValue(new Error('500'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const updateCachedOrder = vi.fn();

    await renderHook(() => usePaymentToggles(updateCachedOrder)).result.current.togglePrepayment(5, false);

    expect(updateCachedOrder).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith('Не удалось изменить статус оплаты аванса');
  });
});
