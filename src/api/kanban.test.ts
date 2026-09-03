import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getOrders,
  getOrderStatuses,
  createOrderStatus,
  updateOrderStatus,
  deleteOrderStatus,
  reorderOrderStatuses,
  createOrder,
  updateOrder,
  deleteOrder,
  completeOrder,
  getNextOrderNumber,
  getAiSummary
} from './kanban';
import { api } from './axiosConfig';

vi.mock('./axiosConfig', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn()
  }
}));

describe('Kanban API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getOrders calls GET /orders', async () => {
    const mockOrders = [{ id: 1, orderNumber: '101' }];
    (api.get as any).mockResolvedValueOnce({ data: mockOrders });

    const result = await getOrders();
    expect(api.get).toHaveBeenCalledWith('/orders', { params: {} });
    expect(result).toEqual(mockOrders);
  });

  it('getOrderStatuses calls GET /order-statuses', async () => {
    const mockStatuses = [{ id: 1, name: 'Новая', color: '#3b82f6', sortOrder: 1 }];
    (api.get as any).mockResolvedValueOnce({ data: mockStatuses });

    const result = await getOrderStatuses();
    expect(api.get).toHaveBeenCalledWith('/order-statuses');
    expect(result).toEqual(mockStatuses);
  });

  it('createOrderStatus calls POST /order-statuses', async () => {
    const payload = { name: 'Замер', color: '#f59e0b' };
    (api.post as any).mockResolvedValueOnce({ data: { id: 2, ...payload } });

    const result = await createOrderStatus(payload);
    expect(api.post).toHaveBeenCalledWith('/order-statuses', payload);
    expect(result.id).toBe(2);
  });

  it('updateOrderStatus calls PUT /order-statuses/:id', async () => {
    const payload = { name: 'Монтаж' };
    (api.put as any).mockResolvedValueOnce({ data: { id: 2, ...payload } });

    const result = await updateOrderStatus(2, payload);
    expect(api.put).toHaveBeenCalledWith('/order-statuses/2', payload);
    expect(result.name).toBe('Монтаж');
  });

  it('deleteOrderStatus calls DELETE /order-statuses/:id', async () => {
    (api.delete as any).mockResolvedValueOnce({ data: null });
    await deleteOrderStatus(2);
    expect(api.delete).toHaveBeenCalledWith('/order-statuses/2');
  });

  it('reorderOrderStatuses calls PUT /order-statuses/reorder', async () => {
    (api.put as any).mockResolvedValueOnce({ data: null });
    await reorderOrderStatuses([3, 1, 2]);
    expect(api.put).toHaveBeenCalledWith('/order-statuses/reorder', [3, 1, 2]);
  });

  it('createOrder and updateOrder call respective endpoints', async () => {
    const payload = { clientId: 1, statusId: 1, totalPrice: 15000 };
    (api.post as any).mockResolvedValueOnce({ data: { id: 10, ...payload } });

    const created = await createOrder(payload);
    expect(api.post).toHaveBeenCalledWith('/orders', payload);
    expect(created.id).toBe(10);

    (api.put as any).mockResolvedValueOnce({ data: { id: 10, ...payload, totalPrice: 20000 } });
    const updated = await updateOrder(10, { ...payload, totalPrice: 20000 });
    expect(api.put).toHaveBeenCalledWith('/orders/10', { ...payload, totalPrice: 20000 });
    expect(updated.totalPrice).toBe(20000);
  });

  it('completeOrder and deleteOrder perform expected operations', async () => {
    (api.post as any).mockResolvedValueOnce({ data: { id: 10, isArchived: true } });
    const completed = await completeOrder(10);
    expect(api.post).toHaveBeenCalledWith('/orders/10/complete');
    expect(completed.isArchived).toBe(true);

    (api.delete as any).mockResolvedValueOnce({ data: null });
    await deleteOrder(10);
    expect(api.delete).toHaveBeenCalledWith('/orders/10');
  });

  it('getNextOrderNumber fetches next order number string', async () => {
    (api.get as any).mockResolvedValueOnce({ data: { orderNumber: '105' } });
    const nextNum = await getNextOrderNumber();
    expect(api.get).toHaveBeenCalledWith('/orders/next-number');
    expect(nextNum).toBe('105');
  });

  it('getAiSummary fetches AI summary for order', async () => {
    const mockAi = { id: 1, orderId: 10, status: 'COMPLETED', aiSummary: 'Summary text' };
    (api.get as any).mockResolvedValueOnce({ data: mockAi });
    const result = await getAiSummary(10);
    expect(api.get).toHaveBeenCalledWith('/orders/10/ai-summary');
    expect(result.aiSummary).toBe('Summary text');
  });
});
