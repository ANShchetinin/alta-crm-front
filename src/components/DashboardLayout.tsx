import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Box, LogOut, Settings } from 'lucide-react';
import '../styles/dashboard.css';

const DashboardLayout = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    navigate('/login');
  };

  return (
    <div className="dashboard-container">
      {/* Glass Sidebar */}
      <aside className="sidebar glass-panel">
        <div className="sidebar-header">
          <div className="logo-small">▲</div>
          <h2>AltaCRM</h2>
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/kanban" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <LayoutDashboard size={20} />
            <span>Orders Board</span>
          </NavLink>
          <NavLink to="/clients" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Users size={20} />
            <span>Clients</span>
          </NavLink>
          <NavLink to="/storage" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Box size={20} />
            <span>Storage</span>
          </NavLink>
          <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Settings size={20} />
            <span>Settings</span>
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <button className="btn btn-ghost logout-btn" onClick={handleLogout}>
            <LogOut size={20} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        <header className="topbar glass-panel">
          <div className="topbar-search">
            {/* Search or breadcrumbs */}
          </div>
          <div className="user-profile">
            <div className="avatar">A</div>
            <span>Admin User</span>
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
