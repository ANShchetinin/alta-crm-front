import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { OrderRemindersSection } from './OrderRemindersSection';
import * as remindersApi from '../api/reminders';
import type { Employee } from '../api/employees';

vi.mock('../api/reminders', () => ({
  getOrderReminders: vi.fn(),
  createReminder: vi.fn(),
  updateReminder: vi.fn(),
  completeReminder: vi.fn(),
  deleteReminder: vi.fn()
}));

const mockEmployees: Employee[] = [
  { id: 1, userId: 10, name: 'Менеджер Анна', email: 'anna@test.ru' }
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
        createdAt: '2026-09-01T10:00:00Z'
      }
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
});
