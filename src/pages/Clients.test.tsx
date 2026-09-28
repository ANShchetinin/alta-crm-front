import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, fireEvent, within } from '@testing-library/react';
import { renderWithQuery } from '../test-utils/queryWrapper';
import { Clients } from './Clients';
import * as clientsApi from '../api/clients';
import * as kanbanApi from '../api/kanban';
import * as authApi from '../api/auth';
import { toast } from '../utils/toast';

vi.mock('../api/clients', () => ({
  getClients: vi.fn(),
  createClient: vi.fn(),
  updateClient: vi.fn(),
  deleteClient: vi.fn()
}));
vi.mock('../api/kanban', () => ({
  getOrderStatuses: vi.fn(),
  getOrdersByClient: vi.fn(),
  moveOrder: vi.fn()
}));
vi.mock('../api/auth', () => ({ getMyTenants: vi.fn() }));
vi.mock('../utils/confirm', () => ({ confirm: vi.fn().mockResolvedValue(true) }));
vi.mock('../utils/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() }
}));
vi.mock('../hooks/useFeatureToggle', () => ({ useFeature: () => false }));
vi.mock('../components/AvatarUpload', () => ({ AvatarUpload: () => null }));
vi.mock('../components/PassportScannerModal', () => ({ PassportScannerModal: () => null }));
vi.mock('../store/useAuthStore', () => {
  const state = { role: 'OWNER', tenantId: 1 };
  return {
    useAuthStore: (selector?: (s: typeof state) => unknown) => (selector ? selector(state) : state)
  };
});
vi.mock('../store/useAppStore', () => ({
  useAppStore: () => ({ tenantSettings: { timezone: 'Europe/Moscow' } })
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, fallback?: string) => fallback ?? key })
}));
const navigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useNavigate: () => navigate
}));

const clients: clientsApi.Client[] = [
  { id: 1, name: 'Иван Петров', phone: '+79990001122', clientType: 'INDIVIDUAL', createdAt: '2026-09-01T10:00:00', leadSource: 'Авито' },
  {
    id: 2,
    name: 'ООО Альфа',
    phone: '+74950000000',
    clientType: 'LEGAL_ENTITY',
    inn: '7701234567',
    createdAt: '2026-09-02T10:00:00',
    contacts: [{ name: 'Сидоров', position: 'Директор', isPrimary: true }]
  }
];

const statuses: kanbanApi.OrderStatus[] = [
  { id: 1, name: 'Новая', color: '#3b82f6', sortOrder: 1 },
  { id: 2, name: 'Монтаж', color: '#22c55e', sortOrder: 2 }
];

/** Десктопная таблица: в тестах видны и таблица, и мобильные карточки. */
const table = () => document.querySelector('.clients-table') as HTMLElement;

describe('Clients page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(clientsApi.getClients).mockResolvedValue(clients);
    vi.mocked(kanbanApi.getOrderStatuses).mockResolvedValue(statuses);
    vi.mocked(authApi.getMyTenants).mockResolvedValue({ currentTenantId: 1, tenants: [] } as unknown as Awaited<ReturnType<typeof authApi.getMyTenants>>);
  });

  it('lists clients with type counters and filters by type and search', async () => {
    renderWithQuery(<Clients />);

    expect(await screen.findByText('Все (2)')).toBeInTheDocument();
    expect(within(table()).getByText('Иван Петров')).toBeInTheDocument();
    expect(within(table()).getByText('ООО Альфа')).toBeInTheDocument();

    fireEvent.click(screen.getByText(/Компании \/ Юрлица/));
    expect(within(table()).queryByText('Иван Петров')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Все (2)'));
    fireEvent.change(screen.getByPlaceholderText('Поиск по имени, ИНН, телефону...'), { target: { value: '0001122' } });
    expect(within(table()).getByText('Иван Петров')).toBeInTheDocument();
    expect(within(table()).queryByText('ООО Альфа')).not.toBeInTheDocument();
  });

  it('creates an individual client from the form', async () => {
    vi.mocked(clientsApi.createClient).mockResolvedValue({ ...clients[0], id: 3 });
    renderWithQuery(<Clients />);

    fireEvent.click(await screen.findByText('clients.addClient'));
    fireEvent.change(screen.getByPlaceholderText('Иван Иванов'), { target: { value: '  Анна Смирнова ' } });
    fireEvent.change(screen.getByPlaceholderText('+7 (999) 000-00-00'), { target: { value: '+79995554433' } });
    fireEvent.click(screen.getByText('Создать клиента'));

    await waitFor(() => expect(clientsApi.createClient).toHaveBeenCalledWith(expect.objectContaining({
      clientType: 'INDIVIDUAL',
      name: 'Анна Смирнова',
      phone: '+79995554433',
      allowedTenantIds: [1]
    })));
    expect(toast.success).toHaveBeenCalledWith('Клиент успешно создан');
  });

  it('opens a legal entity for editing and saves its requisites', async () => {
    vi.mocked(clientsApi.updateClient).mockResolvedValue(clients[1]);
    renderWithQuery(<Clients />);

    await screen.findByText('Все (2)');
    fireEvent.click(within(table()).getByText('ООО Альфа'));
    expect(screen.getByDisplayValue('7701234567')).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('770101001'), { target: { value: '770101001' } });
    fireEvent.click(screen.getByText('Сохранить'));

    await waitFor(() => expect(clientsApi.updateClient).toHaveBeenCalledWith(2, expect.objectContaining({
      clientType: 'LEGAL_ENTITY',
      kpp: '770101001',
      contactPerson: 'Сидоров'
    })));
  });

  it('shows the backend error when saving fails', async () => {
    vi.mocked(clientsApi.updateClient).mockRejectedValue(new Error('Телефон уже занят'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    renderWithQuery(<Clients />);

    await screen.findByText('Все (2)');
    fireEvent.click(within(table()).getByText('Иван Петров'));
    fireEvent.click(screen.getByText('Сохранить'));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Телефон уже занят'));
  });

  it('deletes a client after confirmation', async () => {
    vi.mocked(clientsApi.deleteClient).mockResolvedValue(undefined);
    renderWithQuery(<Clients />);

    await screen.findByText('Все (2)');
    fireEvent.click(within(table()).getAllByTitle('Удалить')[0]);

    await waitFor(() => expect(clientsApi.deleteClient).toHaveBeenCalledWith(1));
  });

  it('shows the order history and changes an order status from it', async () => {
    vi.mocked(kanbanApi.getOrdersByClient).mockResolvedValue([
      { id: 10, orderNumber: 'А-10', statusId: 1, totalPrice: 50000, prepayment: 20000, remainder: 30000, createdAt: '2026-09-03T10:00:00' } as kanbanApi.Order
    ]);
    vi.mocked(kanbanApi.moveOrder).mockResolvedValue({} as kanbanApi.Order);
    renderWithQuery(<Clients />);

    await screen.findByText('Все (2)');
    fireEvent.click(within(table()).getAllByTitle('История заявок')[0]);

    expect(await screen.findByText('История заявок: Иван Петров')).toBeInTheDocument();
    expect(kanbanApi.getOrdersByClient).toHaveBeenCalledWith(1);
    const selects = await screen.findAllByDisplayValue('Новая');
    fireEvent.change(selects[0], { target: { value: '2' } });

    await waitFor(() => expect(kanbanApi.moveOrder).toHaveBeenCalledWith(10, 2));
    fireEvent.click(screen.getByText('Перейти'));
    expect(navigate).toHaveBeenCalledWith('/kanban?orderId=10');
  });
});
