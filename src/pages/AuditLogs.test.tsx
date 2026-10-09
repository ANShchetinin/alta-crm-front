import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { renderWithQuery } from '../test-utils/queryWrapper';
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
    renderWithQuery(<AuditLogs />);

    expect(screen.getByText('Журнал важных событий')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getAllByText('Создана заявка № 101 для клиента Тест').length).toBeGreaterThan(0);
      expect(screen.getAllByText("Смена статуса заявки № 101: 'Новый' → 'Замер'").length).toBeGreaterThan(0);
      expect(screen.getAllByText('Иван Руководитель').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Петр Менеджер').length).toBeGreaterThan(0);
    });
  });

  it('filters by search input', async () => {
    renderWithQuery(<AuditLogs />);

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
    renderWithQuery(<AuditLogs />);

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

  it('keeps the latest filter results when an older request resolves later', async () => {
    let resolveStale: (value: auditLogsApi.PageResponse<auditLogsApi.AuditLogItem>) => void = () => {};
    const staleResponse = new Promise<auditLogsApi.PageResponse<auditLogsApi.AuditLogItem>>(resolve => {
      resolveStale = resolve;
    });
    const freshData = {
      ...mockAuditData,
      content: [{ ...mockAuditData.content[0], id: 3, description: 'Свежий результат за сегодня' }],
      totalElements: 1
    };
    (auditLogsApi.getAuditLogs as any)
      .mockReturnValueOnce(staleResponse)
      .mockResolvedValueOnce(freshData);

    renderWithQuery(<AuditLogs />);
    fireEvent.click(screen.getByText('Сегодня'));
    expect(await screen.findAllByText('Свежий результат за сегодня')).not.toHaveLength(0);

    resolveStale(mockAuditData);

    await waitFor(() => expect(screen.queryAllByText('Создана заявка № 101 для клиента Тест')).toHaveLength(0));
    expect(screen.getAllByText('Свежий результат за сегодня').length).toBeGreaterThan(0);
  });

  it('shows the IP address and login badge for sign-in events', async () => {
    (auditLogsApi.getAuditLogs as any).mockResolvedValue({
      ...mockAuditData,
      content: [{
        id: 5,
        tenantId: 1,
        createdAt: '2026-09-12T12:00:00Z',
        actorEmail: 'owner@test.com',
        actorRole: 'OWNER',
        actionType: 'AUTH_LOGIN_FAILED',
        entityType: 'AUTH',
        description: 'Неудачная попытка входа',
        ipAddress: '203.0.113.7',
      }],
      totalElements: 1,
    });

    renderWithQuery(<AuditLogs />);

    expect(await screen.findAllByText('IP 203.0.113.7')).toHaveLength(2);
    expect(screen.getAllByText('⚠ Неудачный вход').length).toBeGreaterThan(0);
  });

  it('does not show an IP line for events without an address', async () => {
    renderWithQuery(<AuditLogs />);

    await waitFor(() => {
      expect(screen.getAllByText('Создана заявка № 101 для клиента Тест').length).toBeGreaterThan(0);
    });
    expect(screen.queryByText(/^IP /)).not.toBeInTheDocument();
  });

  it('filters sign-in events by the AUTH object', async () => {
    renderWithQuery(<AuditLogs />);

    fireEvent.change(screen.getByDisplayValue('Все объекты'), { target: { value: 'AUTH' } });

    await waitFor(() => {
      expect(auditLogsApi.getAuditLogs).toHaveBeenCalledWith(expect.objectContaining({ entityType: 'AUTH' }));
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

    renderWithQuery(<AuditLogs />);

    await waitFor(() => {
      expect(screen.getByText('Событий не найдено')).toBeInTheDocument();
    });
  });
});
