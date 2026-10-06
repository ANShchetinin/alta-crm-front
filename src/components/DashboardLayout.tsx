import { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useOrderDrawerStore } from '../store/useOrderDrawerStore';
import { ORDERS_QUERY_KEY } from '../hooks/queries/useOrdersQuery';
import { useInvalidateOnOrdersChanged } from '../hooks/queries/useInvalidateOnOrdersChanged';
import { CreateCompanyModal } from './CreateCompanyModal';
import { AnnouncementBanner } from '../features/announcements/components/AnnouncementBanner';
import { useActiveAnnouncements } from '../features/announcements/hooks/useAnnouncements';
import { WhatsNewModal } from '../features/whatsNew/components/WhatsNewModal';
import { useCompanySwitcher } from './layout/hooks/useCompanySwitcher';
import { useNavAccess } from './layout/hooks/useNavAccess';
import { useNavCounters } from './layout/hooks/useNavCounters';
import { useOrderDrawerTriggers } from './layout/hooks/useOrderDrawerTriggers';
import { usePresenceHeartbeat } from './layout/hooks/usePresenceHeartbeat';
import { usePwaInstall } from './layout/hooks/usePwaInstall';
import { useSidebarCollapsed } from './layout/hooks/useSidebarCollapsed';
import { useUserProfile } from './layout/hooks/useUserProfile';
import { IosInstallGuide } from './layout/IosInstallGuide';
import { MobileBottomNav } from './layout/MobileBottomNav';
import { getBottomNav, getSidebarItems } from './layout/navigation';
import { ProfileModal } from './layout/ProfileModal';
import { Sidebar } from './layout/Sidebar';
import { Topbar } from './layout/Topbar';
import '../styles/dashboard.css';

// Шторка заказа тянет смету, договор и сканеры — грузим её при первом открытии, а не с каждой страницей
const OrderDrawer = lazy(() => import('../features/kanban/components/OrderDrawer').then(m => ({ default: m.OrderDrawer })));

/** Каркас приложения: боковое меню, верхняя панель, нижняя панель на телефоне и глобальная шторка заказа. */
const DashboardLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, role, token, tenantId } = useAuthStore();
  const isTenantUser = role !== 'SUPERADMIN' && Boolean(token);
  const navAccess = useNavAccess();

  // Любое изменение заказа (шторка, доска, комментарии, файлы) обновляет все списки заказов разом
  useInvalidateOnOrdersChanged(ORDERS_QUERY_KEY);
  useOrderDrawerTriggers();
  usePresenceHeartbeat(token);

  const { profile, refresh: refreshProfile } = useUserProfile(role);
  const { refresh: refreshCounters } = useNavCounters(role, navAccess.features.siteRequests);
  const refreshUserData = useCallback(
    () => Promise.all([refreshProfile(), refreshCounters()]),
    [refreshProfile, refreshCounters]
  );
  const switcher = useCompanySwitcher(isTenantUser, refreshUserData);
  const pwa = usePwaInstall();
  const sidebar = useSidebarCollapsed();
  const { announcements, dismiss: dismissAnnouncement } = useActiveAnnouncements(Boolean(token));

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const { isOpen: isOrderDrawerOpen, activeTab: orderDrawerActiveTab } = useOrderDrawerStore();
  const isWideDrawer = isOrderDrawerOpen && (orderDrawerActiveTab === 'MEASUREMENT' || orderDrawerActiveTab === 'CONTRACT');
  // После первого открытия шторка остаётся смонтированной, как раньше: закрытая она ничего не рисует
  const [isOrderDrawerLoaded, setIsOrderDrawerLoaded] = useState(false);
  if (isOrderDrawerOpen && !isOrderDrawerLoaded) {
    setIsOrderDrawerLoaded(true);
  }

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className={`dashboard-container ${isOrderDrawerOpen ? 'order-drawer-open' : ''} ${isWideDrawer ? 'order-drawer-wide' : ''}`}>
      {isMobileMenuOpen && <div className="mobile-backdrop open" onClick={closeMobileMenu} />}

      <Sidebar
        role={role}
        items={getSidebarItems(navAccess)}
        switcher={switcher}
        isCollapsed={sidebar.isCollapsed}
        onToggleCollapsed={sidebar.toggle}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={closeMobileMenu}
        canInstallPwa={!pwa.isStandalone}
        onInstallPwa={pwa.install}
        onLogout={handleLogout}
      />

      <main className="main-content">
        <Topbar
          role={role}
          profile={profile}
          switcher={switcher}
          isMobileMenuOpen={isMobileMenuOpen}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          canInstallPwa={!pwa.isStandalone}
          onInstallPwa={pwa.install}
          onOpenProfile={() => setIsProfileModalOpen(true)}
        />
        <AnnouncementBanner className="dashboard-announcements" announcements={announcements} onDismiss={dismissAnnouncement} />
        <div className="content-area animate-fade-in" key={tenantId ?? 'default'}>
          <Outlet />
        </div>
      </main>

      <MobileBottomNav
        nav={getBottomNav(navAccess)}
        isMenuOpen={isMobileMenuOpen}
        onToggleMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        onNavigate={closeMobileMenu}
      />

      {isProfileModalOpen && (
        <ProfileModal profile={profile} role={role} switcher={switcher} onClose={() => setIsProfileModalOpen(false)} />
      )}

      {pwa.showIosGuide && <IosInstallGuide onClose={pwa.closeIosGuide} />}

      {isOrderDrawerLoaded && (
        <Suspense fallback={null}>
          <OrderDrawer />
        </Suspense>
      )}

      <WhatsNewModal />

      <CreateCompanyModal
        isOpen={switcher.isCreateModalOpen}
        onClose={switcher.closeCreateModal}
        onSuccess={switcher.handleCompanyCreated}
      />
    </div>
  );
};

export default DashboardLayout;
