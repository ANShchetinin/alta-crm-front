import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import React, { useEffect, Suspense, lazy } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import DashboardLayout from './components/DashboardLayout';
import { PageLoader } from './components/PageLoader';
import { useFeature } from './hooks/useFeatureToggle';
import { ErrorBoundary } from './components/ErrorBoundary';
import type { FeatureKey } from './api/features';
import { useAppStore } from './store/useAppStore';
import { useAuthStore } from './store/useAuthStore';
import './i18n';

const Login = lazy(() => import('./pages/Login'));
const Kanban = lazy(() => import('./pages/Kanban'));
const Clients = lazy(() => import('./pages/Clients').then(m => ({ default: m.Clients })));
const Storage = lazy(() => import('./pages/Storage').then(m => ({ default: m.Storage })));
const Settings = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));
const Employees = lazy(() => import('./pages/Employees').then(m => ({ default: m.Employees })));
const Reports = lazy(() => import('./pages/Reports').then(m => ({ default: m.Reports })));
const Tenants = lazy(() => import('./pages/Tenants').then(m => ({ default: m.Tenants })));
const ContractTemplates = lazy(() => import('./pages/ContractTemplates').then(m => ({ default: m.ContractTemplates })));
const Earnings = lazy(() => import('./pages/Earnings').then(m => ({ default: m.Earnings })));
const Calendar = lazy(() => import('./pages/Calendar').then(m => ({ default: m.Calendar })));
const Measurements = lazy(() => import('./pages/Measurements').then(m => ({ default: m.Measurements })));
const Finances = lazy(() => import('./pages/Finances').then(m => ({ default: m.Finances })));
const FeatureFlags = lazy(() => import('./pages/FeatureFlags').then(m => ({ default: m.FeatureFlags })));
const ExitIntentStats = lazy(() => import('./pages/ExitIntentStats').then(m => ({ default: m.ExitIntentStats })));
const Archive = lazy(() => import('./pages/Archive').then(m => ({ default: m.Archive })));

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const token = useAuthStore(state => state.token);
  return token ? <>{children}</> : <Navigate to="/login" replace />;
};

const RoleRoute = ({ children, allowedRoles }: { children: React.ReactNode; allowedRoles: string[] }) => {
  const role = useAuthStore(state => state.role);
  if (!role || !allowedRoles.includes(role)) {
    return <Navigate to={role === 'SUPERADMIN' ? "/tenants" : "/kanban"} replace />;
  }
  return <>{children}</>;
};

const FeatureRoute = ({ children, feature }: { children: React.ReactNode; feature: FeatureKey }) => {
  const role = useAuthStore(state => state.role);
  const isEnabled = useFeature(feature);
  if (!isEnabled) {
    return <Navigate to={role === 'SUPERADMIN' ? "/tenants" : "/kanban"} replace />;
  }
  return <ErrorBoundary featureName={feature}>{children}</ErrorBoundary>;
};

const IndexRedirect = () => {
  const role = useAuthStore(state => state.role);
  return <Navigate to={role === 'SUPERADMIN' ? "/tenants" : "/kanban"} replace />;
};

function App() {
  const theme = useAppStore(state => state.theme);
  const token = useAuthStore(state => state.token);
  const role = useAuthStore(state => state.role);
  const fetchTenantSettings = useAppStore(state => state.fetchTenantSettings);
  const tenantSettings = useAppStore(state => state.tenantSettings);

  useEffect(() => {
    if (token && role !== 'SUPERADMIN') {
      fetchTenantSettings();
    }
  }, [token, role, fetchTenantSettings]);

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
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route path="/" element={<PrivateRoute><DashboardLayout /></PrivateRoute>}>
              <Route index element={<IndexRedirect />} />
              <Route path="tenants" element={<RoleRoute allowedRoles={['SUPERADMIN']}><Tenants /></RoleRoute>} />
              <Route path="feature-flags" element={<RoleRoute allowedRoles={['SUPERADMIN']}><FeatureFlags /></RoleRoute>} />

              <Route path="kanban" element={<RoleRoute allowedRoles={['OWNER', 'MANAGER', 'WORKER']}><Kanban /></RoleRoute>} />
              <Route path="calendar" element={<RoleRoute allowedRoles={['OWNER', 'MANAGER', 'WORKER']}><FeatureRoute feature="CALENDAR"><Calendar /></FeatureRoute></RoleRoute>} />
              <Route path="measurements" element={<RoleRoute allowedRoles={['OWNER', 'MANAGER', 'WORKER']}><FeatureRoute feature="MEASUREMENT_CALCULATOR"><Measurements /></FeatureRoute></RoleRoute>} />
              <Route path="earnings" element={<RoleRoute allowedRoles={['WORKER', 'OWNER', 'MANAGER']}><Earnings /></RoleRoute>} />
              <Route path="clients" element={<RoleRoute allowedRoles={['OWNER', 'MANAGER']}><Clients /></RoleRoute>} />
              <Route path="employees" element={<RoleRoute allowedRoles={['OWNER']}><Employees /></RoleRoute>} />
              <Route path="storage" element={<RoleRoute allowedRoles={['OWNER', 'MANAGER']}><FeatureRoute feature="STORAGE"><Storage /></FeatureRoute></RoleRoute>} />
              <Route path="archive" element={<RoleRoute allowedRoles={['OWNER', 'MANAGER', 'WORKER']}><Archive /></RoleRoute>} />
              <Route path="finances" element={<RoleRoute allowedRoles={['OWNER', 'MANAGER']}><FeatureRoute feature="FINANCES"><Finances /></FeatureRoute></RoleRoute>} />
              <Route path="reports" element={<RoleRoute allowedRoles={['OWNER', 'MANAGER']}><FeatureRoute feature="REPORTS"><Reports /></FeatureRoute></RoleRoute>} />
              <Route path="site-analytics" element={<RoleRoute allowedRoles={['OWNER', 'MANAGER']}><FeatureRoute feature="EXIT_INTENT_ANALYTICS"><ExitIntentStats /></FeatureRoute></RoleRoute>} />
              <Route path="exit-intent-stats" element={<Navigate to="/site-analytics" replace />} />
              <Route path="contract-templates" element={<RoleRoute allowedRoles={['OWNER', 'MANAGER']}><FeatureRoute feature="CONTRACT_TEMPLATES"><ContractTemplates /></FeatureRoute></RoleRoute>} />
              <Route path="settings" element={<RoleRoute allowedRoles={['OWNER']}><Settings /></RoleRoute>} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
