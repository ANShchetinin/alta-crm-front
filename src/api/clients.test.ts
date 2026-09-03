import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getClients, createClient, updateClient, deleteClient, uploadClientAvatar } from './clients';
import { api } from './axiosConfig';

vi.mock('./axiosConfig', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  }
}));

describe('Clients API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getClients calls GET /clients', async () => {
    const mockData = [{ id: 1, name: 'Client 1' }];
    (api.get as any).mockResolvedValueOnce({ data: mockData });

    const result = await getClients();
    expect(api.get).toHaveBeenCalledWith('/clients');
    expect(result).toEqual(mockData);
  });

  it('createClient calls POST /clients with payload', async () => {
    const payload = { name: 'New Client', phone: '+79991234567' };
    (api.post as any).mockResolvedValueOnce({ data: { id: 1, ...payload } });

    const result = await createClient(payload as any);
    expect(api.post).toHaveBeenCalledWith('/clients', payload);
    expect(result.id).toBe(1);
  });

  it('updateClient calls PUT /clients/:id', async () => {
    const payload = { name: 'Updated Client', phone: '+79991234567' };
    (api.put as any).mockResolvedValueOnce({ data: { id: 5, ...payload } });

    const result = await updateClient(5, payload as any);
    expect(api.put).toHaveBeenCalledWith('/clients/5', payload);
    expect(result.name).toBe('Updated Client');
  });

  it('deleteClient calls DELETE /clients/:id', async () => {
    (api.delete as any).mockResolvedValueOnce({ data: null });
    await deleteClient(10);
    expect(api.delete).toHaveBeenCalledWith('/clients/10');
  });

  it('uploadClientAvatar sends multipart form data', async () => {
    const file = new File(['avatar content'], 'avatar.png', { type: 'image/png' });
    (api.post as any).mockResolvedValueOnce({ data: { id: 3, avatarUrl: '/uploads/avatar.png' } });

    const result = await uploadClientAvatar(3, file);
    expect(api.post).toHaveBeenCalledWith(
      '/clients/3/avatar',
      expect.any(FormData),
      expect.objectContaining({
        headers: { 'Content-Type': 'multipart/form-data' }
      })
    );
    expect(result.avatarUrl).toBe('/uploads/avatar.png');
  });
});
