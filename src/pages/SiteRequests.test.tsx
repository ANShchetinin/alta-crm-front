import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { renderWithQuery } from '../test-utils/queryWrapper';
import { SiteRequests } from './SiteRequests';
import {
  getSiteRequests,
  markSiteRequestReviewed,
  rejectSiteRequest,
  type SiteRequestItem,
  type SiteRequestStatus
} from '../api/siteRequests';
import { useAppStore } from '../store/useAppStore';
import { confirm } from '../utils/confirm';

vi.mock('../api/siteRequests', () => ({
  getSiteRequests: vi.fn(),
  deleteSiteRequest: vi.fn(),
  markSiteRequestReviewed: vi.fn(),
  rejectSiteRequest: vi.fn(),
  convertSiteRequestToOrder: vi.fn()
}));
vi.mock('../utils/confirm', () => ({ confirm: vi.fn() }));

const request = (id: number, clientName: string, status: SiteRequestStatus = 'NEW') => ({
  id,
  tenantId: 1,
  clientName,
  phone: '+7999000000' + id,
  status,
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

  it('keeps reviewed requests in the list with a badge but counts only new ones in the menu', async () => {
    vi.mocked(getSiteRequests).mockResolvedValue([request(1, 'Анна', 'REVIEWED'), request(2, 'Борис')]);
    renderWithQuery(<SiteRequests />);

    expect((await screen.findAllByText('Анна')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Обработана').length).toBeGreaterThan(0);
    await waitFor(() => expect(useAppStore.getState().newSiteRequestsCount).toBe(1));
    // «Обработана» доступна только у новой заявки: одна кнопка в таблице и одна в мобильной карточке
    expect(screen.getAllByRole('button', { name: 'Отметить обработанной' })).toHaveLength(2);
  });

  it('marks a request as reviewed without confirmation', async () => {
    vi.mocked(markSiteRequestReviewed).mockResolvedValue(request(1, 'Анна', 'REVIEWED'));
    renderWithQuery(<SiteRequests />);
    await screen.findAllByText('Анна');

    fireEvent.click(screen.getAllByRole('button', { name: 'Отметить обработанной' })[0]);

    await waitFor(() => expect(markSiteRequestReviewed).toHaveBeenCalledWith(1, undefined));
    expect(confirm).not.toHaveBeenCalled();
  });

  it('rejects a request after confirmation', async () => {
    vi.mocked(confirm).mockResolvedValue(true);
    vi.mocked(rejectSiteRequest).mockResolvedValue(request(1, 'Анна', 'REJECTED'));
    renderWithQuery(<SiteRequests />);
    await screen.findAllByText('Анна');

    fireEvent.click(screen.getAllByRole('button', { name: 'Отказ' })[0]);

    await waitFor(() => expect(rejectSiteRequest).toHaveBeenCalledWith(1, undefined));
  });

  it('does not reject a request when the confirmation is cancelled', async () => {
    vi.mocked(confirm).mockResolvedValue(false);
    renderWithQuery(<SiteRequests />);
    await screen.findAllByText('Анна');

    fireEvent.click(screen.getAllByRole('button', { name: 'Отказ' })[0]);

    await waitFor(() => expect(confirm).toHaveBeenCalled());
    expect(rejectSiteRequest).not.toHaveBeenCalled();
  });
});
