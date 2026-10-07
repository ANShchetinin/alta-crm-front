import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, fireEvent, within } from '@testing-library/react';
import { renderWithQuery } from '../test-utils/queryWrapper';
import { Finances } from './Finances';
import * as kanbanApi from '../api/kanban';
import * as employeesApi from '../api/employees';
import * as financesApi from '../api/finances';
import * as aiUsageApi from '../api/aiUsage';

vi.mock('../api/kanban', () => ({
  getOrders: vi.fn(),
  getArchivedOrders: vi.fn(),
  getOrderStatuses: vi.fn(),
  togglePrepaymentPaid: vi.fn(),
  toggleRemainderPaid: vi.fn(),
  updateFinanceStatuses: vi.fn()
}));
vi.mock('../api/employees', () => ({ getEmployees: vi.fn() }));
vi.mock('../api/finances', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/finances')>()),
  getExpenses: vi.fn(),
  createExpense: vi.fn(),
  updateExpense: vi.fn(),
  deleteExpense: vi.fn()
}));
vi.mock('../api/aiUsage', () => ({ getCompanyAiUsageSummary: vi.fn() }));
vi.mock('../utils/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() }
}));
vi.mock('../store/useAuthStore', () => {
  const state = { role: 'OWNER', tenantId: 1 };
  return {
    useAuthStore: (selector?: (s: typeof state) => unknown) => (selector ? selector(state) : state)
  };
});
vi.mock('../store/useAppStore', () => ({
  useAppStore: () => ({ tenantSettings: { timezone: 'Europe/Moscow' } })
}));
const navigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useNavigate: () => navigate
}));

const statuses: kanbanApi.OrderStatus[] = [
  { id: 1, name: 'Новая заявка', color: '#3b82f6', sortOrder: 1, includeInFinances: true },
  { id: 2, name: 'Монтаж завершен', color: '#22c55e', sortOrder: 2, includeInFinances: true, isCompleted: true },
  { id: 3, name: 'Спам', color: '#ef4444', sortOrder: 3, includeInFinances: false }
];

const orders = [
  {
    id: 1,
    orderNumber: 'А-1',
    clientName: 'Иван Иванов',
    statusId: 1,
    totalPrice: 100000,
    prepayment: 30000,
    prepaymentPaid: true,
    prepaymentPaidAt: '2026-09-05T10:00:00',
    remainder: 70000,
    remainderPaid: false,
    createdAt: '2026-09-01T10:00:00'
  },
  {
    id: 2,
    orderNumber: 'А-2',
    clientName: 'Анна Смирнова',
    statusId: 2,
    totalPrice: 50000,
    prepayment: 20000,
    prepaymentPaid: true,
    prepaymentPaidAt: '2026-09-03T10:00:00',
    remainder: 30000,
    remainderPaid: true,
    remainderPaidAt: '2026-09-10T10:00:00',
    installedAt: '2026-09-10T10:00:00',
    installationPrice: 5000,
    materialsCost: 10000,
    installedById: 10,
    createdAt: '2026-09-02T10:00:00'
  },
  {
    id: 3,
    orderNumber: 'А-3',
    clientName: 'Спамер',
    statusId: 3,
    totalPrice: 999000,
    prepayment: 999000,
    prepaymentPaid: true,
    prepaymentPaidAt: '2026-09-04T10:00:00',
    createdAt: '2026-09-04T10:00:00'
  }
] as kanbanApi.Order[];

const expenses = [
  { id: 1, title: 'Аренда офиса', category: 'RENT', categoryLabel: 'Аренда', amount: 3000, expenseDate: '2026-09-02' }
] as financesApi.Expense[];

/** Сумма в формате страницы: toLocaleString('ru-RU') разделяет разряды неразрывным пробелом. */
const money = (value: number) => new RegExp(`${value.toLocaleString('ru-RU').replace(/\s/g, '\\s')}\\s₽`);

describe('Finances page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 8, 15, 12, 0));
    vi.mocked(kanbanApi.getOrders).mockResolvedValue(orders);
    vi.mocked(kanbanApi.getOrderStatuses).mockResolvedValue(statuses);
    vi.mocked(employeesApi.getEmployees).mockResolvedValue([{ id: 10, name: 'Олег', position: 'Монтажник' } as employeesApi.Employee]);
    vi.mocked(financesApi.getExpenses).mockResolvedValue(expenses);
    vi.mocked(aiUsageApi.getCompanyAiUsageSummary).mockResolvedValue({ totalRequestsCount: 0, recentLogs: [] } as unknown as aiUsageApi.AiUsageSummaryDto);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows profit and received money of the current month without orders of excluded statuses', async () => {
    renderWithQuery(<Finances />);

    expect(await screen.findByText('Финансы и касса')).toBeInTheDocument();
    // Приход: авансы 30 000 + 20 000 и остаток 30 000; заказ в статусе «Спам» не учитывается
    expect(screen.getAllByText(money(80000)).length).toBeGreaterThan(0);
    // Прибыль: выручка завершённого заказа 50 000 − (материалы 10 000 + монтаж 5 000 + расходы 3 000)
    expect(screen.getAllByText(money(32000)).length).toBeGreaterThan(0);
    expect(screen.queryByText('Спамер')).not.toBeInTheDocument();
    expect(screen.getByText('2 из 3')).toBeInTheDocument();
  });

  it('requests AI costs for the local calendar month', async () => {
    renderWithQuery(<Finances />);

    await waitFor(() => expect(aiUsageApi.getCompanyAiUsageSummary).toHaveBeenCalledWith('2026-09-01', '2026-09-30'));
  });

  it('marks the remainder as received from the transactions table', async () => {
    vi.mocked(kanbanApi.toggleRemainderPaid).mockResolvedValue({ ...orders[0], remainderPaid: true });
    renderWithQuery(<Finances />);

    fireEvent.click(await screen.findByTitle('Нажмите, чтобы отметить получение остатка'));

    await waitFor(() => expect(kanbanApi.toggleRemainderPaid).toHaveBeenCalledWith(1, true, expect.any(String)));
    await waitFor(() => expect(screen.queryByTitle('Нажмите, чтобы отметить получение остатка')).not.toBeInTheDocument());
  });

  it('lists debtors and opens orders in the kanban', async () => {
    renderWithQuery(<Finances />);

    fireEvent.click(await screen.findByText('Дебиторка / Должники'));
    expect(screen.getByText('Договор № А-1')).toBeInTheDocument();
    expect(screen.queryByText('Договор № А-2')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Взаиморасчёты и приём оплат'));
    fireEvent.click(screen.getAllByTitle('Открыть сделку в Канбане')[0]);
    expect(navigate).toHaveBeenCalledWith('/kanban?orderId=1');
  });

  it('saves the statuses included in finances', async () => {
    vi.mocked(kanbanApi.updateFinanceStatuses).mockResolvedValue(statuses.map(s => ({ ...s, includeInFinances: true })));
    renderWithQuery(<Finances />);

    fireEvent.click(await screen.findByTitle('Настроить статусы заявок, учитываемые в расчетах финансов'));
    const modal = screen.getByText('Статусы, учитываемые в финансах').closest('.modal-content') as HTMLElement;
    fireEvent.click(within(modal).getByText('Выбрать все'));
    fireEvent.click(within(modal).getByText('Применить и сохранить'));

    await waitFor(() => expect(kanbanApi.updateFinanceStatuses).toHaveBeenCalledWith({ 1: true, 2: true, 3: true }));
    await waitFor(() => expect(screen.getByText('3 из 3')).toBeInTheDocument());
  });

  it('shows expenses of the period and opens the expense form', async () => {
    renderWithQuery(<Finances />);

    fireEvent.click(await screen.findByText('Расходы компании', { selector: '.desktop-tab-label' }));
    expect(screen.getAllByText('Аренда офиса').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByText('Добавить расход'));
    expect(screen.getByText('Новый расход компании')).toBeInTheDocument();
  });
});
