import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './components/DashboardLayout';
import Login from './pages/Login';
import Kanban from './pages/Kanban';

function App() {
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
