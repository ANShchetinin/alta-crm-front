import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import DashboardLayout from './DashboardLayout';
import { useAuthStore } from '../store/useAuthStore';
import { useAppStore } from '../store/useAppStore';

const mockGetMyTenants = vi.fn();
const mockSwitchTenant = vi.fn();

vi.mock('../api/auth', () => ({
  getMyTenants: (...args: any[]) => mockGetMyTenants(...args),
  switchTenant: (...args: any[]) => mockSwitchTenant(...args),
}));

vi.mock('../api/notifications', () => ({
  notificationsApi: {
    getUnreadCount: vi.fn().mockResolvedValue(0),
    getNotifications: vi.fn().mockResolvedValue([]),
  }
}));

vi.mock('../api/settings', () => ({
  settingsApi: {
    getTenantSettings: vi.fn().mockResolvedValue({ name: 'Компания 1' }),
  }
}));

vi.mock('../api/features', () => ({
  featuresApi: {
    getSystemFeatures: vi.fn().mockResolvedValue({ OWNER_CREATE_COMPANY: true }),
    getTenantMatrix: vi.fn().mockResolvedValue({}),
  }
}));

describe('DashboardLayout Company Switcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      token: 'mock-token',
      role: 'OWNER',
      email: 'owner@test.com',
      userId: 1,
      tenantId: 1
    });
    useAppStore.setState({
      tenantSettings: { name: 'Компания 1', logoUrl: '', primaryColor: '#3b82f6' } as any
    });
  });

  it('renders company switcher and toggles dropdown with proper theme-compatible classes', async () => {
    mockGetMyTenants.mockResolvedValueOnce({
      currentTenantId: 1,
      maxCompaniesLimit: 5,
      currentCompaniesCount: 2,
      canCreateCompany: true,
      tenants: [
        { tenantId: 1, name: 'Компания 1', role: 'OWNER', primaryColor: '#3b82f6', isActive: true },
        { tenantId: 2, name: 'Компания 2', role: 'OWNER', primaryColor: '#10b981', isActive: true },
      ]
    });

    render(
      <BrowserRouter>
        <DashboardLayout />
      </BrowserRouter>
    );

    // Initial render
    expect(screen.getByText('Компания 1')).toBeDefined();

    await waitFor(() => {
      expect(mockGetMyTenants).toHaveBeenCalled();
    });

    // Click trigger to open dropdown
    const trigger = screen.getByText('Компания 1').closest('.company-switcher-trigger');
    expect(trigger).toBeDefined();
    if (trigger) {
      fireEvent.click(trigger);
    }

    // Dropdown should be open
    await waitFor(() => {
      expect(screen.getByText('Ваши компании')).toBeDefined();
      expect(screen.getByText('Компания 2')).toBeDefined();
      expect(screen.getByText('Создать компанию')).toBeDefined();
    });

    // Check CSS class on active company
    const activeItem = screen.getAllByText('Компания 1').find(el => el.closest('.company-dropdown-item'))?.closest('.company-dropdown-item');
    expect(activeItem?.className).toContain('active');

    // Click company 2 to switch
    mockSwitchTenant.mockResolvedValueOnce({ token: 'new-tenant-2-token' });
    const company2Item = screen.getByText('Компания 2').closest('.company-dropdown-item');
    if (company2Item) {
      fireEvent.click(company2Item);
    }

    await waitFor(() => {
      expect(mockSwitchTenant).toHaveBeenCalledWith(2);
    });
  });
});
