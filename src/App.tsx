import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './components/DashboardLayout';
import Login from './pages/Login';
import Kanban from './pages/Kanban';
import { useEffect } from 'react';
import { useAppStore } from './store/useAppStore';
import './i18n';

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
        
        <Route path="/" element={<DashboardLayout />}>
          <Route index element={<Navigate to="/kanban" replace />} />
          <Route path="kanban" element={<Kanban />} />
          {/* add more routes later (clients, storage) */}
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
