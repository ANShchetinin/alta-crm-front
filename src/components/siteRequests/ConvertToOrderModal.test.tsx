import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithQuery } from '../../test-utils/queryWrapper';
import { ConvertToOrderModal } from './ConvertToOrderModal';
import { getOrderStatuses, type OrderStatus } from '../../api/kanban';
import { convertSiteRequestToOrder, type SiteRequestItem } from '../../api/siteRequests';

vi.mock('../../api/kanban', () => ({ getOrderStatuses: vi.fn() }));
vi.mock('../../api/siteRequests', () => ({ convertSiteRequestToOrder: vi.fn() }));
vi.mock('../../utils/toast', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const statuses: OrderStatus[] = [
  { id: 7, name: 'Замер', color: '#f59e0b', sortOrder: 2 },
  { id: 3, name: 'Новая', color: '#3b82f6', sortOrder: 1 }
];

const siteRequest = { id: 42, clientName: 'Анна', phone: '+79990001122' } as SiteRequestItem;

const renderModal = () => renderWithQuery(
  <ConvertToOrderModal siteRequest={siteRequest} isOpen onClose={vi.fn()} onSuccess={vi.fn()} />
);

describe('ConvertToOrderModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getOrderStatuses).mockResolvedValue(statuses);
    vi.mocked(convertSiteRequestToOrder).mockResolvedValue({ id: 100, orderNumber: '100' } as never);
  });

  it('shows statuses in board order and converts into the first one by default', async () => {
    renderModal();

    const options = await screen.findAllByRole('button', { name: /Новая|Замер/ });
    expect(options.map(o => o.textContent)).toEqual(['Новая', 'Замер']);

    fireEvent.click(screen.getByRole('button', { name: /Создать заказ/ }));

    await waitFor(() => expect(convertSiteRequestToOrder).toHaveBeenCalledWith(42, expect.objectContaining({ statusId: 3 })));
  });

  it('converts into the status picked by the user', async () => {
    renderModal();

    fireEvent.click(await screen.findByRole('button', { name: 'Замер' }));
    fireEvent.click(screen.getByRole('button', { name: /Создать заказ/ }));

    await waitFor(() => expect(convertSiteRequestToOrder).toHaveBeenCalledWith(42, expect.objectContaining({ statusId: 7 })));
  });
});
