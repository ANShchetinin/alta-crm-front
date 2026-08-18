import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, UserCircle, Box, LogOut, Settings, Sun, Moon, Globe, Bell, PieChart, Building2, Menu, X, Smartphone, Download, Share } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useAuthStore } from '../store/useAuthStore';
import { getOrders, getOrderStatuses } from '../api/kanban';
import { getProfile } from '../api/settings';
import '../styles/dashboard.css';

const DashboardLayout = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, setTheme, language, setLanguage, newOrdersCount, setNewOrdersCount, lowStockMaterials, fetchLowStockMaterials, tenantSettings } = useAppStore();
  const { logout, role } = useAuthStore();
  const [showNotifications, setShowNotifications] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [userName, setUserName] = useState<string>('User');
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // PWA Install States
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIosPrompt, setShowIosPrompt] = useState(false);

  const appVersion = import.meta.env.VITE_APP_VERSION || 'v1.0.0';

  // Check if running as PWA standalone
  useEffect(() => {
    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    setIsStandalone(isStandaloneMode);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredInstallPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallPwa = async () => {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      const { outcome } = await deferredInstallPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredInstallPrompt(null);
      }
    } else {
      // Check if iOS
      const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      if (isIos) {
        setShowIosPrompt(true);
      } else {
        alert('Для установки приложения нажмите кнопку меню браузера (⋮) и выберите «Установить приложение» или «Добавить на главный экран».');
      }
    }
  };

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (role === 'SUPERADMIN') return;

    const fetchNewOrdersCount = async () => {
      try {
        const statuses = await getOrderStatuses();
        const firstStatus = statuses.find(s => s.sortOrder === 1 || s.sortOrder === 0);
        if (firstStatus) {
          const orders = await getOrders();
          const count = orders.filter(o => o.statusId === firstStatus.id).length;
          setNewOrdersCount(count);
        }
      } catch (err) {
        console.error("Failed to fetch new orders count", err);
      }
      fetchLowStockMaterials();
    };
    fetchNewOrdersCount();

    const fetchUserProfile = async () => {
      try {
        const profile = await getProfile();
        const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(' ');
        setUserName(fullName || profile.email || 'User');
      } catch (err) {
        console.error("Failed to fetch user profile", err);
      }
    };
    fetchUserProfile();
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const toggleLanguage = () => {
    setLanguage(language === 'ru' ? 'en' : 'ru');
  };

  return (
    <div className="dashboard-container">
      {/* Mobile Drawer Backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="mobile-backdrop" 
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Glass Sidebar / Mobile Drawer */}
      <aside className={`sidebar glass-panel ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
            {tenantSettings?.logoUrl ? (
              <img src={tenantSettings.logoUrl} alt="Logo" className="logo-small" style={{width: 32, height: 32, objectFit: 'contain', background: 'transparent'}} />
            ) : (
              <div className="logo-small">▲</div>
            )}
            <h2>{tenantSettings?.name || t('app.name')}</h2>
          </div>
          <button 
            className="btn-icon mobile-close-btn" 
            onClick={() => setIsMobileMenuOpen(false)}
            aria-label="Close menu"
          >
            <X size={22} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {role !== 'SUPERADMIN' && (
            <>
              <NavLink to="/kanban" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <LayoutDashboard size={20} />
                <span style={{ flex: 1 }}>{t('nav.orders')}</span>
                {newOrdersCount > 0 && (
                  <span className="nav-badge danger-badge">
                    {newOrdersCount}
                  </span>
                )}
              </NavLink>
              <NavLink to="/clients" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <Users size={20} />
                <span>{t('nav.clients')}</span>
              </NavLink>
              <NavLink to="/employees" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <UserCircle size={20} />
                <span>{t('nav.employees') || 'Сотрудники'}</span>
              </NavLink>
              <NavLink to="/storage" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <Box size={20} />
                <span>{t('nav.storage')}</span>
              </NavLink>
              <NavLink to="/reports" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <PieChart size={20} />
                <span>{t('nav.reports') || 'Отчеты'}</span>
              </NavLink>
              <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <Settings size={20} />
                <span>{t('nav.settings')}</span>
              </NavLink>
            </>
          )}
          {role === 'SUPERADMIN' && (
            <NavLink to="/tenants" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} style={{ marginTop: 'auto', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px' }}>
              <Building2 size={20} />
              <span>Компании (Admin)</span>
            </NavLink>
          )}
        </nav>

        <div className="sidebar-footer">
          {!isStandalone && (
            <button 
              type="button" 
              className="btn btn-ghost" 
              onClick={handleInstallPwa}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                width: '100%',
                padding: '10px 14px',
                color: 'var(--accent-primary)',
                background: 'rgba(59, 130, 246, 0.08)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                borderRadius: 'var(--radius-md)',
                marginBottom: '8px',
                fontSize: '0.88rem',
                fontWeight: 500,
                cursor: 'pointer'
              }}
              title="Установить Alta CRM на телефон или рабочий стол"
            >
              <Smartphone size={18} />
              <span>Установить PWA</span>
            </button>
          )}

          <button className="btn btn-ghost logout-btn" onClick={handleLogout}>
            <LogOut size={20} />
            <span>{t('nav.signout')}</span>
          </button>
          <div className="app-version-badge">
            {appVersion}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        <header className="topbar glass-panel">
          <div className="topbar-left">
            <button 
              className="btn-icon mobile-menu-btn" 
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={22} />
            </button>
            <div className="topbar-search">
              <span className="topbar-date">
                {currentTime.toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US', {
                  weekday: 'short', 
                  day: 'numeric', 
                  month: 'short'
                })}
              </span>
              <span className="topbar-divider">|</span>
              <span className="topbar-time">
                {currentTime.toLocaleTimeString(language === 'ru' ? 'ru-RU' : 'en-US', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
          </div>
          
          <div className="topbar-actions">
            {!isStandalone && (
              <button 
                type="button" 
                className="btn-icon" 
                onClick={handleInstallPwa}
                title="Установить приложение на телефон"
                style={{ color: 'var(--accent-primary)' }}
              >
                <Download size={18} />
              </button>
            )}
            <button className="btn-icon" onClick={toggleLanguage} title="Change Language">
              <Globe size={18} /> 
              <span style={{marginLeft: '4px', fontSize: '0.75rem', fontWeight: 'bold'}}>{language.toUpperCase()}</span>
            </button>
            <button className="btn-icon" onClick={toggleTheme} title="Toggle Theme">
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <div style={{ position: 'relative' }}>
              <button className="btn-icon" onClick={() => setShowNotifications(!showNotifications)} title="Уведомления">
                <Bell size={18} />
                {lowStockMaterials.length > 0 && (
                  <span className="notification-badge">
                    {lowStockMaterials.length}
                  </span>
                )}
              </button>
              {showNotifications && (
                <div className="notifications-dropdown glass-panel">
                  <h4 style={{ margin: '0 0 8px 0' }}>Уведомления</h4>
                  {lowStockMaterials.length === 0 ? (
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Нет новых уведомлений</div>
                  ) : (
                    lowStockMaterials.map(m => (
                      <div key={m.id} className="notification-item">
                        <strong>{m.name}</strong> заканчивается!
                        <br/> Остаток: {m.quantityInStock} {m.unit} (Мин: {m.minQuantity})
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
            <div className="user-profile">
              <div className="avatar">{userName.charAt(0).toUpperCase()}</div>
              <span className="user-name-text">{userName}</span>
            </div>
          </div>
        </header>
        
        <div className="content-area animate-fade-in">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Navigation Bar */}
      {role !== 'SUPERADMIN' && (
        <nav className="mobile-bottom-nav glass-panel">
          <NavLink to="/kanban" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
            <div className="bottom-nav-icon-wrapper">
              <LayoutDashboard size={20} />
              {newOrdersCount > 0 && <span className="bottom-nav-badge">{newOrdersCount}</span>}
            </div>
            <span>{t('nav.orders')}</span>
          </NavLink>
          <NavLink to="/clients" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
            <Users size={20} />
            <span>{t('nav.clients')}</span>
          </NavLink>
          <NavLink to="/storage" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
            <Box size={20} />
            <span>{t('nav.storage')}</span>
          </NavLink>
          <NavLink to="/reports" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
            <PieChart size={20} />
            <span>{t('nav.reports') || 'Отчеты'}</span>
          </NavLink>
          <button 
            type="button" 
            className={`bottom-nav-item ${isMobileMenuOpen ? 'active' : ''}`}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <Menu size={20} />
            <span>{t('nav.more') || 'Еще'}</span>
          </button>
        </nav>
      )}

      {/* iOS PWA Install Guide Modal */}
      {showIosPrompt && (
        <div className="modal-overlay" onClick={() => setShowIosPrompt(false)} style={{ zIndex: 1100 }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px', textAlign: 'center', padding: '24px' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              color: 'white'
            }}>
              <Smartphone size={28} />
            </div>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '1.2rem' }}>Установка на iPhone / iPad</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 20px 0' }}>
              Чтобы открывать Alta CRM в полноэкранном режиме как приложение:
            </p>
            <div style={{
              textAlign: 'left',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--glass-border)',
              borderRadius: 'var(--radius-md)',
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              fontSize: '0.88rem',
              marginBottom: '20px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ background: 'var(--accent-primary)', color: 'white', width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 'bold' }}>1</span>
                <span>Нажмите кнопку <strong>«Поделиться»</strong> <Share size={15} style={{ verticalAlign: 'middle', display: 'inline' }} /> внизу экрана Safari.</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ background: 'var(--accent-primary)', color: 'white', width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 'bold' }}>2</span>
                <span>Прокрутите вниз и выберите <strong>«На экран “Домой”»</strong>.</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ background: 'var(--accent-primary)', color: 'white', width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 'bold' }}>3</span>
                <span>Нажмите <strong>«Добавить»</strong> в правом верхнем углу.</span>
              </div>
            </div>
            <button type="button" className="btn btn-primary" onClick={() => setShowIosPrompt(false)} style={{ width: '100%' }}>
              Понятно
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardLayout;
