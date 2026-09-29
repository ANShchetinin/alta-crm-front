import { NavLink } from 'react-router-dom';
import { PanelLeftClose, PanelLeftOpen, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store/useAppStore';
import { CompanyDropdown, SidebarCompanyTrigger } from './CompanySwitcher';
import type { CompanySwitcher } from './hooks/useCompanySwitcher';
import { getNavLabel, type NavItem } from './navigation';
import { SidebarFooter } from './SidebarFooter';

interface SidebarProps {
  role: string | null;
  items: NavItem[];
  switcher: CompanySwitcher;
  isCollapsed: boolean;
  onToggleCollapsed: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  canInstallPwa: boolean;
  onInstallPwa: () => void;
  onLogout: () => void;
}

const NavItemBadge = ({ item }: { item: NavItem }) => {
  const newOrdersCount = useAppStore(state => state.newOrdersCount);
  const newSiteRequestsCount = useAppStore(state => state.newSiteRequestsCount);
  if (item.badge === 'beta') {
    return <span className="nav-badge beta-badge">beta</span>;
  }
  const count = item.badge === 'newOrders' ? newOrdersCount : item.badge === 'newSiteRequests' ? newSiteRequestsCount : 0;
  return count > 0 ? <span className="nav-badge danger-badge">{count}</span> : null;
};

const SuperAdminBrand = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 8px', flex: 1 }}>
    <img src="/logo.png" alt="Alta CRM" style={{ width: 30, height: 30, objectFit: 'contain', background: 'transparent', flexShrink: 0 }} />
    <div style={{ flex: 1, minWidth: 0 }}>
      <h2 style={{ fontSize: '1.05rem', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        AltaCRM
      </h2>
      <span style={{ fontSize: '0.72rem', color: 'var(--accent-primary)', fontWeight: 600 }}>
        Панель SuperAdmin
      </span>
    </div>
  </div>
);

/** Боковое меню: на десктопе сворачивается, на телефоне выезжает шторкой с переключателем компаний. */
export const Sidebar = ({
  role, items, switcher, isCollapsed, onToggleCollapsed, isMobileOpen, onCloseMobile, canInstallPwa, onInstallPwa, onLogout
}: SidebarProps) => {
  const { t } = useTranslation();
  return (
    <aside className={`sidebar ${isCollapsed ? 'sidebar-collapsed' : ''} ${isMobileOpen ? 'mobile-open' : ''}`}>
      <div className="sidebar-header" style={{ position: 'relative' }}>
        {/* Шапка мобильного меню (только на экранах до 768px) */}
        <div className="mobile-sidebar-brand-wrapper">
          {role === 'SUPERADMIN' ? <SuperAdminBrand /> : <SidebarCompanyTrigger switcher={switcher} />}
          <button className="btn-icon mobile-close-btn" onClick={onCloseMobile} aria-label="Close menu">
            <X size={20} />
          </button>
          {isMobileOpen && <CompanyDropdown switcher={switcher} isMobile />}
        </div>

        <div className="desktop-sidebar-brand-wrapper">
          <div className="sidebar-brand">
            <img src="/logo.png" alt="Alta CRM" style={{ width: 28, height: 28, objectFit: 'contain', background: 'transparent', flexShrink: 0 }} />
            <span className="sidebar-brand-title">AltaCRM</span>
          </div>
          <button
            type="button"
            className="sidebar-toggle-btn"
            onClick={onToggleCollapsed}
            title={isCollapsed ? 'Развернуть меню' : 'Свернуть меню'}
          >
            {isCollapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
          </button>
        </div>
      </div>

      <nav className="sidebar-nav">
        {items.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onCloseMobile}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <item.icon size={20} />
            <span>{getNavLabel(item, t)}</span>
            <NavItemBadge item={item} />
          </NavLink>
        ))}
      </nav>

      <SidebarFooter
        canInstallPwa={canInstallPwa}
        onInstallPwa={onInstallPwa}
        onLogout={onLogout}
        onCloseMobile={onCloseMobile}
      />
    </aside>
  );
};
