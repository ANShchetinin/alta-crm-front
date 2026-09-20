import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OrderCommentsSection } from './OrderCommentsSection';
import * as kanbanApi from '../../../api/kanban';
import { useAuthStore } from '../../../store/useAuthStore';

vi.mock('../../../api/kanban', async () => {
  const actual = await vi.importActual('../../../api/kanban');
  return {
    ...actual,
    getOrderComments: vi.fn(),
    addOrderComment: vi.fn(),
    updateOrderComment: vi.fn(),
    deleteOrderComment: vi.fn()
  };
});

describe('OrderCommentsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      role: 'OWNER',
      userId: 1,
      email: 'admin@test.com'
    });
  });

  it('renders collapsed by default with comments count in header, expands on header click', async () => {
    const mockComments = [
      {
        id: 1,
        orderId: 100,
        authorId: 1,
        authorName: 'Иван Иванов',
        text: 'Первый тестовый комментарий',
        createdAt: '2026-09-19T10:00:00'
      }
    ];

    vi.mocked(kanbanApi.getOrderComments).mockResolvedValue(mockComments);
    const onCommentsCountChange = vi.fn();

    render(
      <OrderCommentsSection
        orderId={100}
        onCommentsCountChange={onCommentsCountChange}
      />
    );

    // Header has title
    expect(screen.getByText('Комментарии к заказу')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(onCommentsCountChange).toHaveBeenCalledWith(1);
    });

    // Content is collapsed by default
    expect(screen.queryByText('Первый тестовый комментарий')).not.toBeInTheDocument();

    // Click header to expand
    fireEvent.click(screen.getByText('Комментарии к заказу'));

    // Now comment content is visible
    expect(screen.getByText('Первый тестовый комментарий')).toBeInTheDocument();
    expect(screen.getByText('Иван Иванов')).toBeInTheDocument();
  });

  it('allows adding a new comment without triggering outer form submit and updates count', async () => {
    vi.mocked(kanbanApi.getOrderComments).mockResolvedValue([]);
    vi.mocked(kanbanApi.addOrderComment).mockResolvedValue({
      id: 2,
      orderId: 100,
      authorId: 1,
      authorName: 'Иван Иванов',
      text: 'Второй комментарий',
      createdAt: '2026-09-19T10:05:00'
    });

    const onCommentsCountChange = vi.fn();

    render(
      <OrderCommentsSection
        orderId={100}
        defaultExpanded={true}
        onCommentsCountChange={onCommentsCountChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Комментариев пока нет/i)).toBeInTheDocument();
    });

    const textarea = screen.getByPlaceholderText(/Написать комментарий к заказу/i);
    fireEvent.change(textarea, { target: { value: 'Второй комментарий' } });

    const sendBtn = screen.getByRole('button', { name: /Отправить/i });
    expect(sendBtn).toHaveAttribute('type', 'button');

    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(kanbanApi.addOrderComment).toHaveBeenCalledWith(100, 'Второй комментарий');
      expect(screen.getByText('Второй комментарий')).toBeInTheDocument();
      expect(onCommentsCountChange).toHaveBeenCalledWith(1);
    });
  });

  it('only allows the author to delete their comment, hiding delete button for others', async () => {
    useAuthStore.setState({
      role: 'ADMIN',
      userId: 5,
      email: 'admin@test.com'
    });

    const mockComments = [
      {
        id: 10,
        orderId: 100,
        authorUserId: 5,
        authorName: 'Мой Комментарий',
        text: 'Этот комментарий написал я',
        createdAt: '2026-09-19T10:00:00'
      },
      {
        id: 11,
        orderId: 100,
        authorUserId: 99,
        authorName: 'Другой Пользователь',
        text: 'Этот комментарий написал другой',
        createdAt: '2026-09-19T10:01:00'
      }
    ];

    vi.mocked(kanbanApi.getOrderComments).mockResolvedValue(mockComments);

    render(
      <OrderCommentsSection
        orderId={100}
        defaultExpanded={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Этот комментарий написал я')).toBeInTheDocument();
      expect(screen.getByText('Этот комментарий написал другой')).toBeInTheDocument();
    });

    // Should only have 1 delete button for comment #10, not for #11
    const deleteButtons = screen.getAllByTitle('Удалить комментарий');
    expect(deleteButtons).toHaveLength(1);
  });

  it('displays "Пользователь удален" when authorDeleted is true and hides delete and edit buttons', async () => {
    useAuthStore.setState({
      role: 'ADMIN',
      userId: 1,
      email: 'admin@test.com'
    });

    const mockComments = [
      {
        id: 20,
        orderId: 100,
        authorUserId: 1,
        authorDeleted: true,
        authorName: 'Пользователь удален',
        text: 'Комментарий удаленного автора',
        createdAt: '2026-09-19T10:00:00'
      }
    ];

    vi.mocked(kanbanApi.getOrderComments).mockResolvedValue(mockComments);

    render(
      <OrderCommentsSection
        orderId={100}
        defaultExpanded={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Пользователь удален')).toBeInTheDocument();
      expect(screen.getByText('Комментарий удаленного автора')).toBeInTheDocument();
    });

    expect(screen.queryByTitle('Удалить комментарий')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Редактировать комментарий')).not.toBeInTheDocument();
  });

  it('allows author to edit their comment and saves updated text', async () => {
    useAuthStore.setState({
      role: 'ADMIN',
      userId: 5,
      email: 'admin@test.com'
    });

    const originalComment = {
      id: 30,
      orderId: 100,
      authorUserId: 5,
      authorName: 'Автор Комментария',
      text: 'Исходный текст комментария',
      createdAt: '2026-09-19T10:00:00'
    };

    const updatedComment = {
      ...originalComment,
      text: 'Отредактированный текст комментария',
      updatedAt: '2026-09-19T10:15:00'
    };

    vi.mocked(kanbanApi.getOrderComments).mockResolvedValue([originalComment]);
    vi.mocked(kanbanApi.updateOrderComment).mockResolvedValue(updatedComment);

    render(
      <OrderCommentsSection
        orderId={100}
        defaultExpanded={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Исходный текст комментария')).toBeInTheDocument();
    });

    const editBtn = screen.getByTitle('Редактировать комментарий');
    fireEvent.click(editBtn);

    // Edit textarea should be visible with current text
    const editTextarea = screen.getByDisplayValue('Исходный текст комментария');
    expect(editTextarea).toBeInTheDocument();

    // Change text
    fireEvent.change(editTextarea, { target: { value: 'Отредактированный текст комментария' } });

    // Click save button
    const saveBtn = screen.getByRole('button', { name: /Сохранить/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(kanbanApi.updateOrderComment).toHaveBeenCalledWith(100, 30, 'Отредактированный текст комментария');
      expect(screen.getByText('Отредактированный текст комментария')).toBeInTheDocument();
      expect(screen.getByText('(изменено)')).toBeInTheDocument();
    });
  });

  it('allows author to cancel editing without changes', async () => {
    useAuthStore.setState({
      role: 'ADMIN',
      userId: 5,
      email: 'admin@test.com'
    });

    const originalComment = {
      id: 31,
      orderId: 100,
      authorUserId: 5,
      authorName: 'Автор Комментария',
      text: 'Неизменный комментарий',
      createdAt: '2026-09-19T10:00:00'
    };

    vi.mocked(kanbanApi.getOrderComments).mockResolvedValue([originalComment]);

    render(
      <OrderCommentsSection
        orderId={100}
        defaultExpanded={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Неизменный комментарий')).toBeInTheDocument();
    });

    const editBtn = screen.getByTitle('Редактировать комментарий');
    fireEvent.click(editBtn);

    const editTextarea = screen.getByDisplayValue('Неизменный комментарий');
    fireEvent.change(editTextarea, { target: { value: 'Новый несохраненный текст' } });

    const cancelBtn = screen.getByRole('button', { name: /Отмена/i });
    fireEvent.click(cancelBtn);

    // Should revert back to original text view, not calling updateOrderComment
    expect(kanbanApi.updateOrderComment).not.toHaveBeenCalled();
    expect(screen.getByText('Неизменный комментарий')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('Новый несохраненный текст')).not.toBeInTheDocument();
  });

  it('hides edit button for comments written by other users', async () => {
    useAuthStore.setState({
      role: 'ADMIN',
      userId: 5,
      email: 'admin@test.com'
    });

    const mockComments = [
      {
        id: 40,
        orderId: 100,
        authorUserId: 999,
        authorName: 'Чужой Автор',
        text: 'Чужой комментарий',
        createdAt: '2026-09-19T10:00:00'
      }
    ];

    vi.mocked(kanbanApi.getOrderComments).mockResolvedValue(mockComments);

    render(
      <OrderCommentsSection
        orderId={100}
        defaultExpanded={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Чужой комментарий')).toBeInTheDocument();
    });

    expect(screen.queryByTitle('Редактировать комментарий')).not.toBeInTheDocument();
  });

  it('hides edit and delete buttons when current user userId matches authorId but differs from authorUserId (no cross-table ID collision)', async () => {
    useAuthStore.setState({
      role: 'OWNER',
      userId: 1,
      email: 'owner@test.com'
    });

    const mockComments = [
      {
        id: 50,
        orderId: 100,
        authorId: 1, // Employee ID = 1 (matches Owner's userId)
        authorUserId: 2, // User ID = 2 (Manager created this comment)
        authorName: 'Менеджер',
        text: 'Комментарий созданный менеджером',
        createdAt: '2026-09-19T10:00:00'
      }
    ];

    vi.mocked(kanbanApi.getOrderComments).mockResolvedValue(mockComments);

    render(
      <OrderCommentsSection
        orderId={100}
        defaultExpanded={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Комментарий созданный менеджером')).toBeInTheDocument();
    });

    // Neither edit nor delete should be shown for the Owner on Manager's comment
    expect(screen.queryByTitle('Редактировать комментарий')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Удалить комментарий')).not.toBeInTheDocument();
  });
});

