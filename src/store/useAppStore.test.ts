import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from './useAppStore';

describe('useAppStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useAppStore.setState({
      theme: 'dark',
      language: 'ru',
      newOrdersCount: 0,
      lowStockMaterials: [],
      tenantSettings: null
    });
  });

  it('sets theme and updates localStorage', () => {
    useAppStore.getState().setTheme('light');
    expect(useAppStore.getState().theme).toBe('light');
    expect(localStorage.getItem('altacrm_theme')).toBe('light');
  });

  it('sets language and updates localStorage', () => {
    useAppStore.getState().setLanguage('en');
    expect(useAppStore.getState().language).toBe('en');
    expect(localStorage.getItem('altacrm_lang')).toBe('en');
  });

  it('sets newOrdersCount', () => {
    useAppStore.getState().setNewOrdersCount(12);
    expect(useAppStore.getState().newOrdersCount).toBe(12);
  });

  it('updates tenantSettings locally', () => {
    useAppStore.setState({
      tenantSettings: {
        id: 1,
        name: 'Тестовая фирма',
        webhookToken: 'token-123',
        activeFeatures: ['FINANCES'],
        createdAt: '2026-01-01'
      }
    });

    useAppStore.getState().updateTenantSettingsLocally({ name: 'Обновленная фирма' });
    expect(useAppStore.getState().tenantSettings?.name).toBe('Обновленная фирма');
  });
});
