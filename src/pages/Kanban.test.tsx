import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { renderWithQuery } from '../test-utils/queryWrapper';
import Kanban from './Kanban';
import * as kanbanApi from '../api/kanban';
import { getClients } from '../api/clients';
import { getEmployees } from '../api/employees';
import { getMyReminders } from '../api/reminders';
import { useAuthStore } from '../store/useAuthStore';
import { useOrderDrawerStore } from '../store/useOrderDrawerStore';

vi.mock('../api/kanban', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/kanban')>()),
  getOrders: vi.fn(),
  getOrderStatuses: vi.fn(),
  moveOrder: vi.fn(),
  completeOrder: vi.fn(),
  reorderOrderStatuses: vi.fn()
}));
vi.mock('../api/clients', () => ({ getClients: vi.fn() }));
vi.mock('../api/employees', () => ({ getEmployees: vi.fn() }));
vi.mock('../api/reminders', () => ({ getMyReminders: vi.fn() }));
vi.mock('../utils/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() }
}));

const statuses: kanbanApi.OrderStatus[] = [
  { id: 1, name: 'Новые', color: '#3b82f6', sortOrder: 1, isCompleted: false },
  { id: 2, name: 'Монтаж', color: '#f59e0b', sortOrder: 2, isCompleted: false },
  { id: 3, name: 'Завершен', color: '#22c55e', sortOrder: 3, isCompleted: true }
];

const orders = [
  { id: 11, clientId: 1, clientName: 'Иван Петров', statusId: 1, address: 'ул. Ленина, 1', totalPrice: 50000, prepayment: 20000, remainder: 30000 },
  {
    id: 12,
    clientId: 1,
    clientName: 'Анна Смирнова',
    statusId: 2,
    totalPrice: 80000,
    prepayment: 30000,
    clientWhatsapp: '+79990001122',
    installedByName: 'Олег',
    attachments: [{ id: 1, fileName: 'Акт.pdf', isAct: true }]
  },
  { id: 13, clientId: 1, clientName: 'Без акта', statusId: 2, installedByName: 'Олег' }
] as kanbanApi.Order[];

/** DataTransfer для перетаскивания мышью в jsdom. */
const dataTransfer = () => {
  const data: Record<string, string> = {};
  return {
    setData: (key: string, value: string) => { data[key] = value; },
    getData: (key: string) => data[key] ?? '',
    effectAllowed: 'move'
  };
};

const column = (name: string) => screen.getByRole('heading', { name }).closest('.kanban-column') as HTMLElement;
const cardElement = (orderId: number) => document.querySelector(`[data-card-id="${orderId}"]`) as HTMLElement;

const dragCardTo = (orderId: number, columnName: string) => {
  const transfer = dataTransfer();
  fireEvent.dragStart(cardElement(orderId), { dataTransfer: transfer });
  fireEvent.drop(column(columnName), { dataTransfer: transfer });
};

const renderBoard = async () => {
  renderWithQuery(<MemoryRouter><Kanban /></MemoryRouter>);
  await screen.findByRole('heading', { name: 'Новые' });
};

describe('Kanban board', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1280 });
    useAuthStore.setState({ role: 'OWNER', tenantId: 1 });
    vi.mocked(kanbanApi.getOrders).mockResolvedValue(orders);
    vi.mocked(kanbanApi.getOrderStatuses).mockResolvedValue(statuses);
    vi.mocked(getClients).mockResolvedValue([]);
    vi.mocked(getEmployees).mockResolvedValue([]);
    vi.mocked(getMyReminders).mockResolvedValue([]);
  });

  it('shows the cards in their stage columns with counters', async () => {
    await renderBoard();

    expect(column('Новые')).toContainElement(cardElement(11));
    expect(column('Монтаж')).toContainElement(cardElement(12));
    expect(within(column('Монтаж')).getByText('2')).toBeInTheDocument();
  });

  it('filters cards by search and shows found / total per column', async () => {
    await renderBoard();

    fireEvent.change(screen.getByPlaceholderText('Поиск по клиенту, адресу, № договора...'), { target: { value: 'анна' } });

    expect(cardElement(11)).toBeNull();
    expect(within(column('Монтаж')).getByText('1/2')).toBeInTheDocument();
  });

  it('moves a card to another stage after confirmation', async () => {
    vi.mocked(kanbanApi.moveOrder).mockResolvedValue({} as kanbanApi.Order);
    await renderBoard();

    dragCardTo(11, 'Монтаж');
    fireEvent.change(await screen.findByPlaceholderText(/Замер согласован/), { target: { value: 'Созвонились' } });
    fireEvent.click(screen.getByText('Переместить'));

    await waitFor(() => expect(kanbanApi.moveOrder).toHaveBeenCalledWith(11, 2, 'Созвонились'));
    expect(column('Монтаж')).toContainElement(cardElement(11));
  });

  it('does not move a card into a completed stage without an act', async () => {
    await renderBoard();

    dragCardTo(13, 'Завершен');

    expect(await screen.findByText(/необходимо прикрепить подписанный Акт/)).toBeInTheDocument();
    expect(kanbanApi.moveOrder).not.toHaveBeenCalled();
  });

  it('completes the installation of a card with an act', async () => {
    vi.mocked(kanbanApi.completeOrder).mockResolvedValue({ ...orders[1], statusId: 3, installedAt: '2026-09-28T10:00:00' });
    await renderBoard();

    fireEvent.click(within(cardElement(12)).getByText('Завершить монтаж'));

    await waitFor(() => expect(kanbanApi.completeOrder).toHaveBeenCalledWith(12));
    await waitFor(() => expect(column('Завершен')).toContainElement(cardElement(12)));
  });

  it('shows the remainder derived from the contract sum when it is not set', async () => {
    await renderBoard();

    expect(within(cardElement(12)).getByText(/50\s000\s₽/)).toBeInTheDocument();
  });

  it('shows client messengers from the order to a worker, who has no client directory', async () => {
    useAuthStore.setState({ role: 'WORKER', tenantId: 1 });
    await renderBoard();

    expect(getClients).not.toHaveBeenCalled();
    expect(within(cardElement(12)).getByTitle('Написать в WhatsApp: +79990001122')).toBeInTheDocument();
  });

  it('opens the order drawer on card click', async () => {
    await renderBoard();

    fireEvent.click(cardElement(11));

    expect(useOrderDrawerStore.getState()).toMatchObject({ isOpen: true, orderId: 11 });
  });
});
