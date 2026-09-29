import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { renderWithQuery } from '../test-utils/queryWrapper';
import DashboardLayout from './DashboardLayout';
import { getProfile } from '../api/settings';
import { getRecentNotifications, markNotificationAsRead } from '../api/notifications';
import { getOrdersCountByStatus, getOrderStatuses } from '../api/kanban';
import { getNewSiteRequestsCount } from '../api/siteRequests';
import { dismissAnnouncement, getActiveAnnouncements } from '../api/announcements';
import { useAppStore } from '../store/useAppStore';
import { useAuthStore } from '../store/useAuthStore';
import { useOrderDrawerStore } from '../store/useOrderDrawerStore';

vi.mock('../api/settings', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/settings')>()),
  getProfile: vi.fn()
}));
vi.mock('../api/auth', () => ({ getMyTenants: vi.fn().mockResolvedValue(null), switchTenant: vi.fn() }));
vi.mock('../api/notifications', () => ({
  getRecentNotifications: vi.fn(),
  markNotificationAsRead: vi.fn(),
  markAllNotificationsAsRead: vi.fn()
}));
vi.mock('../api/presence', () => ({ sendHeartbeat: vi.fn().mockResolvedValue({}) }));
vi.mock('../api/kanban', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/kanban')>()),
  getOrderStatuses: vi.fn(),
  getOrdersCountByStatus: vi.fn()
}));
vi.mock('../api/storage', () => ({ getLowStockMaterials: vi.fn().mockResolvedValue([]) }));
vi.mock('../api/siteRequests', () => ({ getNewSiteRequestsCount: vi.fn().mockResolvedValue(0) }));
vi.mock('../api/announcements', () => ({ getActiveAnnouncements: vi.fn(), dismissAnnouncement: vi.fn() }));
vi.mock('../features/kanban/components/OrderDrawer', () => ({ OrderDrawer: () => null }));
vi.mock('./PushNotificationSettings', () => ({ PushNotificationSettings: () => <div>Push settings</div> }));

const LocationProbe = () => {
  const location = useLocation();
  return <div data-testid="location">{location.pathname + location.search}</div>;
};

const renderLayout = (path = '/kanban') => renderWithQuery(
  <MemoryRouter initialEntries={[path]}>
    <Routes>
      <Route path="/" element={<DashboardLayout />}>
        <Route path="*" element={<LocationProbe />} />
      </Route>
    </Routes>
  </MemoryRouter>
);

const loginAs = (role: string) => {
  useAuthStore.setState({ token: 'token', role, tenantId: 1, canViewFinances: role === 'OWNER', canAccessMeasurements: role !== 'WORKER' });
};

const sidebar = () => document.querySelector('.sidebar-nav') as HTMLElement;
const bottomNav = () => document.querySelector('.mobile-bottom-nav') as HTMLElement;

describe('DashboardLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useOrderDrawerStore.getState().closeOrder();
    useAppStore.setState({
      newOrdersCount: 0,
      lowStockMaterials: [],
      tenantSettings: { name: 'Эколайн', activeFeatures: ['CALENDAR', 'FINANCES'] } as never
    });
    vi.mocked(getProfile).mockResolvedValue({ firstName: 'Анна', lastName: 'Смирнова', email: 'anna@test.ru' } as never);
    vi.mocked(getRecentNotifications).mockResolvedValue([]);
    vi.mocked(getOrderStatuses).mockResolvedValue([{ id: 1, name: 'Новые', color: '#000', sortOrder: 1, isCompleted: false }]);
    vi.mocked(getOrdersCountByStatus).mockResolvedValue(3);
    vi.mocked(getActiveAnnouncements).mockResolvedValue([]);
  });

  it('shows platform announcements under the top bar and hides one for good', async () => {
    loginAs('WORKER');
    const base = { message: 'С 22:00 до 23:00 сервис недоступен', showFrom: '2026-09-29T10:00:00Z', showUntil: null, createdAt: '', updatedAt: '' };
    vi.mocked(getActiveAnnouncements).mockResolvedValue([
      { ...base, id: 1, title: 'Работы сегодня', severity: 'CRITICAL', dismissible: false },
      { ...base, id: 2, title: 'Обновление', severity: 'WARNING', dismissible: true }
    ]);
    vi.mocked(dismissAnnouncement).mockResolvedValue();
    renderLayout();

    const banner = await screen.findByText('Работы сегодня');
    expect(banner.closest('.dashboard-announcements')?.previousElementSibling).toHaveClass('topbar');
    fireEvent.click(screen.getByRole('button', { name: 'Скрыть объявление' }));

    await waitFor(() => expect(screen.queryByText('Обновление')).not.toBeInTheDocument());
    expect(dismissAnnouncement).toHaveBeenCalledWith(2);
    expect(screen.getByText('Работы сегодня')).toBeInTheDocument();
  });

  it('brings the announcement back when hiding fails', async () => {
    loginAs('MANAGER');
    vi.mocked(getActiveAnnouncements).mockResolvedValue([{
      id: 2, title: 'Обновление', message: 'Текст', severity: 'INFO', dismissible: true,
      showFrom: '2026-09-29T10:00:00Z', showUntil: null, createdAt: '', updatedAt: ''
    }]);
    vi.mocked(dismissAnnouncement).mockRejectedValue(new Error('offline'));
    renderLayout();

    fireEvent.click(await screen.findByRole('button', { name: 'Скрыть объявление' }));

    await waitFor(() => expect(dismissAnnouncement).toHaveBeenCalledWith(2));
    expect(await screen.findByText('Обновление')).toBeInTheDocument();
  });

  it('shows the owner menu with the new orders counter and the page title', async () => {
    loginAs('OWNER');
    renderLayout('/clients');

    expect(within(sidebar()).getByText('Финансы')).toBeInTheDocument();
    expect(within(sidebar()).getByText('Журнал аудита')).toBeInTheDocument();
    expect(document.querySelector('.topbar-title-badge')).toHaveTextContent('Клиенты');
    await waitFor(() => expect(within(sidebar()).getByText('3')).toBeInTheDocument());
    expect(within(bottomNav()).getByText('3')).toBeInTheDocument();
    expect(await screen.findAllByText('Анна Смирнова')).not.toHaveLength(0);
  });

  it('shows a worker their own sections without company management', async () => {
    loginAs('WORKER');
    renderLayout();

    expect(within(sidebar()).getByText('Мой заработок')).toBeInTheDocument();
    expect(within(sidebar()).queryByText('Клиенты')).not.toBeInTheDocument();
    expect(within(sidebar()).queryByText('Финансы')).not.toBeInTheDocument();
    expect(within(bottomNav()).getByText('Заработок')).toBeInTheDocument();
    expect(within(bottomNav()).getByText('Меню')).toBeInTheDocument();
  });

  it('shows the platform admin companies, flags and announcements, without the new order button', () => {
    loginAs('SUPERADMIN');
    renderLayout('/tenants');

    expect(within(sidebar()).getAllByRole('link').map(link => link.textContent)).toEqual(['Компании', 'Feature Flags', 'Объявления']);
    expect(screen.queryByTitle('Создать новый заказ')).not.toBeInTheDocument();
    expect(getProfile).not.toHaveBeenCalled();
  });

  it('opens the order from the link and removes the parameter from the address', async () => {
    loginAs('MANAGER');
    renderLayout('/kanban?orderId=42&tab=x');

    await waitFor(() => expect(useOrderDrawerStore.getState().orderId).toBe(42));
    expect(useOrderDrawerStore.getState().isOpen).toBe(true);
    expect(screen.getByTestId('location')).toHaveTextContent('/kanban?tab=x');
  });

  it('opens the order and the new order form on window events', () => {
    loginAs('MANAGER');
    renderLayout();

    window.dispatchEvent(new CustomEvent('alta:open-order', { detail: { orderId: 7 } }));
    expect(useOrderDrawerStore.getState().orderId).toBe(7);

    window.dispatchEvent(new CustomEvent('alta:open-create-order'));
    expect(useOrderDrawerStore.getState()).toMatchObject({ isOpen: true, orderId: null });
  });

  it('marks a notification as read and opens its order', async () => {
    loginAs('MANAGER');
    vi.mocked(getRecentNotifications).mockResolvedValue([
      { id: 5, title: 'Новый комментарий', body: 'Проверьте замер', url: '/kanban', orderId: 12, isRead: false, createdAt: new Date().toISOString() }
    ]);
    vi.mocked(markNotificationAsRead).mockResolvedValue(undefined as never);
    renderLayout();

    await waitFor(() => expect(document.querySelector('.notification-badge')).toBeInTheDocument());
    fireEvent.click(screen.getByTitle('Уведомления'));
    fireEvent.click(screen.getByText('Новый комментарий'));

    await waitFor(() => expect(useOrderDrawerStore.getState().orderId).toBe(12));
    expect(markNotificationAsRead).toHaveBeenCalledWith(5);
    expect(screen.queryByText('Уведомления за 24 ч')).not.toBeInTheDocument();
  });

  it('opens the profile window from the avatar', async () => {
    loginAs('OWNER');
    renderLayout();

    await screen.findAllByText('Анна Смирнова');
    fireEvent.click(screen.getByTitle('Мой профиль и настройка уведомлений'));

    expect(screen.getByText('Push settings')).toBeInTheDocument();
    expect(screen.getByText(/anna@test\.ru/)).toBeInTheDocument();
  });

  it('asks for new site requests once on start and not at all when the module is off', async () => {
    loginAs('OWNER');
    useAppStore.setState({ tenantSettings: { name: 'Эколайн', activeFeatures: ['SITE_REQUESTS'] } as never });
    const { unmount } = renderLayout();
    await waitFor(() => expect(getNewSiteRequestsCount).toHaveBeenCalledTimes(1));
    unmount();

    vi.mocked(getNewSiteRequestsCount).mockClear();
    useAppStore.setState({ tenantSettings: { name: 'Эколайн', activeFeatures: [] } as never });
    renderLayout();
    await waitFor(() => expect(getOrdersCountByStatus).toHaveBeenCalled());
    expect(getNewSiteRequestsCount).not.toHaveBeenCalled();
  });

  it('shows the initial instead of the previous photo when the profile has none', async () => {
    loginAs('OWNER');
    vi.mocked(getProfile).mockResolvedValueOnce({ firstName: 'Анна', avatarUrl: '/a.png' } as never);
    renderLayout();
    expect(await screen.findByAltText('Анна')).toBeInTheDocument();

    // Профиль перечитывается при смене роли (как после перехода в другую компанию)
    vi.mocked(getProfile).mockResolvedValueOnce({ firstName: 'Анна' } as never);
    act(() => useAuthStore.setState({ role: 'MANAGER' }));

    await waitFor(() => expect(screen.queryByAltText('Анна')).not.toBeInTheDocument());
    expect(document.querySelector('.avatar')).toHaveTextContent('А');
  });

  it('remembers the collapsed sidebar', () => {
    loginAs('OWNER');
    renderLayout();

    fireEvent.click(screen.getByTitle('Свернуть меню'));

    expect(document.querySelector('.sidebar')).toHaveClass('sidebar-collapsed');
    expect(localStorage.getItem('altacrm_sidebar_collapsed')).toBe('true');
  });
});
