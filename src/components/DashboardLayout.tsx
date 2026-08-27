import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, UserCircle, Box, LogOut, Settings, Sun, Moon, Globe, Bell, PieChart, Building2, Menu, X, Smartphone, Download, Share, FileText, Wallet, CalendarDays, Sliders, ChevronDown, Check, Plus, Ruler } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useEffect, useState, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useAuthStore } from '../store/useAuthStore';
import { useFeature } from '../hooks/useFeatureToggle';
import { getOrders, getOrderStatuses } from '../api/kanban';
import { getProfile } from '../api/settings';
import { getMyTenants, switchTenant, type MyTenantsResponse } from '../api/auth';
import { getRecentNotifications, markNotificationAsRead, markAllNotificationsAsRead, type AppNotificationItem } from '../api/notifications';
import { PushNotificationSettings } from './PushNotificationSettings';
import { FeatureGate } from './FeatureGate';
import { CreateCompanyModal } from './CreateCompanyModal';
import { formatTimeAgo } from '../utils/dateUtils';
import '../styles/dashboard.css';

const DashboardLayout = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, setTheme, language, setLanguage, newOrdersCount, setNewOrdersCount, lowStockMaterials, fetchLowStockMaterials, tenantSettings, fetchTenantSettings } = useAppStore();
  const { logout, role, token, setToken } = useAuthStore();
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [canViewFinances, setCanViewFinances] = useState<boolean>(false);
  const [userName, setUserName] = useState<string>('User');
  const [userEmail, setUserEmail] = useState<string>('');
  const [userAvatarUrl, setUserAvatarUrl] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Multi-Company State
  const [myTenantsData, setMyTenantsData] = useState<MyTenantsResponse | null>(null);
  const [isCompanyDropdownOpen, setIsCompanyDropdownOpen] = useState(false);
  const [isCreateCompanyModalOpen, setIsCreateCompanyModalOpen] = useState(false);
  const [isSwitchingCompany, setIsSwitchingCompany] = useState(false);
  const companyDropdownRef = useRef<HTMLDivElement>(null);

  const hasStorage = useFeature('STORAGE');
  const hasCalendar = useFeature('CALENDAR');
  const hasMeasurementCalculator = useFeature('MEASUREMENT_CALCULATOR');
  const hasFinances = useFeature('FINANCES');
  const hasReports = useFeature('REPORTS');
  const hasContractTemplates = useFeature('CONTRACT_TEMPLATES');

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (companyDropdownRef.current && !companyDropdownRef.current.contains(event.target as Node)) {
        setIsCompanyDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const fetchMyTenantsData = async () => {
    try {
      const data = await getMyTenants();
      setMyTenantsData(data);
    } catch (err) {
      console.error("Failed to fetch my tenants", err);
    }
  };

  useEffect(() => {
    fetchMyTenantsData();
  }, [token]);

  const handleSwitchCompany = async (targetTenantId: number) => {
    if (targetTenantId === myTenantsData?.currentTenantId || isSwitchingCompany) return;
    setIsSwitchingCompany(true);
    try {
      const newToken = await switchTenant(targetTenantId);
      setToken(newToken);
      setIsCompanyDropdownOpen(false);
      await fetchTenantSettings();
      await fetchMyTenantsData();
      window.location.reload();
    } catch (err) {
      console.error("Failed to switch company", err);
    } finally {
      setIsSwitchingCompany(false);
    }
  };

  const handleCompanyCreated = async (newToken: string) => {
    setToken(newToken);
    setIsCreateCompanyModalOpen(false);
    setIsCompanyDropdownOpen(false);
    await fetchTenantSettings();
    await fetchMyTenantsData();
    window.location.reload();
  };
  
  // PWA Install States
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIosPrompt, setShowIosPrompt] = useState(false);

  const appVersion = import.meta.env.VITE_APP_VERSION || 'v1.0.0';

  // Check if running as PWA standalone
  useEffect(() => {
    const checkStandalone = () => {
      const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || 
                                (window.navigator as any).standalone === true;
      setIsStandalone(isStandaloneMode);
    };
    
    checkStandalone();
    window.matchMedia('(display-mode: standalone)').addEventListener('change', checkStandalone);

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
      if (role !== 'WORKER') {
        fetchLowStockMaterials();
      }
    };
    fetchNewOrdersCount();

    const fetchUserProfile = async () => {
      try {
        const profile = await getProfile();
        const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(' ');
        setUserName(fullName || profile.email || 'User');
        setUserEmail(profile.email || '');
        if (profile.avatarUrl) {
          setUserAvatarUrl(profile.avatarUrl);
        }
        if (profile.canViewFinances !== undefined) {
          setCanViewFinances(Boolean(profile.canViewFinances));
        }
      } catch (err) {
        console.error("Failed to fetch user profile", err);
      }
    };
    fetchUserProfile();

    fetchNotificationsList();
    const interval = setInterval(fetchNotificationsList, 25000);
    return () => clearInterval(interval);
  }, [role]);

  const [recentNotifications, setRecentNotifications] = useState<AppNotificationItem[]>([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState<number>(0);

  const fetchNotificationsList = async () => {
    try {
      const list = await getRecentNotifications();
      setRecentNotifications(list);
      const unread = list.filter(n => !n.isRead).length;
      setUnreadNotifCount(unread);
    } catch (err) {
      console.error("Failed to fetch recent notifications", err);
    }
  };

  const handleNotificationClick = async (notif: AppNotificationItem) => {
    if (!notif.isRead) {
      try {
        await markNotificationAsRead(notif.id);
        setRecentNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, isRead: true } : n));
        setUnreadNotifCount(prev => Math.max(0, prev - 1));
      } catch (e) {
        console.error('Failed to mark read', e);
      }
    }
    setShowNotifications(false);
    if (notif.orderId) {
      navigate(`/kanban?orderId=${notif.orderId}`);
    } else if (notif.url) {
      navigate(notif.url);
    } else {
      navigate('/kanban');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setRecentNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadNotifCount(0);
    } catch (e) {
      console.error('Failed to mark all read', e);
    }
  };

  const totalUnreadBadge = unreadNotifCount + (role !== 'WORKER' ? lowStockMaterials.length : 0);

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
        <div className="sidebar-header" style={{ position: 'relative' }}>
          <div 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '10px', 
              flex: 1, 
              cursor: ((myTenantsData?.tenants && myTenantsData.tenants.length > 1) || myTenantsData?.canCreateCompany) ? 'pointer' : 'default',
              padding: '6px 8px',
              borderRadius: 'var(--radius-md)',
              transition: 'background 0.2s ease',
              userSelect: 'none',
              background: isCompanyDropdownOpen ? 'rgba(255, 255, 255, 0.05)' : 'transparent'
            }}
            onClick={() => {
              if ((myTenantsData?.tenants && myTenantsData.tenants.length > 1) || myTenantsData?.canCreateCompany) {
                setIsCompanyDropdownOpen(prev => !prev);
              }
            }}
            className="company-switcher-trigger"
          >
            {tenantSettings?.logoUrl ? (
              <img src={tenantSettings.logoUrl} alt="Logo" style={{ width: 32, height: 32, objectFit: 'contain', background: 'transparent', flexShrink: 0 }} />
            ) : (
              <img src="/logo.png" alt="Alta CRM" style={{ width: 32, height: 32, objectFit: 'contain', background: 'transparent', flexShrink: 0 }} />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 style={{ fontSize: '1.05rem', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {tenantSettings?.name || t('app.name')}
              </h2>
              {myTenantsData?.tenants && myTenantsData.tenants.length > 1 && (
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                  {myTenantsData.tenants.length} {myTenantsData.tenants.length === 1 ? 'компания' : myTenantsData.tenants.length < 5 ? 'компании' : 'компаний'}
                </span>
              )}
            </div>
            {((myTenantsData?.tenants && myTenantsData.tenants.length > 1) || myTenantsData?.canCreateCompany) && (
              <ChevronDown 
                size={16} 
                style={{ 
                  color: 'var(--text-secondary)', 
                  transition: 'transform 0.2s ease', 
                  transform: isCompanyDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  flexShrink: 0
                }} 
              />
            )}
          </div>
          <button 
            className="btn-icon mobile-close-btn" 
            onClick={() => setIsMobileMenuOpen(false)}
            aria-label="Close menu"
          >
            <X size={22} />
          </button>

          {/* Company Switcher Dropdown */}
          {isCompanyDropdownOpen && (
            <div 
              ref={companyDropdownRef}
              className="company-dropdown-menu"
            >
              <div style={{ padding: '6px 8px 4px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Ваши компании
              </div>
              <div style={{ maxHeight: '220px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {myTenantsData?.tenants.map(item => {
                  const isActive = item.tenantId === myTenantsData.currentTenantId;
                  return (
                    <button
                      key={item.tenantId}
                      type="button"
                      onClick={() => handleSwitchCompany(item.tenantId)}
                      disabled={isSwitchingCompany || isActive}
                      className={`company-dropdown-item ${isActive ? 'active' : ''}`}
                    >
                      {item.logoUrl ? (
                        <img src={item.logoUrl} alt="" style={{ width: 22, height: 22, objectFit: 'contain', borderRadius: '4px' }} />
                      ) : (
                        <div style={{
                          width: 22,
                          height: 22,
                          borderRadius: '4px',
                          background: item.primaryColor || '#3b82f6',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                          fontSize: '11px',
                          fontWeight: 700
                        }}>
                          {item.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span style={{ flex: 1, fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.name}
                      </span>
                      {isActive && <Check size={16} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />}
                    </button>
                  );
                })}
              </div>

              {myTenantsData?.canCreateCompany && (
                <>
                  <div style={{ height: '1px', background: 'var(--glass-border)', margin: '4px 0' }} />
                  <FeatureGate feature="OWNER_CREATE_COMPANY">
                    <button
                      type="button"
                      onClick={() => {
                        setIsCompanyDropdownOpen(false);
                        setIsCreateCompanyModalOpen(true);
                      }}
                      className="company-create-btn"
                    >
                      <Plus size={16} />
                      <span>Создать компанию</span>
                      <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                        {myTenantsData.currentCompaniesCount} из {myTenantsData.maxCompaniesLimit}
                      </span>
                    </button>
                  </FeatureGate>
                </>
              )}
            </div>
          )}
        </div>

        <nav className="sidebar-nav">
          {role === 'WORKER' && (
            <>
              <NavLink to="/kanban" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <LayoutDashboard size={20} />
                <span style={{ flex: 1 }}>{t('nav.orders') || 'Мои заявки'}</span>
              </NavLink>
              {hasCalendar && (
                <NavLink to="/calendar" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                  <CalendarDays size={20} />
                  <span style={{ flex: 1 }}>Календарь</span>
                </NavLink>
              )}
              <NavLink to="/earnings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <Wallet size={20} />
                <span style={{ flex: 1 }}>Мой заработок</span>
              </NavLink>
            </>
          )}
          {role !== 'SUPERADMIN' && role !== 'WORKER' && (
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
              {hasCalendar && (
                <NavLink to="/calendar" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                  <CalendarDays size={20} />
                  <span>{t('nav.calendar') || 'Календарь'}</span>
                </NavLink>
              )}
              {hasMeasurementCalculator && (
                <NavLink to="/measurements" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                  <Ruler size={20} />
                  <span>Замеры</span>
                </NavLink>
              )}
              <NavLink to="/clients" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <Users size={20} />
                <span>{t('nav.clients')}</span>
              </NavLink>
              <NavLink to="/employees" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <UserCircle size={20} />
                <span>{t('nav.employees') || 'Сотрудники'}</span>
              </NavLink>
              {hasStorage && (
                <NavLink to="/storage" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                  <Box size={20} />
                  <span>{t('nav.storage')}</span>
                </NavLink>
              )}
              {hasFinances && (role === 'OWNER' || role === 'SUPERADMIN' || (role === 'MANAGER' && canViewFinances)) && (
                <NavLink to="/finances" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                  <Wallet size={20} />
                  <span>{t('nav.finances') || 'Финансы'}</span>
                </NavLink>
              )}
              {hasReports && (
                <NavLink to="/reports" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                  <PieChart size={20} />
                  <span>{t('nav.reports') || 'Отчеты'}</span>
                </NavLink>
              )}
              {hasContractTemplates && (
                <NavLink to="/contract-templates" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                  <FileText size={20} />
                  <span>Шаблоны договоров</span>
                </NavLink>
              )}
              <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <Settings size={20} />
                <span>{t('nav.settings')}</span>
              </NavLink>
            </>
          )}
          {role === 'SUPERADMIN' && (
            <div style={{ marginTop: 'auto', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <NavLink to="/feature-flags" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <Sliders size={20} />
                <span>Feature Flags</span>
              </NavLink>
              <NavLink to="/tenants" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <Building2 size={20} />
                <span>Компании (Admin)</span>
              </NavLink>
            </div>
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
                  timeZone: tenantSettings?.timezone || undefined,
                  weekday: 'short', 
                  day: 'numeric', 
                  month: 'short'
                })}
              </span>
              <span className="topbar-divider">|</span>
              <span className="topbar-time">
                {currentTime.toLocaleTimeString(language === 'ru' ? 'ru-RU' : 'en-US', {
                  timeZone: tenantSettings?.timezone || undefined,
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
            <div ref={notificationsRef} style={{ position: 'relative' }}>
              <button 
                type="button" 
                className="btn-icon" 
                onClick={() => setShowNotifications(!showNotifications)} 
                title="Уведомления"
              >
                <Bell size={18} />
                {totalUnreadBadge > 0 && (
                  <span className="notification-badge">
                    {totalUnreadBadge}
                  </span>
                )}
              </button>
              {showNotifications && (
                <div 
                  className="notifications-dropdown"
                  style={{ 
                    right: 0,
                    left: 'auto'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <h4 style={{ margin: 0, fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Bell size={15} style={{ color: 'var(--accent-primary)' }} /> Уведомления за 24 ч
                    </h4>
                    {unreadNotifCount > 0 && (
                      <button
                        type="button"
                        onClick={handleMarkAllRead}
                        style={{ 
                          background: 'none', 
                          border: 'none', 
                          color: 'var(--accent-primary)', 
                          fontSize: '0.75rem', 
                          cursor: 'pointer', 
                          padding: 0,
                          fontWeight: 600
                        }}
                      >
                        Прочитать все
                      </button>
                    )}
                  </div>

                  {recentNotifications.length === 0 && lowStockMaterials.length === 0 ? (
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', textAlign: 'center', padding: '24px 0' }}>
                      За последние сутки новых уведомлений нет
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {recentNotifications.map(n => (
                        <div
                          key={n.id}
                          onClick={() => handleNotificationClick(n)}
                          className={`notification-item-card ${!n.isRead ? 'unread' : ''}`}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '6px' }}>
                            <div style={{ 
                              fontWeight: n.isRead ? 500 : 700, 
                              fontSize: '0.83rem', 
                              color: n.isRead ? 'var(--text-primary)' : 'var(--accent-primary)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '5px'
                            }}>
                              {!n.isRead && (
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-primary)', display: 'inline-block', flexShrink: 0 }} />
                              )}
                              {n.title}
                            </div>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                              {formatTimeAgo(n.createdAt, tenantSettings?.timezone)}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.77rem', color: 'var(--text-secondary)', lineHeight: 1.35, whiteSpace: 'pre-wrap' }}>
                            {n.body}
                          </div>
                        </div>
                      ))}

                      {lowStockMaterials.length > 0 && role !== 'WORKER' && (
                        <div style={{ marginTop: '6px', paddingTop: '8px', borderTop: '1px solid var(--glass-border)' }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#f59e0b', marginBottom: '6px' }}>
                            ⚠️ Заканчивающиеся материалы:
                          </div>
                          {lowStockMaterials.map(m => (
                            <div key={m.id} className="notification-item" style={{ fontSize: '0.76rem', padding: '6px 8px', marginBottom: '4px' }}>
                              <strong>{m.name}</strong>: остаток {m.quantityInStock} {m.unit} (мин: {m.minQuantity})
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'center' }}>
                    <button
                      type="button"
                      onClick={() => { setShowNotifications(false); setIsProfileModalOpen(true); }}
                      className="btn btn-ghost"
                      style={{ fontSize: '0.78rem', color: 'var(--accent-primary)', padding: '4px 8px', width: '100%', justifyContent: 'center' }}
                    >
                      ⚙️ Настройка Push-уведомлений
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div 
              className="user-profile" 
              onClick={() => setIsProfileModalOpen(true)}
              style={{ cursor: 'pointer' }}
              title="Мой профиль и настройка уведомлений"
            >
              <div 
                className="avatar" 
                style={{ 
                  overflow: 'hidden', 
                  padding: 0, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  background: userAvatarUrl ? 'transparent' : undefined,
                  border: userAvatarUrl ? '1px solid rgba(255, 255, 255, 0.15)' : undefined
                }}
              >
                {userAvatarUrl ? (
                  <img 
                    src={userAvatarUrl} 
                    alt={userName} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                  />
                ) : (
                  userName.charAt(0).toUpperCase()
                )}
              </div>
              <span className="user-name-text">{userName}</span>
            </div>
          </div>
        </header>
        
        <div className="content-area animate-fade-in">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Navigation Bar */}
      {role === 'WORKER' && (
        <nav className="mobile-bottom-nav glass-panel">
          <NavLink to="/kanban" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`} style={{ flex: 1 }}>
            <div className="bottom-nav-icon-wrapper">
              <LayoutDashboard size={20} />
            </div>
            <span>{t('nav.orders') || 'Мои заявки'}</span>
          </NavLink>
          {hasCalendar && (
            <NavLink to="/calendar" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`} style={{ flex: 1 }}>
              <div className="bottom-nav-icon-wrapper">
                <CalendarDays size={20} />
              </div>
              <span>Календарь</span>
            </NavLink>
          )}
          <NavLink to="/earnings" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`} style={{ flex: 1 }}>
            <div className="bottom-nav-icon-wrapper">
              <Wallet size={20} />
            </div>
            <span>Заработок</span>
          </NavLink>
          <button 
            type="button" 
            className="bottom-nav-item"
            style={{ flex: 1 }}
            onClick={() => setIsProfileModalOpen(true)}
          >
            <div className="bottom-nav-icon-wrapper">
              <Bell size={20} />
            </div>
            <span>Профиль</span>
          </button>
        </nav>
      )}

      {role !== 'SUPERADMIN' && role !== 'WORKER' && (
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
          {hasStorage && (
            <NavLink to="/storage" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
              <Box size={20} />
              <span>{t('nav.storage')}</span>
            </NavLink>
          )}
          {hasReports && (
            <NavLink to="/reports" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
              <PieChart size={20} />
              <span>{t('nav.reports') || 'Отчеты'}</span>
            </NavLink>
          )}
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

      {/* Profile and Push Notifications Modal */}
      {isProfileModalOpen && (
        <div className="modal-overlay" onClick={() => setIsProfileModalOpen(false)} style={{ zIndex: 1100 }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px', padding: '24px' }}>
            <div className="modal-header" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: userAvatarUrl ? 'transparent' : 'var(--primary-gradient)',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  fontSize: '1rem',
                  overflow: 'hidden',
                  flexShrink: 0,
                  border: userAvatarUrl ? '1px solid rgba(255, 255, 255, 0.2)' : undefined
                }}>
                  {userAvatarUrl ? (
                    <img 
                      src={userAvatarUrl} 
                      alt={userName} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                  ) : (
                    userName.charAt(0).toUpperCase()
                  )}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{userName}</h3>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {userEmail || 'Пользователь CRM'} • <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>{role}</span>
                  </div>
                </div>
              </div>
              <button className="btn-icon" onClick={() => setIsProfileModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <PushNotificationSettings />

              {role !== 'WORKER' && (
                <div style={{ textAlign: 'center', marginTop: '4px' }}>
                  <NavLink
                    to="/settings"
                    onClick={() => setIsProfileModalOpen(false)}
                    style={{ fontSize: '0.82rem', color: 'var(--accent-primary)', textDecoration: 'underline' }}
                  >
                    Перейти ко всем настройкам профиля и компании →
                  </NavLink>
                </div>
              )}
            </div>
          </div>
        </div>
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

      {/* Modal for Owner to create a new company */}
      <CreateCompanyModal 
        isOpen={isCreateCompanyModalOpen} 
        onClose={() => setIsCreateCompanyModalOpen(false)} 
        onSuccess={handleCompanyCreated} 
      />
    </div>
  );
};

export default DashboardLayout;
