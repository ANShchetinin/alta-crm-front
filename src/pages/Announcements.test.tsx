import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { renderWithQuery } from '../test-utils/queryWrapper';
import { Announcements } from './Announcements';
import { announcementsAdminApi, type SystemAnnouncement } from '../api/announcements';
import { confirm } from '../utils/confirm';

vi.mock('../api/announcements', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/announcements')>()),
  announcementsAdminApi: { getAll: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() },
  getActiveAnnouncements: vi.fn().mockResolvedValue([])
}));
vi.mock('../utils/confirm', () => ({ confirm: vi.fn() }));
vi.mock('../utils/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() }
}));

const scheduled: SystemAnnouncement = {
  id: 1,
  title: 'Плановое обновление',
  message: 'Сервис может быть недоступен',
  severity: 'WARNING',
  showFrom: '2099-01-01T19:00:00Z',
  showUntil: '2099-01-01T20:00:00Z',
  dismissible: true,
  createdAt: '2026-09-29T10:00:00Z',
  updatedAt: '2026-09-29T10:00:00Z'
};

const finished: SystemAnnouncement = {
  ...scheduled,
  id: 2,
  title: 'Прошлые работы',
  severity: 'CRITICAL',
  dismissible: false,
  showFrom: '2020-01-01T19:00:00Z',
  showUntil: '2020-01-01T20:00:00Z'
};

describe('Announcements page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(announcementsAdminApi.getAll).mockResolvedValue([scheduled, finished]);
  });

  it('lists announcements with severity, status and period', async () => {
    renderWithQuery(<Announcements />);

    const card = (await screen.findByText('Плановое обновление')).closest('li') as HTMLElement;
    expect(within(card).getByText('Предупреждение')).toBeInTheDocument();
    expect(within(card).getByText('Запланировано')).toBeInTheDocument();
    expect(within(card).getByText(/^с .* по /)).toBeInTheDocument();
    const past = screen.getByText('Прошлые работы').closest('li') as HTMLElement;
    expect(within(past).getByText('Завершено')).toBeInTheDocument();
    expect(past).toHaveClass('is-finished');
  });

  it('shows a hint when there are no announcements', async () => {
    vi.mocked(announcementsAdminApi.getAll).mockResolvedValue([]);
    renderWithQuery(<Announcements />);

    expect(await screen.findByText('Объявлений пока нет')).toBeInTheDocument();
  });

  it('publishes a new announcement with a preview and validation', async () => {
    vi.mocked(announcementsAdminApi.create).mockResolvedValue(scheduled);
    renderWithQuery(<Announcements />);
    await screen.findByText('Плановое обновление');

    fireEvent.click(screen.getAllByRole('button', { name: /Новое объявление/ })[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Опубликовать' }));
    expect(await screen.findByText('Укажите заголовок')).toHaveClass('announcement-form__error');
    expect(announcementsAdminApi.create).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Заголовок'), { target: { value: 'Обновление сегодня' } });
    fireEvent.change(screen.getByLabelText('Текст'), { target: { value: 'С 22:00 до 23:00' } });
    fireEvent.click(screen.getByRole('radio', { name: 'Критично' }));
    fireEvent.change(screen.getByLabelText('Показывать по'), { target: { value: '2099-01-01T23:00' } });

    const preview = screen.getByText('Так увидят пользователи').parentElement as HTMLElement;
    expect(within(preview).getByText('Обновление сегодня').closest('.announcement')).toHaveClass('announcement--critical');
    expect(within(preview).queryByRole('button', { name: 'Скрыть объявление' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Опубликовать' }));

    await waitFor(() => expect(announcementsAdminApi.create).toHaveBeenCalledWith({
      title: 'Обновление сегодня',
      message: 'С 22:00 до 23:00',
      severity: 'CRITICAL',
      showFrom: null,
      showUntil: new Date(2099, 0, 1, 23, 0).toISOString()
    }));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Опубликовать' })).not.toBeInTheDocument());
  });

  it('edits an announcement with its current values', async () => {
    vi.mocked(announcementsAdminApi.update).mockResolvedValue(scheduled);
    renderWithQuery(<Announcements />);
    const card = (await screen.findByText('Плановое обновление')).closest('li') as HTMLElement;

    fireEvent.click(within(card).getByRole('button', { name: 'Изменить' }));
    expect(screen.getByLabelText('Заголовок')).toHaveValue('Плановое обновление');
    expect(screen.getByRole('radio', { name: 'Предупреждение' })).toBeChecked();
    fireEvent.change(screen.getByLabelText('Заголовок'), { target: { value: 'Обновление перенесено' } });
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));

    await waitFor(() => expect(announcementsAdminApi.update).toHaveBeenCalledWith(1, expect.objectContaining({
      title: 'Обновление перенесено',
      showFrom: scheduled.showFrom.replace('Z', '.000Z'),
      showUntil: scheduled.showUntil?.replace('Z', '.000Z')
    })));
  });

  it('deletes after confirmation only', async () => {
    vi.mocked(confirm).mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    vi.mocked(announcementsAdminApi.remove).mockResolvedValue();
    renderWithQuery(<Announcements />);
    const card = (await screen.findByText('Плановое обновление')).closest('li') as HTMLElement;

    fireEvent.click(within(card).getByRole('button', { name: 'Удалить' }));
    await waitFor(() => expect(confirm).toHaveBeenCalledTimes(1));
    expect(announcementsAdminApi.remove).not.toHaveBeenCalled();

    fireEvent.click(within(card).getByRole('button', { name: 'Удалить' }));
    await waitFor(() => expect(announcementsAdminApi.remove).toHaveBeenCalledWith(1));
  });
});
