import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAuditLogs, getRecentAuditLogs } from './auditLogs';
import { api } from './axiosConfig';

vi.mock('./axiosConfig', () => ({
  api: {
    get: vi.fn(),
  }
}));

describe('AuditLogs API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getAuditLogs calls GET /audit-logs with correct parameters', async () => {
    const mockPageResponse = {
      content: [
        {
          id: 1,
          tenantId: 1,
          createdAt: '2026-09-12T10:00:00Z',
          actionType: 'ORDER_CREATED',
          entityType: 'ORDER',
          description: 'Создана заявка #100',
        },
      ],
      totalElements: 1,
      totalPages: 1,
      size: 20,
      number: 0,
    };

    (api.get as any).mockResolvedValueOnce({ data: mockPageResponse });

    const result = await getAuditLogs({
      search: '100',
      entityType: 'ORDER',
      actionType: 'ORDER_CREATED',
      page: 0,
      size: 20,
    });

    expect(api.get).toHaveBeenCalledWith('/audit-logs', {
      params: {
        search: '100',
        entityType: 'ORDER',
        actionType: 'ORDER_CREATED',
        page: 0,
        size: 20,
      },
    });
    expect(result).toEqual(mockPageResponse);
  });

  it('getRecentAuditLogs calls GET /audit-logs/recent', async () => {
    const mockRecent = [
      {
        id: 2,
        tenantId: 1,
        createdAt: '2026-09-12T11:00:00Z',
        actionType: 'CLIENT_CREATED',
        entityType: 'CLIENT',
        description: 'Создан клиент',
      },
    ];

    (api.get as any).mockResolvedValueOnce({ data: mockRecent });

    const result = await getRecentAuditLogs();
    expect(api.get).toHaveBeenCalledWith('/audit-logs/recent');
    expect(result).toEqual(mockRecent);
  });
});
