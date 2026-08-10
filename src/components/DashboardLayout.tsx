import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Box, LogOut, Settings, Sun, Moon, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store/useAppStore';
import { useAuthStore } from '../store/useAuthStore';
import '../styles/dashboard.css';

const DashboardLayout = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { theme, setTheme, language, setLanguage } = useAppStore();
  const { logout } = useAuthStore();

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
            <span>{t('nav.orders')}</span>
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
