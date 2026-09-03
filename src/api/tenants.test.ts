import { describe, it, expect, vi, beforeEach } from 'vitest';
import { tenantsApi } from './tenants';
import { api } from './axiosConfig';

vi.mock('./axiosConfig', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn()
  }
}));

describe('Tenants API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getAll calls GET /tenants', async () => {
    const mockTenants = [{ id: 1, name: 'Ecoline' }];
    (api.get as any).mockResolvedValueOnce({ data: mockTenants });

    const result = await tenantsApi.getAll();
    expect(api.get).toHaveBeenCalledWith('/tenants');
    expect(result).toEqual(mockTenants);
  });

  it('create calls POST /tenants', async () => {
    const req = { name: 'Ecoline', ownerEmail: 'test@mail.ru', ownerPassword: 'pass' };
    (api.post as any).mockResolvedValueOnce({ data: { id: 1, ...req } });

    const result = await tenantsApi.create(req);
    expect(api.post).toHaveBeenCalledWith('/tenants', req);
    expect(result.id).toBe(1);
  });

  it('resetOwnerPassword calls POST /tenants/:id/reset-password', async () => {
    (api.post as any).mockResolvedValueOnce({ data: { temporaryPassword: 'temp123Password' } });

    const result = await tenantsApi.resetOwnerPassword(5);
    expect(api.post).toHaveBeenCalledWith('/tenants/5/reset-password');
    expect(result.temporaryPassword).toBe('temp123Password');
  });

  it('getOwners calls GET /tenants/owners', async () => {
    const mockOwners = [{ userId: 1, email: 'owner@test.ru', maxCompaniesLimit: 3, companiesCount: 1, companies: [] }];
    (api.get as any).mockResolvedValueOnce({ data: mockOwners });

    const result = await tenantsApi.getOwners();
    expect(api.get).toHaveBeenCalledWith('/tenants/owners');
    expect(result).toEqual(mockOwners);
  });

  it('updateOwnerLimit calls PUT /tenants/owners/:userId/limits', async () => {
    (api.put as any).mockResolvedValueOnce({ data: null });

    await tenantsApi.updateOwnerLimit(10, 5);
    expect(api.put).toHaveBeenCalledWith('/tenants/owners/10/limits', { maxCompaniesLimit: 5 });
  });
});
