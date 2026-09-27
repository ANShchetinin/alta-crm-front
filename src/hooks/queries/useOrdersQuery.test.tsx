import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { createQueryWrapper, createTestQueryClient } from '../../test-utils/queryWrapper';
import { useOrdersQuery, ORDERS_QUERY_KEY } from './useOrdersQuery';
import { useInvalidateOnOrdersChanged, ORDERS_CHANGED_EVENT } from './useInvalidateOnOrdersChanged';
import { getOrders, getArchivedOrders, type Order } from '../../api/kanban';
import { useAuthStore } from '../../store/useAuthStore';

vi.mock('../../api/kanban', () => ({
  getOrders: vi.fn(),
  getArchivedOrders: vi.fn()
}));

const order = (id: number) => ({ id, clientName: `Клиент ${id}`, statusId: 1 }) as Order;

describe('useOrdersQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ tenantId: 1 });
    vi.mocked(getOrders).mockResolvedValue([order(1)]);
    vi.mocked(getArchivedOrders).mockResolvedValue([order(9)]);
  });

  it('loads active orders for the board and archived ones for the archive', async () => {
    const wrapper = createQueryWrapper();
    const { result: active } = renderHook(() => useOrdersQuery('active'), { wrapper });
    const { result: archived } = renderHook(() => useOrdersQuery('archived'), { wrapper });

    await waitFor(() => expect(active.current.data).toEqual([order(1)]));
    await waitFor(() => expect(archived.current.data).toEqual([order(9)]));
    expect(getOrders).toHaveBeenCalledWith(false);
  });

  it('refetches every mounted order list when an order changes anywhere', async () => {
    const wrapper = createQueryWrapper(createTestQueryClient());
    renderHook(() => useInvalidateOnOrdersChanged(ORDERS_QUERY_KEY), { wrapper });
    const { result: active } = renderHook(() => useOrdersQuery('active'), { wrapper });
    const { result: archived } = renderHook(() => useOrdersQuery('archived'), { wrapper });
    await waitFor(() => expect(active.current.isSuccess && archived.current.isSuccess).toBe(true));

    vi.mocked(getOrders).mockResolvedValue([order(1), order(2)]);
    act(() => {
      window.dispatchEvent(new CustomEvent(ORDERS_CHANGED_EVENT, { detail: { action: 'save', orderId: 2 } }));
    });

    await waitFor(() => expect(active.current.data).toEqual([order(1), order(2)]));
    expect(getArchivedOrders).toHaveBeenCalledTimes(2);
  });
});
