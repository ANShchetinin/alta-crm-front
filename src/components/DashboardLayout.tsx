import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Box, LogOut, Settings, Sun, Moon, Globe, Bell } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useAuthStore } from '../store/useAuthStore';
import { getOrders, getOrderStatuses } from '../api/kanban';
import pkg from '../../package.json';
import '../styles/dashboard.css';

const DashboardLayout = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { theme, setTheme, language, setLanguage, newOrdersCount, setNewOrdersCount, lowStockMaterials, fetchLowStockMaterials } = useAppStore();
  const { logout } = useAuthStore();
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    const fetchNewOrdersCount = async () => {
      try {
        const statuses = await getOrderStatuses();
        // Assuming "Новые" or "New" is usually sortOrder === 1
        const firstStatus = statuses.find(s => s.sortOrder === 1);
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
      {/* Glass Sidebar */}
      <aside className="sidebar glass-panel">
        <div className="sidebar-header">
          <div className="logo-small">▲</div>
          <h2>{t('app.name')}</h2>
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/kanban" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <LayoutDashboard size={20} />
            <span style={{ flex: 1 }}>{t('nav.orders')}</span>
            {newOrdersCount > 0 && (
              <span style={{
                backgroundColor: 'var(--danger)',
                color: 'white',
                borderRadius: '50%',
                minWidth: '20px',
                height: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.75rem',
                fontWeight: 'bold',
                padding: '0 6px'
              }}>
                {newOrdersCount}
              </span>
            )}
          </NavLink>
          <NavLink to="/clients" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Users size={20} />
            <span>{t('nav.clients')}</span>
          </NavLink>
          <NavLink to="/storage" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Box size={20} />
            <span>{t('nav.storage')}</span>
          </NavLink>
          <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Settings size={20} />
            <span>{t('nav.settings')}</span>
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <button className="btn btn-ghost logout-btn" onClick={handleLogout}>
            <LogOut size={20} />
            <span>{t('nav.signout')}</span>
          </button>
          <div style={{ textAlign: 'center', marginTop: '12px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            v{pkg.version}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        <header className="topbar glass-panel">
          <div className="topbar-search">
            {/* Search or breadcrumbs */}
          </div>
          
          <div className="topbar-actions">
            <button className="btn-icon" onClick={toggleLanguage} title="Change Language">
              <Globe size={20} /> 
              <span style={{marginLeft: '4px', fontSize: '0.8rem', fontWeight: 'bold'}}>{language.toUpperCase()}</span>
            </button>
            <button className="btn-icon" onClick={toggleTheme} title="Toggle Theme">
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <div style={{ position: 'relative' }}>
              <button className="btn-icon" onClick={() => setShowNotifications(!showNotifications)} title="Уведомления">
                <Bell size={20} />
                {lowStockMaterials.length > 0 && (
                  <span style={{
                    position: 'absolute', top: -2, right: -2, backgroundColor: 'var(--danger)', color: 'white',
                    borderRadius: '50%', width: 16, height: 16, fontSize: '0.65rem', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', fontWeight: 'bold'
                  }}>
                    {lowStockMaterials.length}
                  </span>
                )}
              </button>
              {showNotifications && (
                <div className="glass-panel" style={{
                  position: 'absolute', top: '100%', right: 0, marginTop: '8px', width: '300px', 
                  zIndex: 9999, padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px'
                }}>
                  <h4 style={{ margin: '0 0 8px 0' }}>Уведомления</h4>
                  {lowStockMaterials.length === 0 ? (
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Нет новых уведомлений</div>
                  ) : (
                    lowStockMaterials.map(m => (
                      <div key={m.id} style={{
                        padding: '12px', background: 'rgba(255,0,0,0.1)', borderLeft: '3px solid var(--danger)',
                        borderRadius: 'var(--radius-md)', fontSize: '0.9rem'
                      }}>
                        <strong>{m.name}</strong> заканчивается!
                        <br/> Остаток: {m.quantityInStock} {m.unit} (Мин: {m.minQuantity})
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
            <div className="user-profile" style={{marginLeft: '12px', borderLeft: '1px solid var(--glass-border)', paddingLeft: '16px'}}>
              <div className="avatar">A</div>
              <span>Admin User</span>
            </div>
          </div>
        </header>
        
        <div className="content-area animate-fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
