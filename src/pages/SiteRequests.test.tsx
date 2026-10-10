import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { renderWithQuery } from '../test-utils/queryWrapper';
import { SiteRequests } from './SiteRequests';
import { getSiteRequests, markSiteRequestProcessed, type SiteRequestItem } from '../api/siteRequests';
import { useAppStore } from '../store/useAppStore';
import { confirm } from '../utils/confirm';

vi.mock('../api/siteRequests', () => ({
  getSiteRequests: vi.fn(),
  deleteSiteRequest: vi.fn(),
  markSiteRequestProcessed: vi.fn(),
  convertSiteRequestToOrder: vi.fn()
}));
vi.mock('../utils/confirm', () => ({ confirm: vi.fn() }));

const request = (id: number, clientName: string) => ({
  id,
  tenantId: 1,
  clientName,
  phone: '+7999000000' + id,
  status: 'NEW',
  createdAt: '2026-09-27T10:00:00'
}) as SiteRequestItem;

describe('SiteRequests page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.setState({ newSiteRequestsCount: 0 });
    vi.mocked(getSiteRequests).mockImplementation(async (search?: string) => (
      search ? [request(2, 'Борис')] : [request(1, 'Анна'), request(2, 'Борис')]
    ));
  });

  it('shows requests and updates the menu badge with the full count', async () => {
    renderWithQuery(<SiteRequests />);

    expect((await screen.findAllByText('Анна')).length).toBeGreaterThan(0);
    await waitFor(() => expect(useAppStore.getState().newSiteRequestsCount).toBe(2));
  });

  it('searches with a debounce and keeps the badge count unchanged', async () => {
    renderWithQuery(<SiteRequests />);
    await screen.findAllByText('Анна');

    fireEvent.change(screen.getByPlaceholderText('Поиск по имени, телефону, сайту...'), { target: { value: 'Бор' } });

    await waitFor(() => expect(getSiteRequests).toHaveBeenLastCalledWith('Бор'));
    await waitFor(() => expect(screen.queryAllByText('Анна')).toHaveLength(0));
    expect(useAppStore.getState().newSiteRequestsCount).toBe(2);
  });

  it('marks a request as processed without an order after confirmation', async () => {
    vi.mocked(confirm).mockResolvedValue(true);
    vi.mocked(markSiteRequestProcessed).mockResolvedValue({ ...request(1, 'Анна'), status: 'PROCESSED' });
    renderWithQuery(<SiteRequests />);
    await screen.findAllByText('Анна');

    fireEvent.click(screen.getAllByRole('button', { name: 'Отметить обработанной без заказа' })[0]);

    await waitFor(() => expect(markSiteRequestProcessed).toHaveBeenCalledWith(1, undefined));
  });

  it('does not mark a request as processed when the confirmation is cancelled', async () => {
    vi.mocked(confirm).mockResolvedValue(false);
    renderWithQuery(<SiteRequests />);
    await screen.findAllByText('Анна');

    fireEvent.click(screen.getAllByRole('button', { name: 'Отметить обработанной без заказа' })[0]);

    await waitFor(() => expect(confirm).toHaveBeenCalled());
    expect(markSiteRequestProcessed).not.toHaveBeenCalled();
  });
});
