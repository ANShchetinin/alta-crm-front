import { NavLink } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store/useAppStore';
import { getNavLabel, type BottomNav } from './navigation';

interface MobileBottomNavProps {
  nav: BottomNav;
  isMenuOpen: boolean;
  onToggleMenu: () => void;
  onNavigate: () => void;
}

/** Нижняя панель на телефоне: главные разделы и кнопка, открывающая полное меню. */
export const MobileBottomNav = ({ nav, isMenuOpen, onToggleMenu, onNavigate }: MobileBottomNavProps) => {
  const { t } = useTranslation();
  const newOrdersCount = useAppStore(state => state.newOrdersCount);
  const menuLabel = nav.menuLabelKey ? t(nav.menuLabelKey, nav.menuLabel) : nav.menuLabel;

  return (
    <nav className="mobile-bottom-nav">
      {nav.items.map(item => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={onNavigate}
          className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
        >
          <div className="bottom-nav-icon-wrapper">
            <item.icon size={20} />
            {item.badge === 'newOrders' && newOrdersCount > 0 && <span className="bottom-nav-badge">{newOrdersCount}</span>}
          </div>
          <span>{getNavLabel(item, t)}</span>
        </NavLink>
      ))}
      <button type="button" className={`bottom-nav-item ${isMenuOpen ? 'active' : ''}`} onClick={onToggleMenu}>
        <div className="bottom-nav-icon-wrapper">
          <Menu size={20} />
        </div>
        <span>{menuLabel}</span>
      </button>
    </nav>
  );
};
