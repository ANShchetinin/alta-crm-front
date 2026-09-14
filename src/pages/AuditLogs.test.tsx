import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { AuditLogs } from './AuditLogs';
import * as auditLogsApi from '../api/auditLogs';

vi.mock('../api/auditLogs', () => ({
  getAuditLogs: vi.fn(),
  getRecentAuditLogs: vi.fn(),
}));

vi.mock('../utils/toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

describe('AuditLogs Page Component', () => {
  const mockAuditData: auditLogsApi.PageResponse<auditLogsApi.AuditLogItem> = {
    content: [
      {
        id: 1,
        tenantId: 1,
        createdAt: '2026-09-12T10:00:00Z',
        actorId: 10,
        actorName: 'Иван Руководитель',
        actorRole: 'OWNER',
        actionType: 'ORDER_CREATED',
        entityType: 'ORDER',
        entityId: 101,
        entityTitle: '101',
        description: 'Создана заявка № 101 для клиента Тест',
      },
      {
        id: 2,
        tenantId: 1,
        createdAt: '2026-09-12T11:00:00Z',
        actorId: 15,
        actorName: 'Петр Менеджер',
        actorRole: 'MANAGER',
        actionType: 'ORDER_STATUS_CHANGED',
        entityType: 'ORDER',
        entityId: 101,
        entityTitle: '101',
        description: "Смена статуса заявки № 101: 'Новый' → 'Замер'",
      },
    ],
    totalElements: 2,
    totalPages: 1,
    size: 20,
    number: 0,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (auditLogsApi.getAuditLogs as any).mockResolvedValue(mockAuditData);
  });

  it('renders page header and audit log entries', async () => {
    render(<AuditLogs />);

    expect(screen.getByText('Журнал важных событий')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getAllByText('Создана заявка № 101 для клиента Тест').length).toBeGreaterThan(0);
      expect(screen.getAllByText("Смена статуса заявки № 101: 'Новый' → 'Замер'").length).toBeGreaterThan(0);
      expect(screen.getAllByText('Иван Руководитель').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Петр Менеджер').length).toBeGreaterThan(0);
    });
  });

  it('filters by search input', async () => {
    render(<AuditLogs />);

    await waitFor(() => {
      expect(screen.getAllByText('Создана заявка № 101 для клиента Тест').length).toBeGreaterThan(0);
    });

    const searchInput = screen.getByPlaceholderText('Поиск по описанию, сотруднику или объекту...');
    fireEvent.change(searchInput, { target: { value: 'клиента Тест' } });

    await waitFor(() => {
      expect(auditLogsApi.getAuditLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'клиента Тест',
        })
      );
    });
  });

  it('filters by period pill buttons', async () => {
    render(<AuditLogs />);

    await waitFor(() => {
      expect(screen.getAllByText('Создана заявка № 101 для клиента Тест').length).toBeGreaterThan(0);
    });

    const todayBtn = screen.getByText('Сегодня');
    fireEvent.click(todayBtn);

    await waitFor(() => {
      expect(auditLogsApi.getAuditLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          from: expect.any(String),
        })
      );
    });
  });

  it('renders empty state when no events exist', async () => {
    (auditLogsApi.getAuditLogs as any).mockResolvedValueOnce({
      content: [],
      totalElements: 0,
      totalPages: 0,
      size: 20,
      number: 0,
    });

    render(<AuditLogs />);

    await waitFor(() => {
      expect(screen.getByText('Событий не найдено')).toBeInTheDocument();
    });
  });
});
