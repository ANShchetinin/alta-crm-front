import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { Archive } from './Archive';
import * as kanbanApi from '../api/kanban';
import * as clientsApi from '../api/clients';
import * as employeesApi from '../api/employees';
import * as measurementsApi from '../api/measurements';

vi.mock('../api/kanban', () => ({
  getArchivedOrders: vi.fn(),
  getOrderStatuses: vi.fn(),
  updateOrder: vi.fn(),
  deleteOrder: vi.fn(),
  downloadContractDocx: vi.fn(),
  downloadContractPdf: vi.fn()
}));

vi.mock('../api/clients', () => ({
  getClients: vi.fn()
}));

vi.mock('../api/employees', () => ({
  getEmployees: vi.fn()
}));

vi.mock('../api/measurements', () => ({
  getMeasurementByOrderId: vi.fn()
}));

vi.mock('../store/useAuthStore', () => ({
  useAuthStore: () => ({
    role: 'OWNER'
  })
}));

vi.mock('../store/useAppStore', () => ({
  useAppStore: () => ({
    tenantSettings: {
      timezone: 'Europe/Moscow',
      name: 'Alta CRM'
    }
  })
}));

describe('Archive Page Component', () => {
  const mockStatuses: kanbanApi.OrderStatus[] = [
    { id: 1, name: 'В работе', color: '#3b82f6', sortOrder: 1, isCompleted: false },
    { id: 2, name: 'Завершен', color: '#10b981', sortOrder: 2, isCompleted: true }
  ];

  const mockOrders: kanbanApi.Order[] = [
    {
      id: 101,
      orderNumber: 'А0101_1',
      clientId: 1,
      clientName: 'Иван Иванов',
      clientPhone: '+79991234567',
      address: 'ул. Ленина, д. 15',
      statusId: 2,
      totalPrice: 45000,
      prepayment: 15000,
      remainder: 30000,
      installationPrice: 10000,
      installedByName: 'Алексей Монтажник',
      installedById: 10,
      installedAt: '2026-01-15T14:30:00Z',
      createdAt: '2026-01-10T10:00:00Z',
      isArchived: true,
      description: 'Монтаж натяжного потолка в гостиной',
      contractParams: {
        specItems: [
          { idx: 1, name: 'Полотно MSD Premium (Гостиная)', quantity: '20', unit: 'м²', price: 1000, total: 20000 },
          { idx: 2, name: 'Монтаж профиля стенового', quantity: '18', unit: 'м/п', price: 500, total: 9000 }
        ]
      }
    },
    {
      id: 102,
      orderNumber: 'А0102_2',
      clientId: 2,
      clientName: 'Анна Смирнова',
      clientPhone: '+79997654321',
      address: 'пр. Мира, д. 40',
      statusId: 2,
      totalPrice: 60000,
      prepayment: 20000,
      remainder: 40000,
      installedByName: 'Дмитрий Мастер',
      installedById: 20,
      installedAt: '2026-02-20T16:00:00Z',
      createdAt: '2026-02-15T12:00:00Z',
      isArchived: true,
      description: 'Монтаж световых линий'
    }
  ];

  const mockClients: clientsApi.Client[] = [
    { id: 1, name: 'Иван Иванов', phone: '+79991234567', createdAt: '2026-01-01T00:00:00Z' },
    { id: 2, name: 'Анна Смирнова', phone: '+79997654321', createdAt: '2026-02-01T00:00:00Z' }
  ];

  const mockEmployees: employeesApi.Employee[] = [
    { id: 10, name: 'Алексей Монтажник', position: 'Монтажник', phone: '+79990001122' },
    { id: 20, name: 'Дмитрий Мастер', position: 'Бригадир', phone: '+79990003344' }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (kanbanApi.getArchivedOrders as any).mockResolvedValue(mockOrders);
    (kanbanApi.getOrderStatuses as any).mockResolvedValue(mockStatuses);
    (clientsApi.getClients as any).mockResolvedValue(mockClients);
    (employeesApi.getEmployees as any).mockResolvedValue(mockEmployees);
    (measurementsApi.getMeasurementByOrderId as any).mockResolvedValue({
      id: 1,
      orderId: 101,
      rooms: [
        { roomName: 'Гостиная', area: 20, perimeter: 18 }
      ],
      items: [
        { name: 'Полотно MSD Premium', roomName: 'Гостиная', quantity: 20, unit: 'м²', unitSalePrice: 1000, totalSalePrice: 20000 }
      ]
    });
  });

  it('renders archive header without count badge and renders order list', async () => {
    render(<Archive />);

    expect(screen.getByText('Загрузка архивных заявок...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Архив заявок')).toBeInTheDocument();
    });

    // Check table content
    expect(screen.getByText('А0101_1')).toBeInTheDocument();
    expect(screen.getByText('А0102_2')).toBeInTheDocument();
    expect(screen.getByText('Иван Иванов')).toBeInTheDocument();
    expect(screen.getByText('Анна Смирнова')).toBeInTheDocument();
    expect(screen.getByText('ул. Ленина, д. 15')).toBeInTheDocument();
    expect(screen.getByText('пр. Мира, д. 40')).toBeInTheDocument();
  });

  it('filters orders by search query', async () => {
    render(<Archive />);

    await waitFor(() => {
      expect(screen.getByText('А0101_1')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Поиск по номеру, клиенту/i);
    fireEvent.change(searchInput, { target: { value: 'Смирнова' } });

    expect(screen.queryByText('Иван Иванов')).not.toBeInTheDocument();
    expect(screen.getByText('Анна Смирнова')).toBeInTheDocument();
  });

  it('opens detail modal on order row click, displays estimate, and allows return to kanban', async () => {
    window.confirm = vi.fn().mockReturnValue(true);
    window.alert = vi.fn();
    (kanbanApi.updateOrder as any).mockResolvedValue({ ...mockOrders[0], statusId: 1 });

    render(<Archive />);

    await waitFor(() => {
      expect(screen.getByText('А0101_1')).toBeInTheDocument();
    });

    const row = screen.getByText('А0101_1').closest('tr');
    expect(row).toBeInTheDocument();
    fireEvent.click(row!);

    await waitFor(() => {
      expect(screen.getByText('Заявка А0101_1')).toBeInTheDocument();
      expect(screen.getByText('Данные клиента')).toBeInTheDocument();
      expect(screen.getByText('Смета и спецификация заказа')).toBeInTheDocument();
      expect(screen.getByText('Полотно MSD Premium')).toBeInTheDocument();
      expect(screen.getByText('Вернуть на Канбан')).toBeInTheDocument();
    });

    const returnBtn = screen.getByText('Вернуть на Канбан');
    fireEvent.click(returnBtn);

    await waitFor(() => {
      expect(kanbanApi.updateOrder).toHaveBeenCalledWith(101, expect.objectContaining({
        statusId: 1
      }));
      expect(window.alert).toHaveBeenCalledWith('Заявка успешно возвращена на Канбан-доску');
    });
  });

  it('allows deleting an order from archive', async () => {
    window.confirm = vi.fn().mockReturnValue(true);
    (kanbanApi.deleteOrder as any).mockResolvedValue(undefined);

    render(<Archive />);

    await waitFor(() => {
      expect(screen.getByText('А0101_1')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByTitle('Удалить заявку');
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalled();
      expect(kanbanApi.deleteOrder).toHaveBeenCalled();
    });
  });

  it('handles docx download', async () => {
    const fakeBlob = new Blob(['docx content'], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    (kanbanApi.downloadContractDocx as any).mockResolvedValue(fakeBlob);
    window.URL.createObjectURL = vi.fn().mockReturnValue('blob:http://localhost/fake-url');
    window.URL.revokeObjectURL = vi.fn();

    render(<Archive />);

    await waitFor(() => {
      expect(screen.getByText('А0101_1')).toBeInTheDocument();
    });

    const docxButtons = screen.getAllByTitle('Скачать договор Word (.docx)');
    fireEvent.click(docxButtons[0]);

    await waitFor(() => {
      expect(kanbanApi.downloadContractDocx).toHaveBeenCalledWith(102);
    });
  });

  it('exports CSV file', async () => {
    window.URL.createObjectURL = vi.fn().mockReturnValue('blob:http://localhost/csv-url');
    window.URL.revokeObjectURL = vi.fn();

    render(<Archive />);

    await waitFor(() => {
      expect(screen.getByText('Экспорт CSV')).toBeInTheDocument();
    });

    const exportBtn = screen.getByText('Экспорт CSV');
    fireEvent.click(exportBtn);

    expect(window.URL.createObjectURL).toHaveBeenCalled();
  });
});
