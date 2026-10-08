import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, waitFor, act } from '@testing-library/react';
import { renderWithQuery } from '../../../test-utils/queryWrapper';
import { OrderDrawer } from './OrderDrawer';
import * as kanbanApi from '../../../api/kanban';
import type { Order, OrderStatus } from '../../../api/kanban';
import { getClients, type Client } from '../../../api/clients';
import { getEmployees, type Employee } from '../../../api/employees';
import { useAuthStore } from '../../../store/useAuthStore';
import { useAppStore } from '../../../store/useAppStore';
import { useOrderDrawerStore } from '../../../store/useOrderDrawerStore';
import { toast } from '../../../utils/toast';

vi.mock('../../../api/kanban', async () => {
  const actual = await vi.importActual<typeof import('../../../api/kanban')>('../../../api/kanban');
  return {
    ...actual,
    getOrderStatuses: vi.fn(),
    getOrderById: vi.fn(),
    createOrder: vi.fn(),
    updateOrder: vi.fn(),
    completeOrder: vi.fn(),
    getAiSummary: vi.fn(),
    getOrderComments: vi.fn(),
    getNextOrderNumber: vi.fn()
  };
});
vi.mock('../../../api/clients', () => ({
  getClients: vi.fn(),
  createClient: vi.fn(),
  updateClient: vi.fn()
}));
vi.mock('../../../api/employees', () => ({ getEmployees: vi.fn() }));
vi.mock('../../../api/storage', () => ({
  getMaterials: vi.fn().mockResolvedValue([]),
  getLowStockMaterials: vi.fn().mockResolvedValue([])
}));
vi.mock('../../../api/settings', () => ({
  getContractTemplateStatus: vi.fn().mockResolvedValue({ individual: true, legal: false })
}));
vi.mock('../../../api/aiUsage', () => ({ getOrderAiUsage: vi.fn().mockResolvedValue(null) }));
vi.mock('../../../components/OrderRemindersSection', () => ({ OrderRemindersSection: () => null }));
vi.mock('../../measurements/components/MeasurementWizard', () => ({
  MeasurementWizard: ({ onSaved }: { onSaved?: () => void }) => (
    <div data-testid="measurement-wizard">
      <button type="button" onClick={() => onSaved?.()}>Сохранить смету (мок)</button>
    </div>
  )
}));

const statuses: OrderStatus[] = [
  { id: 1, name: 'Новая', color: '#3b82f6', sortOrder: 1 },
  { id: 2, name: 'Готов к монтажу', color: '#f59e0b', sortOrder: 2, isCompleted: false },
  { id: 3, name: 'Сдан', color: '#22c55e', sortOrder: 3, isCompleted: true }
];

const client: Client = {
  id: 10,
  name: 'Иван Петров',
  phone: '+7 (999) 123-45-67',
  whatsapp: '8 999 123 45 67',
  clientType: 'INDIVIDUAL'
} as Client;

const employees: Employee[] = [
  { id: 21, name: 'Олег Монтажник', phone: '+79990000001' },
  { id: 22, name: 'Пётр Монтажник', phone: '+79990000002' }
] as Employee[];

const baseOrder: Order = {
  id: 5,
  clientId: 10,
  clientName: 'Иван Петров',
  clientPhone: '+7 (999) 123-45-67',
  statusId: 1,
  address: 'Москва, ул. Тверская, 1',
  description: 'Натяжной потолок в зале',
  totalPrice: 50000,
  prepayment: 20000,
  remainder: 30000,
  installationPrice: 10000,
  installationDate: '2026-10-01T00:00:00',
  attachments: [{ id: 101, fileName: 'чертеж.pdf', contentType: 'application/pdf' }],
  materials: [{ materialId: 1, quantity: 2, fixedCostPrice: 1500 }],
  installers: [],
  commentsCount: 0
};

const clickTab = (name: string | RegExp) => {
  const tab = screen.getAllByRole('button', { name }).find(el => el.classList.contains('order-drawer-tab-btn'));
  if (!tab) {
    throw new Error(`Tab ${String(name)} not found`);
  }
  fireEvent.click(tab);
};

// EmployeeSearchSelect ignores clicks during the first 350 ms after mount
const waitForSelectMountGuard = () => new Promise(resolve => setTimeout(resolve, 400));

const renderOpenOrder = async (order: Order = baseOrder) => {
  vi.mocked(kanbanApi.getOrderById).mockResolvedValue(order);
  renderWithQuery(<OrderDrawer />);
  act(() => {
    useOrderDrawerStore.getState().openOrder(order.id);
  });
  await screen.findByDisplayValue(order.description);
};

describe('OrderDrawer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ role: 'OWNER', canAccessMeasurements: true, tenantId: 1 });
    useAppStore.setState({ tenantSettings: null });
    vi.mocked(kanbanApi.getOrderStatuses).mockResolvedValue(statuses);
    vi.mocked(kanbanApi.getAiSummary).mockResolvedValue(null as never);
    vi.mocked(kanbanApi.getOrderComments).mockResolvedValue([]);
    vi.mocked(getClients).mockResolvedValue([client]);
    vi.mocked(getEmployees).mockResolvedValue(employees);
  });

  afterEach(async () => {
    // Saving closes the drawer with a 240 ms animation — let it finish so it does not leak into the next test
    await act(() => new Promise(resolve => setTimeout(resolve, 300)));
    act(() => {
      useOrderDrawerStore.getState().closeOrder();
    });
  });

  it('loads the opened order by id and fills the form', async () => {
    await renderOpenOrder();

    expect(kanbanApi.getOrderById).toHaveBeenCalledWith(5);
    expect(screen.getByText('Заказ #5')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Москва, ул. Тверская, 1')).toBeInTheDocument();
    expect(screen.getByDisplayValue('20000')).toBeInTheDocument();
    expect(screen.getByDisplayValue('30000')).toBeInTheDocument();
  });

  it('builds a working tel: link for the client phone', async () => {
    await renderOpenOrder();

    const callLink = await screen.findByTitle('Позвонить клиенту: +7 (999) 123-45-67');
    expect(callLink).toHaveAttribute('href', 'tel:+79991234567');
  });

  it('shows profitability computed from the form', async () => {
    await renderOpenOrder();

    // 50000 - 2 * 1500 - 10000 = 37000
    expect(screen.getByText('+37 000 ₽')).toBeInTheDocument();
    expect(screen.getByText('74%')).toBeInTheDocument();
  });

  it('switches between tabs', async () => {
    await renderOpenOrder();

    clickTab(/Файлы и акты/);
    expect(await screen.findByText('чертеж.pdf')).toBeInTheDocument();
    expect(screen.getByText('Акт выполненных работ')).toBeInTheDocument();

    clickTab('Договор');
    expect(screen.getByText('Номер и формирование договора')).toBeInTheDocument();
    expect(screen.getByText('2. Чек-лист выполненных работ для Акта')).toBeInTheDocument();

    clickTab('Замер и смета');
    expect(screen.getByTestId('measurement-wizard')).toBeInTheDocument();

    clickTab('AI анализ звонков');
    expect(screen.getByText('Нет загруженных записей звонков')).toBeInTheDocument();
  });

  it('saves edited fields with the full payload', async () => {
    vi.mocked(kanbanApi.updateOrder).mockResolvedValue({ ...baseOrder, description: 'Новый текст' });
    await renderOpenOrder();

    fireEvent.change(screen.getByDisplayValue('Натяжной потолок в зале'), { target: { value: 'Новый текст' } });
    fireEvent.click(await screen.findByRole('button', { name: /Сохранить/ }));

    await waitFor(() => expect(kanbanApi.updateOrder).toHaveBeenCalledTimes(1));
    const [id, payload] = vi.mocked(kanbanApi.updateOrder).mock.calls[0];
    expect(id).toBe(5);
    expect(payload).toMatchObject({
      clientId: 10,
      statusId: 1,
      description: 'Новый текст',
      address: 'Москва, ул. Тверская, 1',
      totalPrice: 50000,
      prepayment: 20000,
      remainder: 30000,
      installationPrice: 10000,
      installationDate: '2026-10-01T00:00:00',
      prepaymentPaid: false,
      remainderPaid: false
    });
    expect(payload.contractParams).toMatchObject({ area: '70,3', specItems: [] });
    expect(payload.installedAt).toBeUndefined();
  });

  it('creates a new order', async () => {
    vi.mocked(kanbanApi.createOrder).mockResolvedValue({ ...baseOrder, id: 77 });
    renderWithQuery(<OrderDrawer />);
    act(() => {
      useOrderDrawerStore.getState().openCreateOrder();
    });

    expect(await screen.findByText('Новый заказ')).toBeInTheDocument();
    await waitForSelectMountGuard();
    fireEvent.click(screen.getByText('Выберите клиента из базы...'));
    fireEvent.click(await screen.findByText('Иван Петров'));
    fireEvent.change(screen.getByPlaceholderText('Описание заказа...'), { target: { value: 'Замер в спальне' } });
    fireEvent.click(screen.getByRole('button', { name: /Создать заказ/ }));

    await waitFor(() => expect(kanbanApi.createOrder).toHaveBeenCalledTimes(1));
    expect(vi.mocked(kanbanApi.createOrder).mock.calls[0][0]).toMatchObject({ description: 'Замер в спальне', clientId: 10, statusId: 1 });
  });

  it('adds installers and splits the installation price equally', async () => {
    vi.mocked(kanbanApi.updateOrder).mockResolvedValue(baseOrder);
    await renderOpenOrder({
      ...baseOrder,
      installers: [{ employeeId: 21, employeeName: 'Олег Монтажник', splitType: 'EQUAL', isLead: true, amount: 10000, sharePercent: 100 }],
      installedById: 21
    });

    fireEvent.click(screen.getByText('Добавить еще монтажника'));
    await waitForSelectMountGuard();
    fireEvent.click(screen.getByText('Выберите монтажника для добавления...'));
    fireEvent.click(await screen.findByText('Пётр Монтажник'));
    fireEvent.click(await screen.findByRole('button', { name: /Сохранить/ }));

    await waitFor(() => expect(kanbanApi.updateOrder).toHaveBeenCalledTimes(1));
    const payload = vi.mocked(kanbanApi.updateOrder).mock.calls[0][1];
    expect(payload.installers).toEqual([
      expect.objectContaining({ employeeId: 21, amount: 5000, sharePercent: 50, isLead: true }),
      expect.objectContaining({ employeeId: 22, amount: 5000, sharePercent: 50, isLead: false })
    ]);
    expect(payload.installedById).toBe(21);
  });

  it('sets installedAt when saving into a status flagged as completed', async () => {
    const withAct = { ...baseOrder, attachments: [...(baseOrder.attachments ?? []), { id: 102, fileName: 'Акт.pdf', contentType: 'application/pdf', isAct: true }] };
    vi.mocked(kanbanApi.updateOrder).mockResolvedValue(withAct);
    await renderOpenOrder(withAct);

    fireEvent.change(screen.getByTitle('Статус заказа'), { target: { value: '3' } });
    fireEvent.click(await screen.findByRole('button', { name: /Сохранить/ }));

    await waitFor(() => expect(kanbanApi.updateOrder).toHaveBeenCalledTimes(1));
    expect(vi.mocked(kanbanApi.updateOrder).mock.calls[0][1].installedAt).toEqual(expect.any(String));
  });

  it('does not complete an order with a contract without an act, like the board', async () => {
    const warning = vi.spyOn(toast, 'warning');
    await renderOpenOrder({ ...baseOrder, orderNumber: 'Д-5/26' });

    fireEvent.change(screen.getByTitle('Статус заказа'), { target: { value: '3' } });
    fireEvent.click(await screen.findByRole('button', { name: /Сохранить/ }));

    await waitFor(() => expect(warning).toHaveBeenCalledWith(
      'Для перевода заявки с договором в «Сдан» прикрепите Акт выполненных работ во вкладке «Файлы».'
    ));
    expect(kanbanApi.updateOrder).not.toHaveBeenCalled();
    expect(screen.getByText('Акт выполненных работ')).toBeInTheDocument();
  });

  it('completes an order without a contract without an act', async () => {
    vi.mocked(kanbanApi.updateOrder).mockResolvedValue({ ...baseOrder, statusId: 3 });
    await renderOpenOrder();

    expect(screen.queryByText('Акт выполненных работ не прикреплен')).not.toBeInTheDocument();
    fireEvent.change(screen.getByTitle('Статус заказа'), { target: { value: '3' } });
    fireEvent.click(await screen.findByRole('button', { name: /Сохранить/ }));

    await waitFor(() => expect(kanbanApi.updateOrder).toHaveBeenCalledTimes(1));
  });

  it('does not treat a status as completed by its name when the flag says otherwise', async () => {
    vi.mocked(kanbanApi.updateOrder).mockResolvedValue(baseOrder);
    await renderOpenOrder();

    fireEvent.change(screen.getByTitle('Статус заказа'), { target: { value: '2' } });
    fireEvent.click(await screen.findByRole('button', { name: /Сохранить/ }));

    await waitFor(() => expect(kanbanApi.updateOrder).toHaveBeenCalledTimes(1));
    expect(vi.mocked(kanbanApi.updateOrder).mock.calls[0][1].installedAt).toBeUndefined();
  });

  it('hides manager-only sections from a worker', async () => {
    useAuthStore.setState({ role: 'WORKER', canAccessMeasurements: false });
    await renderOpenOrder();

    expect(screen.queryByText('Договор')).not.toBeInTheDocument();
    expect(screen.queryByText('AI анализ звонков')).not.toBeInTheDocument();
    expect(screen.queryByText('Замер и смета')).not.toBeInTheDocument();
    expect(screen.getByText('Остаток к оплате по договору:')).toBeInTheDocument();
    expect(screen.queryByText('Финансы и оплата')).not.toBeInTheDocument();
    expect(getClients).not.toHaveBeenCalled();
  });

  it('takes the estimate saved in the measurement tab without a second save of the drawer', async () => {
    await renderOpenOrder();
    vi.mocked(kanbanApi.getOrderById).mockResolvedValue({ ...baseOrder, totalPrice: 42000, remainder: 22000 });

    clickTab('Замер и смета');
    fireEvent.click(screen.getByText('Сохранить смету (мок)'));

    await waitFor(() => expect(kanbanApi.getOrderById).toHaveBeenCalledTimes(2));
    clickTab('Основное');
    expect(await screen.findByDisplayValue('22000')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Close'));
    await act(() => new Promise(resolve => setTimeout(resolve, 50)));
    expect(screen.queryByText('Несохраненные изменения')).not.toBeInTheDocument();
    expect(kanbanApi.updateOrder).not.toHaveBeenCalled();
  });

  it('keeps other unsaved edits after the estimate is saved', async () => {
    await renderOpenOrder();
    fireEvent.change(screen.getByDisplayValue('Натяжной потолок в зале'), { target: { value: 'Изменено' } });
    vi.mocked(kanbanApi.getOrderById).mockResolvedValue({ ...baseOrder, totalPrice: 42000 });

    clickTab('Замер и смета');
    fireEvent.click(screen.getByText('Сохранить смету (мок)'));
    await waitFor(() => expect(kanbanApi.getOrderById).toHaveBeenCalledTimes(2));
    clickTab('Основное');

    expect(await screen.findByDisplayValue('Изменено')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Close'));
    expect(await screen.findByText('Несохраненные изменения')).toBeInTheDocument();
  });

  it('asks for confirmation before closing with unsaved changes', async () => {
    await renderOpenOrder();

    fireEvent.change(screen.getByDisplayValue('Натяжной потолок в зале'), { target: { value: 'Изменено' } });
    fireEvent.click(screen.getByLabelText('Close'));

    expect(await screen.findByText('Несохраненные изменения')).toBeInTheDocument();
  });
});
