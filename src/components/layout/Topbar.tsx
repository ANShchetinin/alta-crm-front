import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Download, Globe, Menu, Moon, Plus, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store/useAppStore';
import { useOrderDrawerStore } from '../../store/useOrderDrawerStore';
import { CompanyDropdown, TopbarCompanyTrigger } from './CompanySwitcher';
import type { CompanySwitcher } from './hooks/useCompanySwitcher';
import type { UserProfileSummary } from './hooks/useUserProfile';
import { getNavLabel, getRouteTitle } from './navigation';
import { NotificationsMenu } from './NotificationsMenu';
import { UserAvatar } from './UserAvatar';

interface TopbarProps {
  role: string | null;
  profile: UserProfileSummary;
  switcher: CompanySwitcher;
  isMobileMenuOpen: boolean;
  onOpenMobileMenu: () => void;
  canInstallPwa: boolean;
  onInstallPwa: () => void;
  onOpenProfile: () => void;
}

/** Часы по часовому поясу компании; тикают сами, не перерисовывая остальной интерфейс. */
const TopbarClock = () => {
  const language = useAppStore(state => state.language);
  const timezone = useAppStore(state => state.tenantSettings?.timezone);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <span className="topbar-time">
      {now.toLocaleTimeString(language === 'ru' ? 'ru-RU' : 'en-US', {
        timeZone: timezone || undefined,
        hour: '2-digit',
        minute: '2-digit'
      })}
    </span>
  );
};

const PageTitle = () => {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const route = getRouteTitle(pathname);
  return (
    <div className="topbar-title-badge">
      <route.icon size={18} style={{ color: 'var(--accent-primary, #2563eb)' }} />
      <span>{getNavLabel(route, t)}</span>
    </div>
  );
};

/** Верхняя панель: раздел, часы, компания, новый заказ, язык, тема, уведомления и профиль. */
export const Topbar = ({
  role, profile, switcher, isMobileMenuOpen, onOpenMobileMenu, canInstallPwa, onInstallPwa, onOpenProfile
}: TopbarProps) => {
  const { theme, setTheme, language, setLanguage } = useAppStore();
  const isTenantUser = role !== 'SUPERADMIN';

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="btn-icon mobile-menu-btn" onClick={onOpenMobileMenu} aria-label="Open menu">
          <Menu size={20} />
        </button>
        <PageTitle />
        <div className="topbar-search">
          <span className="topbar-divider">|</span>
          <TopbarClock />
        </div>

        {isTenantUser && (
          <div className="topbar-company-wrapper" style={{ position: 'relative' }}>
            <span className="topbar-divider">|</span>
            <TopbarCompanyTrigger switcher={switcher} />
            {!isMobileMenuOpen && <CompanyDropdown switcher={switcher} isMobile={false} />}
          </div>
        )}
      </div>

      <div className="topbar-actions">
        {isTenantUser && (
          <button
            type="button"
            className="topbar-new-order-btn"
            onClick={() => useOrderDrawerStore.getState().openCreateOrder()}
            title="Создать новый заказ"
          >
            <Plus size={15} />
            <span className="hidden sm:inline">Новый заказ</span>
          </button>
        )}

        {canInstallPwa && (
          <button
            type="button"
            className="btn-icon topbar-pwa-btn"
            onClick={onInstallPwa}
            title="Установить приложение на телефон"
            style={{ color: 'var(--accent-primary)' }}
          >
            <Download size={18} />
          </button>
        )}
        <button className="btn-icon topbar-lang-btn" onClick={() => setLanguage(language === 'ru' ? 'en' : 'ru')} title="Change Language">
          <Globe size={18} />
          <span style={{ marginLeft: '2px', fontSize: '0.72rem', fontWeight: 'bold' }}>{language.toUpperCase()}</span>
        </button>
        <button className="btn-icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} title="Toggle Theme">
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <NotificationsMenu enabled={isTenantUser} showLowStock={role !== 'WORKER'} onOpenPushSettings={onOpenProfile} />
        <div className="user-profile" onClick={onOpenProfile} style={{ cursor: 'pointer' }} title="Мой профиль и настройка уведомлений">
          <UserAvatar profile={profile} className="avatar" style={{ padding: 0 }} photoBorder="1px solid rgba(255, 255, 255, 0.15)" />
          <span className="user-name-text">{profile.name}</span>
        </div>
      </div>
    </header>
  );
};
