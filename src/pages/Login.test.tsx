import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { renderWithQuery } from '../test-utils/queryWrapper';
import Login from './Login';
import { getPublicAnnouncements } from '../api/announcements';

vi.mock('../api/announcements', () => ({ getPublicAnnouncements: vi.fn() }));

const renderLogin = () => renderWithQuery(
  <MemoryRouter>
    <Login />
  </MemoryRouter>
);

describe('Login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows platform announcements above the form without a hide button', async () => {
    vi.mocked(getPublicAnnouncements).mockResolvedValue([{
      id: 1,
      title: 'Плановое обновление',
      message: 'Сегодня с 22:00 до 23:00 вход может быть недоступен',
      severity: 'CRITICAL',
      showFrom: '2026-09-29T10:00:00Z',
      showUntil: null,
      dismissible: false,
      createdAt: '',
      updatedAt: ''
    }]);
    renderLogin();

    const title = await screen.findByText('Плановое обновление');
    expect(title.closest('.login-column')?.querySelector('.login-card')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Скрыть объявление' })).not.toBeInTheDocument();
  });

  it('shows just the form when the announcements are unavailable', async () => {
    vi.mocked(getPublicAnnouncements).mockRejectedValue(new Error('Service unavailable'));
    renderLogin();

    expect(await screen.findByRole('button', { name: /login\.button|Войти/ })).toBeInTheDocument();
    expect(document.querySelector('.announcements')).not.toBeInTheDocument();
  });
});
