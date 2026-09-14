import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { OrderRemindersSection } from './OrderRemindersSection';
import * as remindersApi from '../api/reminders';
import type { Employee } from '../api/employees';

vi.mock('../api/reminders', () => ({
  getOrderReminders: vi.fn(),
  createReminder: vi.fn(),
  updateReminder: vi.fn(),
  completeReminder: vi.fn(),
  deleteReminder: vi.fn(),
}));

vi.mock('../utils/toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('../utils/confirm', () => ({
  confirm: vi.fn().mockResolvedValue(true),
}));

const mockEmployees: Employee[] = [
  { id: 1, userId: 10, name: 'Менеджер Анна', email: 'anna@test.ru' },
  { id: 2, userId: 12, name: 'Менеджер Иван', email: 'ivan@test.ru' },
];

describe('OrderRemindersSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders reminders section and loads existing reminders', async () => {
    const mockReminders = [
      {
        id: 1,
        orderId: 100,
        userId: 10,
        userName: 'Менеджер Анна',
        remindAt: new Date(Date.now() + 86400000).toISOString(),
        comment: 'Перезвонить клиенту по смете',
        status: 'PENDING',
        isCompleted: false,
        createdAt: '2026-09-01T10:00:00Z',
      },
    ];

    vi.mocked(remindersApi.getOrderReminders).mockResolvedValue(mockReminders as any);

    render(
      <OrderRemindersSection
        orderId={100}
        employees={mockEmployees}
        currentUserId={10}
      />
    );

    expect(screen.getByText(/Следующий контакт и напоминания/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Перезвонить клиенту по смете')).toBeInTheDocument();
    });
  });

  it('opens create modal with expandable comment textarea and Cancel/Save buttons', async () => {
    vi.mocked(remindersApi.getOrderReminders).mockResolvedValue([]);
    vi.mocked(remindersApi.createReminder).mockResolvedValue({ id: 99 } as any);

    render(
      <OrderRemindersSection
        orderId={100}
        employees={mockEmployees}
        currentUserId={10}
      />
    );

    const addBtn = screen.getByText('Добавить напоминание');
    fireEvent.click(addBtn);

    expect(screen.getByText('Новое напоминание')).toBeInTheDocument();
    expect(screen.getByText('Отмена')).toBeInTheDocument();
    expect(screen.getByText('Сохранить')).toBeInTheDocument();

    const textarea = screen.getByPlaceholderText(/Комментарий или цель звонка/i);
    expect(textarea).toBeInTheDocument();
    expect(textarea.tagName.toLowerCase()).toBe('textarea');

    // Quick goal preset click
    const quickGoal = screen.getByText('Уточнить решение по смете');
    fireEvent.click(quickGoal);
    expect(textarea).toHaveValue('Уточнить решение по смете');

    // Type custom text
    fireEvent.change(textarea, {
      target: { value: 'Длинный комментарий для клиента, который полностью виден в расширяемом поле ввода' },
    });

    const saveBtn = screen.getByText('Сохранить');
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(remindersApi.createReminder).toHaveBeenCalledWith(
        100,
        expect.objectContaining({
          comment: 'Длинный комментарий для клиента, который полностью виден в расширяемом поле ввода',
        })
      );
    });
  });

  it('opens edit modal and saves changes via Save button', async () => {
    const mockReminders = [
      {
        id: 5,
        orderId: 100,
        userId: 10,
        userName: 'Менеджер Анна',
        remindAt: new Date(Date.now() + 3600000).toISOString(),
        comment: 'Первоначальный комментарий',
        status: 'PENDING',
        isCompleted: false,
        createdAt: '2026-09-01T10:00:00Z',
      },
    ];

    vi.mocked(remindersApi.getOrderReminders).mockResolvedValue(mockReminders as any);
    vi.mocked(remindersApi.updateReminder).mockResolvedValue({ id: 5 } as any);

    render(
      <OrderRemindersSection
        orderId={100}
        employees={mockEmployees}
        currentUserId={10}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Первоначальный комментарий')).toBeInTheDocument();
    });

    const editBtn = screen.getByTitle('Редактировать напоминание');
    fireEvent.click(editBtn);

    expect(screen.getByText('Редактировать напоминание')).toBeInTheDocument();
    const textarea = screen.getByPlaceholderText(/Комментарий или цель звонка/i);
    expect(textarea).toHaveValue('Первоначальный комментарий');

    fireEvent.change(textarea, { target: { value: 'Обновленный расширенный комментарий' } });

    const saveBtn = screen.getByText('Сохранить');
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(remindersApi.updateReminder).toHaveBeenCalledWith(
        5,
        expect.objectContaining({
          comment: 'Обновленный расширенный комментарий',
        })
      );
    });
  });
});
