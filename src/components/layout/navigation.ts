import {
  Archive, Box, Building2, CalendarDays, FileText, Globe, LayoutDashboard, PieChart, Ruler, Settings, ShieldCheck,
  Sliders, Sparkles, TrendingUp, UserCircle, Users, Wallet, type LucideIcon
} from 'lucide-react';
import type { TFunction } from 'i18next';

export type NavBadge = 'newOrders' | 'newSiteRequests' | 'beta';

/** Раздел приложения: путь, подпись (ключ перевода и текст по умолчанию) и иконка. */
export interface NavItem {
  to: string;
  icon: LucideIcon;
  label: string;
  labelKey?: string;
  badge?: NavBadge;
}

/** Что доступно пользователю: роль, личные права и включенные для компании модули. */
export interface NavAccess {
  role: string | null;
  canViewFinances: boolean;
  canAccessMeasurements: boolean;
  features: {
    storage: boolean;
    calendar: boolean;
    measurements: boolean;
    finances: boolean;
    reports: boolean;
    contractTemplates: boolean;
    siteAnalytics: boolean;
    siteRequests: boolean;
    aiAssistant: boolean;
  };
}

const ROUTES = {
  kanban: { to: '/kanban', icon: LayoutDashboard, labelKey: 'nav.orders', label: 'Заказы' },
  aiAssistant: { to: '/ai-assistant', icon: Sparkles, labelKey: 'nav.aiAssistant', label: 'ИИ-Ассистент' },
  siteRequests: { to: '/site-requests', icon: Globe, labelKey: 'nav.siteRequests', label: 'Заявки с сайта' },
  calendar: { to: '/calendar', icon: CalendarDays, labelKey: 'nav.calendar', label: 'Календарь' },
  measurements: { to: '/measurements', icon: Ruler, label: 'Замеры' },
  earnings: { to: '/earnings', icon: Wallet, label: 'Мой заработок' },
  clients: { to: '/clients', icon: Users, labelKey: 'nav.clients', label: 'Клиенты' },
  employees: { to: '/employees', icon: UserCircle, labelKey: 'nav.employees', label: 'Сотрудники' },
  storage: { to: '/storage', icon: Box, labelKey: 'nav.storage', label: 'Склад' },
  archive: { to: '/archive', icon: Archive, labelKey: 'nav.archive', label: 'Архив' },
  finances: { to: '/finances', icon: Wallet, labelKey: 'nav.finances', label: 'Финансы' },
  reports: { to: '/reports', icon: PieChart, labelKey: 'nav.reports', label: 'Отчеты' },
  siteAnalytics: { to: '/site-analytics', icon: TrendingUp, labelKey: 'nav.siteAnalytics', label: 'Аналитика сайта' },
  contractTemplates: { to: '/contract-templates', icon: FileText, label: 'Шаблоны договоров' },
  settings: { to: '/settings', icon: Settings, labelKey: 'nav.settings', label: 'Настройки' },
  auditLogs: { to: '/audit-logs', icon: ShieldCheck, label: 'Журнал аудита' },
  tenants: { to: '/tenants', icon: Building2, label: 'Компании' },
  featureFlags: { to: '/feature-flags', icon: Sliders, label: 'Feature Flags' }
} satisfies Record<string, NavItem>;

const DEFAULT_TITLE: NavItem = { to: '/', icon: LayoutDashboard, label: 'Alta CRM' };

const when = (condition: boolean, item: NavItem): NavItem[] => (condition ? [item] : []);

const canOpenFinances = ({ role, canViewFinances, features }: NavAccess) =>
  features.finances && (role === 'OWNER' || (role === 'MANAGER' && canViewFinances));

const canOpenMeasurements = ({ canAccessMeasurements, features }: NavAccess) =>
  features.measurements && canAccessMeasurements;

/** Подпись раздела на языке интерфейса (текст по умолчанию, если перевода нет). */
export const getNavLabel = (item: NavItem, t: TFunction): string =>
  item.labelKey ? t(item.labelKey, item.label) : item.label;

/** Раздел, к которому относится адрес страницы: для заголовка в верхней панели. */
export const getRouteTitle = (pathname: string): NavItem =>
  Object.values(ROUTES).find(route => pathname.startsWith(route.to)) ?? DEFAULT_TITLE;

/** Пункты бокового меню для роли и включенных модулей. */
export const getSidebarItems = (access: NavAccess): NavItem[] => {
  const { role, features } = access;
  if (role === 'SUPERADMIN') {
    return [ROUTES.tenants, ROUTES.featureFlags];
  }
  if (role === 'WORKER') {
    return [
      ROUTES.kanban,
      ...when(features.calendar, ROUTES.calendar),
      ...when(canOpenMeasurements(access), ROUTES.measurements),
      ROUTES.earnings,
      ROUTES.archive
    ];
  }
  return [
    { ...ROUTES.kanban, badge: 'newOrders' },
    ...when(features.aiAssistant, { ...ROUTES.aiAssistant, badge: 'beta' }),
    ...when(features.siteRequests, { ...ROUTES.siteRequests, badge: 'newSiteRequests' }),
    ...when(features.calendar, ROUTES.calendar),
    ...when(features.measurements, ROUTES.measurements),
    ROUTES.clients,
    ROUTES.employees,
    ...when(features.storage, ROUTES.storage),
    ROUTES.archive,
    ...when(canOpenFinances(access), ROUTES.finances),
    ...when(features.reports, ROUTES.reports),
    ...when(features.siteAnalytics, ROUTES.siteAnalytics),
    ...when(features.contractTemplates && role === 'OWNER', ROUTES.contractTemplates),
    ...when(role === 'OWNER', ROUTES.settings),
    ...when(role === 'OWNER', ROUTES.auditLogs)
  ];
};

/** Нижняя панель на телефоне: не больше четырех разделов, остальное — в меню. */
export interface BottomNav {
  items: NavItem[];
  menuLabel: string;
  menuLabelKey?: string;
}

/** Разделы нижней панели на телефоне для роли и включенных модулей. */
export const getBottomNav = (access: NavAccess): BottomNav => {
  const { role, features } = access;
  if (role === 'SUPERADMIN') {
    return {
      items: [ROUTES.tenants, { ...ROUTES.featureFlags, label: 'Flags' }],
      menuLabel: 'Меню'
    };
  }
  if (role === 'WORKER') {
    const scheduleItem = canOpenMeasurements(access) ? [ROUTES.measurements] : when(features.calendar, ROUTES.calendar);
    return {
      items: [
        ROUTES.kanban,
        ...scheduleItem,
        { ...ROUTES.earnings, label: 'Заработок' },
        ROUTES.archive
      ],
      menuLabel: 'Меню'
    };
  }
  const moneyItem = canOpenFinances(access) ? [ROUTES.finances] : when(features.storage, ROUTES.storage);
  const planningItem = features.calendar ? [ROUTES.calendar] : when(features.reports, ROUTES.reports);
  return {
    items: [
      { ...ROUTES.kanban, badge: 'newOrders' },
      ROUTES.clients,
      ...moneyItem,
      ...planningItem
    ],
    menuLabel: 'Еще',
    menuLabelKey: 'nav.more'
  };
};
