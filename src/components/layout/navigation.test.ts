import { describe, expect, it } from 'vitest';
import { getBottomNav, getRouteTitle, getSidebarItems, type NavAccess } from './navigation';

const ALL_FEATURES: NavAccess['features'] = {
  storage: true,
  calendar: true,
  measurements: true,
  finances: true,
  reports: true,
  contractTemplates: true,
  siteAnalytics: true,
  siteRequests: true,
  aiAssistant: true
};

const NO_FEATURES: NavAccess['features'] = {
  storage: false,
  calendar: false,
  measurements: false,
  finances: false,
  reports: false,
  contractTemplates: false,
  siteAnalytics: false,
  siteRequests: false,
  aiAssistant: false
};

const access = (overrides: Partial<NavAccess>): NavAccess => ({
  role: 'OWNER',
  canViewFinances: true,
  canAccessMeasurements: true,
  features: ALL_FEATURES,
  ...overrides
});

const paths = (items: { to: string }[]) => items.map(item => item.to);

describe('getSidebarItems', () => {
  it('shows the owner every enabled section, with company settings and audit last', () => {
    expect(paths(getSidebarItems(access({})))).toEqual([
      '/kanban', '/ai-assistant', '/site-requests', '/calendar', '/measurements', '/clients', '/employees',
      '/storage', '/archive', '/finances', '/reports', '/site-analytics', '/contract-templates', '/settings', '/audit-logs'
    ]);
  });

  it('hides owner-only sections and finances from a manager without the finances permission', () => {
    const items = paths(getSidebarItems(access({ role: 'MANAGER', canViewFinances: false })));
    expect(items).not.toContain('/finances');
    expect(items).not.toContain('/settings');
    expect(items).not.toContain('/audit-logs');
    expect(items).not.toContain('/contract-templates');
    expect(items).toContain('/clients');
  });

  it('shows finances to a manager with the permission only when the module is on', () => {
    expect(paths(getSidebarItems(access({ role: 'MANAGER', canViewFinances: true })))).toContain('/finances');
    const withoutModule = access({ role: 'MANAGER', features: { ...ALL_FEATURES, finances: false } });
    expect(paths(getSidebarItems(withoutModule))).not.toContain('/finances');
  });

  it('leaves only core sections when no modules are enabled', () => {
    expect(paths(getSidebarItems(access({ features: NO_FEATURES })))).toEqual([
      '/kanban', '/clients', '/employees', '/archive', '/settings', '/audit-logs'
    ]);
  });

  it('shows a worker their orders, schedule, earnings and archive; measurements only with the permission', () => {
    expect(paths(getSidebarItems(access({ role: 'WORKER' })))).toEqual([
      '/kanban', '/calendar', '/measurements', '/earnings', '/archive'
    ]);
    expect(paths(getSidebarItems(access({ role: 'WORKER', canAccessMeasurements: false })))).toEqual([
      '/kanban', '/calendar', '/earnings', '/archive'
    ]);
  });

  it('shows the platform admin companies, feature flags and announcements', () => {
    expect(paths(getSidebarItems(access({ role: 'SUPERADMIN' })))).toEqual(['/tenants', '/feature-flags', '/announcements']);
  });

  it('marks the orders and site requests items with counters and the AI assistant as beta', () => {
    const items = getSidebarItems(access({}));
    expect(items.find(i => i.to === '/kanban')?.badge).toBe('newOrders');
    expect(items.find(i => i.to === '/site-requests')?.badge).toBe('newSiteRequests');
    expect(items.find(i => i.to === '/ai-assistant')?.badge).toBe('beta');
  });
});

describe('getBottomNav', () => {
  it('gives staff orders, clients, finances and calendar', () => {
    const nav = getBottomNav(access({}));
    expect(paths(nav.items)).toEqual(['/kanban', '/clients', '/finances', '/calendar']);
    expect(nav.menuLabelKey).toBe('nav.more');
  });

  it('falls back to storage without finances and to reports without the calendar', () => {
    const nav = getBottomNav(access({ role: 'MANAGER', canViewFinances: false, features: { ...ALL_FEATURES, calendar: false } }));
    expect(paths(nav.items)).toEqual(['/kanban', '/clients', '/storage', '/reports']);
  });

  it('drops the optional slots when their modules are off', () => {
    expect(paths(getBottomNav(access({ features: NO_FEATURES })).items)).toEqual(['/kanban', '/clients']);
  });

  it('gives a worker measurements when allowed, otherwise the calendar', () => {
    expect(paths(getBottomNav(access({ role: 'WORKER' })).items)).toEqual(['/kanban', '/measurements', '/earnings', '/archive']);
    expect(paths(getBottomNav(access({ role: 'WORKER', canAccessMeasurements: false })).items))
      .toEqual(['/kanban', '/calendar', '/earnings', '/archive']);
  });

  it('gives the platform admin companies, flags and announcements', () => {
    const nav = getBottomNav(access({ role: 'SUPERADMIN' }));
    expect(paths(nav.items)).toEqual(['/tenants', '/feature-flags', '/announcements']);
    expect(nav.items[1].label).toBe('Flags');
    expect(nav.menuLabel).toBe('Меню');
  });
});

describe('getRouteTitle', () => {
  it('finds the section by path prefix, including nested pages', () => {
    expect(getRouteTitle('/kanban').labelKey).toBe('nav.orders');
    expect(getRouteTitle('/clients/42').labelKey).toBe('nav.clients');
    expect(getRouteTitle('/site-analytics').labelKey).toBe('nav.siteAnalytics');
    expect(getRouteTitle('/audit-logs').label).toBe('Журнал аудита');
  });

  it('falls back to the app name for unknown pages', () => {
    expect(getRouteTitle('/unknown').label).toBe('Alta CRM');
  });
});
