import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useOrderLoader } from './useOrderLoader';
import { getOrderById, type Order } from '../../../api/kanban';

vi.mock('../../../api/kanban', () => ({
  getOrderById: vi.fn()
}));

const mockedGetOrderById = vi.mocked(getOrderById);

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(res => {
    resolve = res;
  });
  return { promise, resolve };
};

const order = (id: number) => ({ id } as Order);

describe('useOrderLoader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loads a single order by id', async () => {
    mockedGetOrderById.mockResolvedValue(order(7));
    const onLoaded = vi.fn();
    const onNew = vi.fn();

    renderHook(() => useOrderLoader(true, 7, { onLoaded, onNew }));

    await waitFor(() => expect(onLoaded).toHaveBeenCalledWith(order(7)));
    expect(mockedGetOrderById).toHaveBeenCalledWith(7);
    expect(onNew).not.toHaveBeenCalled();
  });

  it('ignores a stale response after switching to another order', async () => {
    const first = deferred<Order>();
    const second = deferred<Order>();
    mockedGetOrderById.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const onLoaded = vi.fn();

    const { rerender } = renderHook(
      ({ id }) => useOrderLoader(true, id, { onLoaded, onNew: vi.fn() }),
      { initialProps: { id: 1 } }
    );
    rerender({ id: 2 });

    second.resolve(order(2));
    await waitFor(() => expect(onLoaded).toHaveBeenCalledWith(order(2)));
    first.resolve(order(1));
    await first.promise;
    await Promise.resolve();

    expect(onLoaded).toHaveBeenCalledTimes(1);
    expect(onLoaded).not.toHaveBeenCalledWith(order(1));
  });

  it('ignores the response when the drawer is closed before it arrives', async () => {
    const pending = deferred<Order>();
    mockedGetOrderById.mockReturnValueOnce(pending.promise);
    const onLoaded = vi.fn();

    const { rerender } = renderHook(
      ({ open }) => useOrderLoader(open, 3, { onLoaded, onNew: vi.fn() }),
      { initialProps: { open: true } }
    );
    rerender({ open: false });
    pending.resolve(order(3));
    await pending.promise;
    await Promise.resolve();

    expect(onLoaded).not.toHaveBeenCalled();
  });

  it('reports a failed load of the current order', async () => {
    const error = new Error('network');
    mockedGetOrderById.mockRejectedValueOnce(error);
    const onLoaded = vi.fn();
    const onError = vi.fn();
    vi.spyOn(console, 'error').mockImplementation(() => {});

    renderHook(() => useOrderLoader(true, 4, { onLoaded, onNew: vi.fn(), onError }));

    await waitFor(() => expect(onError).toHaveBeenCalledWith(error));
    expect(onLoaded).not.toHaveBeenCalled();
  });

  it('initialises a new order form without requests when orderId is null', () => {
    const onNew = vi.fn();

    renderHook(() => useOrderLoader(true, null, { onLoaded: vi.fn(), onNew }));

    expect(onNew).toHaveBeenCalledTimes(1);
    expect(mockedGetOrderById).not.toHaveBeenCalled();
  });

  it('does nothing while the drawer is closed', () => {
    const onNew = vi.fn();

    renderHook(() => useOrderLoader(false, 5, { onLoaded: vi.fn(), onNew }));

    expect(onNew).not.toHaveBeenCalled();
    expect(mockedGetOrderById).not.toHaveBeenCalled();
  });
});
