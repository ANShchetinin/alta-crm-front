import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Earnings } from './Earnings';
import * as earningsApi from '../api/earnings';

vi.mock('../api/earnings', () => ({
  getMyEarnings: vi.fn(),
}));

vi.mock('../store/useAppStore', () => ({
  useAppStore: () => ({
    tenantSettings: { timezone: 'Europe/Moscow' }
  })
}));

describe('Earnings Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders completed orders in descending order by completion date with ALL_TIME by default', async () => {
    const mockData: earningsApi.WorkerEarnings = {
      totalEarnings: 15000,
      completedOrdersCount: 2,
      items: [
        {
          orderId: 101,
          orderNumber: 'A001',
          clientName: 'Первый Клиент',
          installedAt: '2026-08-01T10:00:00Z',
          installationPrice: 5000,
          statusName: 'Выполнен'
        },
        {
          orderId: 102,
          orderNumber: 'A002',
          clientName: 'Второй Клиент (Новый)',
          installedAt: '2026-09-05T14:30:00Z',
          installationPrice: 10000,
          statusName: 'Выполнен'
        }
      ]
    };

    (earningsApi.getMyEarnings as any).mockResolvedValue(mockData);

    render(<Earnings />);

    await waitFor(() => {
      expect(screen.getByText('Мой заработок')).toBeInTheDocument();
    });

    // Both orders should be visible because default period is ALL_TIME
    expect(screen.getByText('Первый Клиент')).toBeInTheDocument();
    expect(screen.getByText('Второй Клиент (Новый)')).toBeInTheDocument();

    // Check order of rendered cards: order 102 should come first (latest completed date 2026-09-05)
    const clientElements = screen.getAllByText(/Клиент/);
    expect(clientElements[0].textContent).toContain('Второй Клиент (Новый)');
    expect(clientElements[1].textContent).toContain('Первый Клиент');
  });
});
