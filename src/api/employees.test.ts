import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getEmployees, createEmployee, updateEmployee, deleteEmployee, uploadEmployeeAvatar } from './employees';
import { api } from './axiosConfig';

vi.mock('./axiosConfig', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  }
}));

describe('Employees API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getEmployees calls GET /employees', async () => {
    const mockData = [{ id: 1, name: 'Employee 1' }];
    (api.get as any).mockResolvedValueOnce({ data: mockData });

    const result = await getEmployees();
    expect(api.get).toHaveBeenCalledWith('/employees');
    expect(result).toEqual(mockData);
  });

  it('createEmployee calls POST /employees', async () => {
    const payload = { name: 'Иван Монтажник', position: 'Монтажник' };
    (api.post as any).mockResolvedValueOnce({ data: { id: 1, ...payload } });

    const result = await createEmployee(payload);
    expect(api.post).toHaveBeenCalledWith('/employees', payload);
    expect(result.id).toBe(1);
  });

  it('updateEmployee calls PUT /employees/:id', async () => {
    const payload = { name: 'Иван Старший Монтажник' };
    (api.put as any).mockResolvedValueOnce({ data: { id: 1, ...payload } });

    const result = await updateEmployee(1, payload);
    expect(api.put).toHaveBeenCalledWith('/employees/1', payload);
    expect(result.name).toBe('Иван Старший Монтажник');
  });

  it('deleteEmployee calls DELETE /employees/:id', async () => {
    (api.delete as any).mockResolvedValueOnce({ data: null });
    await deleteEmployee(1);
    expect(api.delete).toHaveBeenCalledWith('/employees/1');
  });

  it('uploadEmployeeAvatar uploads avatar', async () => {
    const file = new File(['img'], 'photo.jpg', { type: 'image/jpeg' });
    (api.post as any).mockResolvedValueOnce({ data: { id: 2, avatarUrl: '/avatar.jpg' } });

    const result = await uploadEmployeeAvatar(2, file);
    expect(api.post).toHaveBeenCalledWith(
      '/employees/2/avatar',
      expect.any(FormData),
      expect.any(Object)
    );
    expect(result.avatarUrl).toBe('/avatar.jpg');
  });
});
