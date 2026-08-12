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

  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
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
          <Route path="settings" element={<Settings />} />
          <Route path="tenants" element={<Tenants />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
