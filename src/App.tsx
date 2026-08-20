import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './components/DashboardLayout';
import Login from './pages/Login';
import Kanban from './pages/Kanban';
import { Clients } from './pages/Clients';
import { Storage } from './pages/Storage';
import { Settings } from './pages/Settings';
import { Employees } from './pages/Employees';
import { Reports } from './pages/Reports';
import { Tenants } from './pages/Tenants';
import { ContractTemplates } from './pages/ContractTemplates';
import { useEffect } from 'react';
import { useAppStore } from './store/useAppStore';
import { useAuthStore } from './store/useAuthStore';
import './i18n';

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const token = useAuthStore(state => state.token);
  return token ? <>{children}</> : <Navigate to="/login" replace />;
};

const IndexRedirect = () => {
  const role = useAuthStore(state => state.role);
  return <Navigate to={role === 'SUPERADMIN' ? "/tenants" : "/kanban"} replace />;
};

function App() {
  const theme = useAppStore(state => state.theme);
  const token = useAuthStore(state => state.token);
  const fetchTenantSettings = useAppStore(state => state.fetchTenantSettings);
  const tenantSettings = useAppStore(state => state.tenantSettings);

  useEffect(() => {
    if (token) {
      fetchTenantSettings();
    }
  }, [token, fetchTenantSettings]);

  useEffect(() => {
    if (tenantSettings?.primaryColor) {
      const hex = tenantSettings.primaryColor;
      
      // Helper to adjust brightness for hover state
      const adjustBrightness = (colorHex: string, percent: number) => {
        let c = colorHex.replace('#', '');
        if (c.length === 3) c = c.split('').map(x => x + x).join('');
        if (c.length === 6) {
          const num = parseInt(c, 16);
          const r = Math.min(255, Math.max(0, ((num >> 16) & 255) + Math.round(255 * (percent / 100))));
          const g = Math.min(255, Math.max(0, ((num >> 8) & 255) + Math.round(255 * (percent / 100))));
          const b = Math.min(255, Math.max(0, (num & 255) + Math.round(255 * (percent / 100))));
          return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
        }
        return colorHex;
      };

      // Helper to convert hex to rgba for glow
      const hexToRgba = (colorHex: string, alpha: number) => {
        let c = colorHex.replace('#', '');
        if (c.length === 3) c = c.split('').map(x => x + x).join('');
        if (c.length === 6) {
          const num = parseInt(c, 16);
          const r = (num >> 16) & 255;
          const g = (num >> 8) & 255;
          const b = num & 255;
          return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        }
        return colorHex;
      };

      document.documentElement.style.setProperty('--accent-primary', hex);
      document.documentElement.style.setProperty('--accent-hover', adjustBrightness(hex, -15));
      document.documentElement.style.setProperty('--accent-glow', hexToRgba(hex, 0.45));
      document.documentElement.style.setProperty('--primary', hex);
    } else {
      document.documentElement.style.removeProperty('--accent-primary');
      document.documentElement.style.removeProperty('--accent-hover');
      document.documentElement.style.removeProperty('--accent-glow');
      document.documentElement.style.removeProperty('--primary');
    }
  }, [tenantSettings?.primaryColor]);

  useEffect(() => {
    if (token) {
      if (tenantSettings?.name) {
        document.title = `${tenantSettings.name} CRM`;
      } else {
        document.title = 'AltaCRM';
      }
    } else {
      document.title = 'AltaCRM';
    }
  }, [token, tenantSettings?.name]);

  useEffect(() => {
    const isLight = theme === 'light';
    const themeColor = isLight ? '#f8fafc' : '#0f172a';

    if (isLight) {
      document.body.classList.add('light-theme');
      document.documentElement.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
      document.documentElement.classList.remove('light-theme');
    }

    // Update <meta name="theme-color"> for Android status bar
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.setAttribute('name', 'theme-color');
      document.head.appendChild(metaThemeColor);
    }
    metaThemeColor.setAttribute('content', themeColor);

    // Update Apple mobile status bar style
    let appleStatusBar = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    if (appleStatusBar) {
      appleStatusBar.setAttribute('content', isLight ? 'default' : 'black-translucent');
    }
  }, [theme]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route path="/" element={<PrivateRoute><DashboardLayout /></PrivateRoute>}>
          <Route index element={<IndexRedirect />} />
          <Route path="kanban" element={<Kanban />} />
          <Route path="clients" element={<Clients />} />
          <Route path="employees" element={<Employees />} />
          <Route path="storage" element={<Storage />} />
          <Route path="reports" element={<Reports />} />
          <Route path="contract-templates" element={<ContractTemplates />} />
          <Route path="settings" element={<Settings />} />
          <Route path="tenants" element={<Tenants />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
