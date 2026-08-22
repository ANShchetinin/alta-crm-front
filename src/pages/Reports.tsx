import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Search, BarChart2, FileText, Ruler, Target, TrendingUp, TrendingDown, 
  RussianRuble, Users, Tag, Calendar, ArrowRight
} from 'lucide-react';
import { getOrders, getOrderStatuses } from '../api/kanban';
import type { Order, OrderStatus } from '../api/kanban';
import { getClients } from '../api/clients';
import type { Client } from '../api/clients';
import { getMaterials } from '../api/storage';
import type { Material } from '../api/storage';
import { getEmployees } from '../api/employees';
import type { Employee } from '../api/employees';
import { getEmployeeInitials, getAvatarGradient } from './Employees';
import { useNavigate } from 'react-router-dom';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend 
} from 'recharts';
import '../styles/clients.css'; 
import '../styles/reports.css'; 

export const Reports = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [statuses, setStatuses] = useState<OrderStatus[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // Active view tab
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'LEAD_SOURCES' | 'EMPLOYEES' | 'ORDERS'>('OVERVIEW');

  // Filters
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  
  const [periodPreset, setPeriodPreset] = useState<'THIS_MONTH' | 'LAST_MONTH' | '3_MONTHS' | 'THIS_YEAR' | 'ALL' | 'CUSTOM'>('THIS_MONTH');
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [allOrders, statusesData, allClients, allMaterials, allEmployees] = await Promise.all([
        getOrders(),
        getOrderStatuses(),
        getClients(),
        getMaterials(),
        getEmployees()
      ]);

      setOrders(allOrders);
      setStatuses(statusesData.sort((a, b) => a.sortOrder - b.sortOrder));
      setClients(allClients);
      setMaterials(allMaterials);
      setEmployees(allEmployees);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Available months for dropdown
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    months.add(currentMonthStr);
    orders.forEach(o => {
      if (o.createdAt) {
        months.add(o.createdAt.slice(0, 7));
      }
      if (o.measurementDate) {
        months.add(o.measurementDate.slice(0, 7));
      }
    });
    return Array.from(months).sort().reverse();
  }, [orders, currentMonthStr]);

  // Calculate material cost for an order (services are excluded from expenses)
  const calculateMaterialsCost = (order: Order) => {
    if (!order.materials) return 0;
    return order.materials.reduce((sum, m) => {
      const mat = materials.find(x => x.id === m.materialId);
      if (!mat || mat.type === 'SERVICE') return sum;
      return sum + (mat.costPrice * m.quantity);
    }, 0);
  };

  // Check if order status is completed
  const isOrderCompleted = (order: Order) => {
    const st = statuses.find(s => s.id === order.statusId);
    if (!st || !st.name) return false;
    const name = st.name.trim().toLowerCase();
    return name.includes('заверш') || name.includes('готов') || name.includes('выполнен') || name.includes('complete');
  };

  // Filter orders by selected period & employee
  const filteredOrders = useMemo(() => {
    const today = new Date();
    
    return orders.filter(order => {
      // Employee filter (match assignee, measurer, or installer)
      if (selectedEmployeeId !== 'ALL') {
        const matchAssignee = order.assigneeId?.toString() === selectedEmployeeId;
        const matchMeasurer = order.measurerId?.toString() === selectedEmployeeId;
        const matchInstaller = order.installedById?.toString() === selectedEmployeeId;
        if (!matchAssignee && !matchMeasurer && !matchInstaller) {
          return false;
        }
      }

      // Search term filter
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const client = clients.find(c => c.id === order.clientId);
        const clientName = (client?.name || '').toLowerCase();
        const orderNum = (order.orderNumber || '').toLowerCase();
        const address = (order.address || '').toLowerCase();
        const leadSource = (client?.leadSource || '').toLowerCase();

        if (!clientName.includes(q) && !orderNum.includes(q) && !address.includes(q) && !leadSource.includes(q)) {
          return false;
        }
      }

      // Period filter
      const dateStr = order.createdAt || '';
      if (!dateStr) return false;
      const orderDate = new Date(dateStr);

      if (periodPreset === 'ALL') {
        return true;
      }

      if (periodPreset === 'THIS_MONTH') {
        return (
          orderDate.getFullYear() === today.getFullYear() &&
          orderDate.getMonth() === today.getMonth()
        );
      }

      if (periodPreset === 'LAST_MONTH') {
        const lastMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        return (
          orderDate.getFullYear() === lastMonthDate.getFullYear() &&
          orderDate.getMonth() === lastMonthDate.getMonth()
        );
      }

      if (periodPreset === '3_MONTHS') {
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(today.getMonth() - 3);
        return orderDate >= threeMonthsAgo;
      }

      if (periodPreset === 'THIS_YEAR') {
        return orderDate.getFullYear() === today.getFullYear();
      }

      if (periodPreset === 'CUSTOM') {
        const monthStr = dateStr.slice(0, 7);
        return monthStr === selectedMonth;
      }

      return true;
    });
  }, [orders, periodPreset, selectedMonth, selectedEmployeeId, searchTerm, clients]);

  // Contracts: orders with filled contract/order number
  const contracts = useMemo(() => {
    return filteredOrders.filter(o => Boolean(o.orderNumber && o.orderNumber.trim() !== ''));
  }, [filteredOrders]);

  // Completed contracts (for revenue and profit calculations)
  const completedContracts = useMemo(() => {
    return contracts.filter(isOrderCompleted);
  }, [contracts, statuses]);

  // Measurements: orders with assigned measurement date
  const measurements = useMemo(() => {
    return filteredOrders.filter(o => o.measurementDate != null);
  }, [filteredOrders]);

  // Key KPI Metrics Calculations
  const contractCount = contracts.length;
  const completedContractCount = completedContracts.length;
  const measurementCount = measurements.length;
  
  // CTR Conversion Rate (%)
  const conversionCTR = measurementCount > 0 
    ? Math.min(100, Math.round((contractCount / measurementCount) * 1000) / 10)
    : (contractCount > 0 ? 100 : 0);

  // Financial Metrics (Calculated ONLY from completed contracts)
  const totalRevenue = completedContracts.reduce((sum, o) => sum + (o.totalPrice || 0) + (o.installationPrice || 0), 0);
  const totalExpenses = completedContracts.reduce((sum, o) => sum + calculateMaterialsCost(o), 0);
  const totalProfit = totalRevenue - totalExpenses;

  const completedPrices = completedContracts.map(o => (o.totalPrice || 0) + (o.installationPrice || 0)).filter(p => p > 0);
  const avgCheck = completedContractCount > 0 && completedPrices.length > 0 ? Math.round(totalRevenue / completedPrices.length) : 0;
  const minCheck = completedPrices.length > 0 ? Math.min(...completedPrices) : 0;
  const maxCheck = completedPrices.length > 0 ? Math.max(...completedPrices) : 0;

  // Conversion Badge Color Helper
  const getConversionClass = (ctr: number) => {
    if (ctr >= 70) return 'high';
    if (ctr >= 45) return 'mid';
    return 'low';
  };

  // Daily Dynamics Chart Data (Grouped by Day/Month)
  const dailyDynamicsData = useMemo(() => {
    const dataMap: Record<string, { label: string; date: string; measurements: number; contracts: number; revenue: number }> = {};

    filteredOrders.forEach(order => {
      const dateStr = order.createdAt ? order.createdAt.slice(0, 10) : '';
      if (!dateStr) return;

      if (!dataMap[dateStr]) {
        const d = new Date(dateStr);
        const dayLabel = `${d.getDate()} ${d.toLocaleString('ru-RU', { month: 'short' })}`;
        dataMap[dateStr] = { label: dayLabel, date: dateStr, measurements: 0, contracts: 0, revenue: 0 };
      }

      if (order.measurementDate) {
        dataMap[dateStr].measurements += 1;
      }
      if (order.orderNumber && order.orderNumber.trim() !== '') {
        dataMap[dateStr].contracts += 1;
        if (isOrderCompleted(order)) {
          dataMap[dateStr].revenue += (order.totalPrice || 0) + (order.installationPrice || 0);
        }
      }
    });

    return Object.values(dataMap).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredOrders, statuses]);

  // Lead Sources Analytics
  const leadSourcesData = useMemo(() => {
    const sourceMap: Record<string, { source: string; measurements: number; contracts: number; completedCount: number; revenue: number; avgCheck: number; ctr: number }> = {};

    filteredOrders.forEach(order => {
      const client = clients.find(c => c.id === order.clientId);
      const source = client?.leadSource || 'Не указан';

      if (!sourceMap[source]) {
        sourceMap[source] = { source, measurements: 0, contracts: 0, completedCount: 0, revenue: 0, avgCheck: 0, ctr: 0 };
      }

      if (order.measurementDate) {
        sourceMap[source].measurements += 1;
      }
      if (order.orderNumber && order.orderNumber.trim() !== '') {
        sourceMap[source].contracts += 1;
        if (isOrderCompleted(order)) {
          sourceMap[source].revenue += (order.totalPrice || 0) + (order.installationPrice || 0);
          sourceMap[source].completedCount += 1;
        }
      }
    });

    return Object.values(sourceMap).map(s => {
      const ctr = s.measurements > 0 ? Math.min(100, Math.round((s.contracts / s.measurements) * 1000) / 10) : (s.contracts > 0 ? 100 : 0);
      const avg = s.completedCount > 0 ? Math.round(s.revenue / s.completedCount) : 0;
      return { ...s, ctr, avgCheck: avg };
    }).sort((a, b) => b.revenue - a.revenue);
  }, [filteredOrders, clients, statuses]);

  // Employee Performance Analytics
  const employeePerformanceData = useMemo(() => {
    const empMap: Record<string, { 
      id: number | string; 
      name: string; 
      position: string; 
      avatarUrl?: string;
      measurements: number; 
      installations: number;
      contracts: number; 
      completedCount: number;
      revenue: number; 
      ctr: number; 
      avgCheck: number 
    }> = {};

    // Initialize all existing employees
    employees.forEach(emp => {
      empMap[emp.id.toString()] = {
        id: emp.id,
        name: emp.name,
        position: emp.position || '—',
        avatarUrl: emp.avatarUrl,
        measurements: 0,
        installations: 0,
        contracts: 0,
        completedCount: 0,
        revenue: 0,
        ctr: 0,
        avgCheck: 0
      };
    });

    filteredOrders.forEach(order => {
      // 1. Замеры: учитываем сотрудника, указанного как Замерщик (measurerId), если не указан - ответственного (assigneeId)
      if (order.measurementDate) {
        const measurerId = order.measurerId || order.assigneeId;
        const mKey = measurerId ? measurerId.toString() : 'UNASSIGNED';
        if (!empMap[mKey]) {
          const emp = employees.find(e => e.id.toString() === mKey);
          empMap[mKey] = {
            id: mKey,
            name: emp ? emp.name : 'Не назначен',
            position: emp?.position || '—',
            avatarUrl: emp?.avatarUrl,
            measurements: 0,
            installations: 0,
            contracts: 0,
            completedCount: 0,
            revenue: 0,
            ctr: 0,
            avgCheck: 0
          };
        }
        empMap[mKey].measurements += 1;
      }

      // 2. Монтажи: учитываем сотрудника, указанного как Монтажник (installedById), если не указан - ответственного (assigneeId)
      if (order.installationDate || order.installedAt || isOrderCompleted(order)) {
        const installerId = order.installedById || (isOrderCompleted(order) ? order.assigneeId : undefined);
        if (installerId) {
          const iKey = installerId.toString();
          if (!empMap[iKey]) {
            const emp = employees.find(e => e.id.toString() === iKey);
            empMap[iKey] = {
              id: iKey,
              name: emp ? emp.name : 'Не назначен',
              position: emp?.position || '—',
              avatarUrl: emp?.avatarUrl,
              measurements: 0,
              installations: 0,
              contracts: 0,
              completedCount: 0,
              revenue: 0,
              ctr: 0,
              avgCheck: 0
            };
          }
          empMap[iKey].installations += 1;
        }
      }

      // 3. Договоры и Выручка: учитываем Ответственного (assigneeId), выручка считается ТОЛЬКО по завершенным
      if (order.orderNumber && order.orderNumber.trim() !== '') {
        const assigneeId = order.assigneeId;
        const aKey = assigneeId ? assigneeId.toString() : 'UNASSIGNED';
        if (!empMap[aKey]) {
          const emp = employees.find(e => e.id.toString() === aKey);
          empMap[aKey] = {
            id: aKey,
            name: emp ? emp.name : 'Не назначен',
            position: emp?.position || '—',
            avatarUrl: emp?.avatarUrl,
            measurements: 0,
            installations: 0,
            contracts: 0,
            completedCount: 0,
            revenue: 0,
            ctr: 0,
            avgCheck: 0
          };
        }
        empMap[aKey].contracts += 1;
        if (isOrderCompleted(order)) {
          empMap[aKey].revenue += (order.totalPrice || 0) + (order.installationPrice || 0);
          empMap[aKey].completedCount += 1;
        }
      }
    });

    return Object.values(empMap)
      .filter(e => e.measurements > 0 || e.installations > 0 || e.contracts > 0 || e.revenue > 0 || e.id !== 'UNASSIGNED')
      .map(e => {
        const ctr = e.measurements > 0 ? Math.min(100, Math.round((e.contracts / e.measurements) * 1000) / 10) : (e.contracts > 0 ? 100 : 0);
        const avg = e.completedCount > 0 ? Math.round(e.revenue / e.completedCount) : 0;
        return { ...e, ctr, avgCheck: avg };
      }).sort((a, b) => b.revenue - a.revenue || b.contracts - a.contracts || b.measurements - a.measurements || b.installations - a.installations);
  }, [filteredOrders, employees, statuses]);

  if (loading) {
    return <div className="p-8" style={{ color: 'var(--text-secondary)' }}>Загрузка аналитики...</div>;
  }

  return (
    <div className="reports-wrapper">
      {/* Header & Main Filters */}
      <div className="reports-header">
        <div className="reports-header-title">
          <h1>{t('reports.title', 'Отчеты и Бизнес-аналитика')}</h1>
          <p>
            Статистика договоров, замеров, конверсии (CTR) и финансовых показателей
          </p>
        </div>

        <div className="clients-actions" style={{ flexWrap: 'wrap' }}>
          {/* Search */}
          <div className="search-input-wrapper" style={{ minWidth: '220px' }}>
            <Search className="search-icon" size={16} />
            <input 
              type="text" 
              placeholder="Поиск по номеру, клиенту..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          {/* Employee Filter */}
          <div className="custom-select-wrapper" style={{ width: 'auto', minWidth: '180px' }}>
            <select
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              className="custom-select"
              style={{ fontSize: '0.85rem', height: '38px' }}
            >
              <option value="ALL">Все сотрудники</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id.toString()}>{emp.name} ({emp.position})</option>
              ))}
            </select>
          </div>

          {/* Custom Month Dropdown */}
          {periodPreset === 'CUSTOM' && (
            <div className="custom-select-wrapper" style={{ width: 'auto', minWidth: '140px' }}>
              <select 
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="custom-select"
                style={{ fontSize: '0.85rem', height: '38px' }}
              >
                {availableMonths.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Period Filter Buttons */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          onClick={() => setPeriodPreset('THIS_MONTH')}
          className={`btn btn-sm ${periodPreset === 'THIS_MONTH' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ fontSize: '0.8rem', height: '32px' }}
        >
          <Calendar size={14} /> Этот месяц
        </button>
        <button
          onClick={() => setPeriodPreset('LAST_MONTH')}
          className={`btn btn-sm ${periodPreset === 'LAST_MONTH' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ fontSize: '0.8rem', height: '32px' }}
        >
          Прошлый месяц
        </button>
        <button
          onClick={() => setPeriodPreset('3_MONTHS')}
          className={`btn btn-sm ${periodPreset === '3_MONTHS' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ fontSize: '0.8rem', height: '32px' }}
        >
          3 месяца
        </button>
        <button
          onClick={() => setPeriodPreset('THIS_YEAR')}
          className={`btn btn-sm ${periodPreset === 'THIS_YEAR' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ fontSize: '0.8rem', height: '32px' }}
        >
          За год
        </button>
        <button
          onClick={() => setPeriodPreset('ALL')}
          className={`btn btn-sm ${periodPreset === 'ALL' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ fontSize: '0.8rem', height: '32px' }}
        >
          За все время
        </button>
        <button
          onClick={() => setPeriodPreset('CUSTOM')}
          className={`btn btn-sm ${periodPreset === 'CUSTOM' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ fontSize: '0.8rem', height: '32px' }}
        >
          Выбрать месяц...
        </button>
      </div>

      {/* 6 Key KPI Cards */}
      <div className="reports-kpi-grid-6">
        {/* 1. Contracts */}
        <div className="reports-kpi-card glass-panel">
          <div className="reports-kpi-header">
            <span className="reports-kpi-title">Договоры</span>
            <div className="reports-kpi-icon-wrap" style={{ background: 'rgba(59, 130, 246, 0.12)', color: 'var(--accent-primary)' }}>
              <FileText size={16} />
            </div>
          </div>
          <div className="reports-kpi-value" style={{ color: 'var(--accent-primary)' }}>
            {contractCount} <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-secondary)' }}>дог.</span>
          </div>
          <div className="reports-kpi-subtext">
            Выручка: <strong>{totalRevenue.toLocaleString()} ₽</strong>
          </div>
        </div>

        {/* 2. Measurements */}
        <div className="reports-kpi-card glass-panel">
          <div className="reports-kpi-header">
            <span className="reports-kpi-title">Замеры</span>
            <div className="reports-kpi-icon-wrap" style={{ background: 'rgba(168, 85, 247, 0.12)', color: '#a855f7' }}>
              <Ruler size={16} />
            </div>
          </div>
          <div className="reports-kpi-value" style={{ color: '#a855f7' }}>
            {measurementCount} <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-secondary)' }}>зам.</span>
          </div>
          <div className="reports-kpi-subtext">
            Проведено / назначено
          </div>
        </div>

        {/* 3. Conversion CTR */}
        <div className="reports-kpi-card glass-panel">
          <div className="reports-kpi-header">
            <span className="reports-kpi-title">Конверсия CTR</span>
            <div className="reports-kpi-icon-wrap" style={{ background: 'rgba(34, 197, 94, 0.12)', color: 'var(--success)' }}>
              <Target size={16} />
            </div>
          </div>
          <div className="reports-kpi-value" style={{ color: conversionCTR >= 70 ? 'var(--success)' : (conversionCTR >= 45 ? '#facc15' : 'var(--danger)') }}>
            {conversionCTR}%
          </div>
          <div className="reports-kpi-subtext">
            Соотношение Замер ➔ Договор
          </div>
        </div>

        {/* 4. Average Check */}
        <div className="reports-kpi-card glass-panel">
          <div className="reports-kpi-header">
            <span className="reports-kpi-title">Средний чек</span>
            <div className="reports-kpi-icon-wrap" style={{ background: 'rgba(234, 179, 8, 0.12)', color: '#eab308' }}>
              <RussianRuble size={16} />
            </div>
          </div>
          <div className="reports-kpi-value" style={{ color: '#eab308' }}>
            {avgCheck.toLocaleString()} <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>₽</span>
          </div>
          <div className="reports-kpi-subtext">
            Средняя сумма договора
          </div>
        </div>

        {/* 5. Min Contract */}
        <div className="reports-kpi-card glass-panel">
          <div className="reports-kpi-header">
            <span className="reports-kpi-title">Мин. договор</span>
            <div className="reports-kpi-icon-wrap" style={{ background: 'rgba(239, 68, 68, 0.12)', color: 'var(--danger)' }}>
              <TrendingDown size={16} />
            </div>
          </div>
          <div className="reports-kpi-value" style={{ color: 'var(--text-primary)' }}>
            {minCheck.toLocaleString()} <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-secondary)' }}>₽</span>
          </div>
          <div className="reports-kpi-subtext">
            Минимальная сумма
          </div>
        </div>

        {/* 6. Max Contract */}
        <div className="reports-kpi-card glass-panel">
          <div className="reports-kpi-header">
            <span className="reports-kpi-title">Макс. договор</span>
            <div className="reports-kpi-icon-wrap" style={{ background: 'rgba(34, 197, 94, 0.12)', color: 'var(--success)' }}>
              <TrendingUp size={16} />
            </div>
          </div>
          <div className="reports-kpi-value" style={{ color: 'var(--success)' }}>
            {maxCheck.toLocaleString()} <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>₽</span>
          </div>
          <div className="reports-kpi-subtext">
            Максимальная сумма
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="reports-tabs-nav">
        <button
          onClick={() => setActiveTab('OVERVIEW')}
          className={`reports-tab-btn ${activeTab === 'OVERVIEW' ? 'active' : ''}`}
        >
          <BarChart2 size={16} /> Обзор и графики
        </button>
        <button
          onClick={() => setActiveTab('LEAD_SOURCES')}
          className={`reports-tab-btn ${activeTab === 'LEAD_SOURCES' ? 'active' : ''}`}
        >
          <Tag size={16} /> Источники лидов ({leadSourcesData.length})
        </button>
        <button
          onClick={() => setActiveTab('EMPLOYEES')}
          className={`reports-tab-btn ${activeTab === 'EMPLOYEES' ? 'active' : ''}`}
        >
          <Users size={16} /> Сотрудники и Замерщики ({employeePerformanceData.length})
        </button>
        <button
          onClick={() => setActiveTab('ORDERS')}
          className={`reports-tab-btn ${activeTab === 'ORDERS' ? 'active' : ''}`}
        >
          <FileText size={16} /> Все договоры ({contracts.length})
        </button>
      </div>

      {/* Tab 1: Overview & Interactive Charts */}
      {activeTab === 'OVERVIEW' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="reports-charts-grid">
            {/* Chart 1: Measurements vs Contracts Dynamics */}
            <div className="reports-chart-card glass-panel">
              <div className="reports-chart-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Target size={18} style={{ color: 'var(--accent-primary)' }} />
                  <span>Динамика: Замеры vs Заключенные договоры</span>
                </div>
                <span className={`reports-badge-conversion ${getConversionClass(conversionCTR)}`}>
                  CTR {conversionCTR}%
                </span>
              </div>
              <div style={{ flex: 1, minHeight: 0, width: '100%', overflow: 'hidden' }}>
                {dailyDynamicsData.length === 0 ? (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>
                    Нет данных за выбранный период
                  </div>
                ) : (
                  <ResponsiveContainer width="99%" height="100%">
                    <BarChart data={dailyDynamicsData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis dataKey="label" stroke="var(--text-secondary)" tick={{ fontSize: 11 }} />
                      <YAxis stroke="var(--text-secondary)" tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', borderRadius: '8px' }} 
                        itemStyle={{ color: 'var(--text-primary)' }}
                      />
                      <Legend wrapperStyle={{ fontSize: 12, paddingTop: 4 }} />
                      <Bar dataKey="measurements" name="Замеры" fill="#a855f7" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="contracts" name="Заключено договоров" fill="var(--success)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Chart 2: Revenue & Expenses */}
            <div className="reports-chart-card glass-panel">
              <div className="reports-chart-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <RussianRuble size={18} style={{ color: 'var(--success)' }} />
                  <span>Финансовые результаты за период</span>
                </div>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Прибыль: <strong style={{ color: 'var(--accent-primary)' }}>{totalProfit.toLocaleString()} ₽</strong>
                </span>
              </div>
              <div style={{ flex: 1, minHeight: 0, width: '100%', overflow: 'hidden' }}>
                {dailyDynamicsData.length === 0 ? (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>
                    Нет данных за выбранный период
                  </div>
                ) : (
                  <ResponsiveContainer width="99%" height="100%">
                    <BarChart data={dailyDynamicsData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis dataKey="label" stroke="var(--text-secondary)" tick={{ fontSize: 11 }} />
                      <YAxis stroke="var(--text-secondary)" tick={{ fontSize: 11 }} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', borderRadius: '8px' }} 
                        itemStyle={{ color: 'var(--text-primary)' }}
                        formatter={(val: any) => [`${Number(val || 0).toLocaleString()} ₽`, 'Выручка']}
                      />
                      <Bar dataKey="revenue" name="Выручка (₽)" fill="var(--accent-primary)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Lead Sources Table */}
      {activeTab === 'LEAD_SOURCES' && (
        <div className="reports-table-container glass-panel">
          <table className="clients-table">
            <thead>
              <tr>
                <th>Источник лида</th>
                <th style={{ textAlign: 'center' }}>Замеров</th>
                <th style={{ textAlign: 'center' }}>Договоров</th>
                <th style={{ textAlign: 'center' }}>Конверсия (CTR)</th>
                <th style={{ textAlign: 'right' }}>Выручка</th>
                <th style={{ textAlign: 'right' }}>Средний чек</th>
              </tr>
            </thead>
            <tbody>
              {leadSourcesData.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', opacity: 0.5, padding: '32px' }}>
                    Нет данных по источникам за выбранный период.
                  </td>
                </tr>
              ) : (
                leadSourcesData.map(item => (
                  <tr key={item.source}>
                    <td>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontWeight: 600,
                        padding: '4px 10px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'rgba(59, 130, 246, 0.1)',
                        border: '1px solid rgba(59, 130, 246, 0.25)',
                        color: '#60a5fa'
                      }}>
                        <Tag size={13} /> {item.source}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 500 }}>{item.measurements}</td>
                    <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--accent-primary)' }}>{item.contracts}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`reports-badge-conversion ${getConversionClass(item.ctr)}`}>
                        {item.ctr}%
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--success)' }}>
                      {item.revenue.toLocaleString()} ₽
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>
                      {item.avgCheck.toLocaleString()} ₽
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 3: Employees Performance Table */}
      {activeTab === 'EMPLOYEES' && (
        <div className="reports-table-container glass-panel">
          <table className="clients-table">
            <thead>
              <tr>
                <th>Сотрудник</th>
                <th>Должность</th>
                <th style={{ textAlign: 'center' }}>Замеров</th>
                <th style={{ textAlign: 'center' }}>Монтажей</th>
                <th style={{ textAlign: 'center' }}>Договоров</th>
                <th style={{ textAlign: 'center' }}>Конверсия (CTR)</th>
                <th style={{ textAlign: 'right' }}>Выручка (завершенные)</th>
                <th style={{ textAlign: 'right' }}>Средний чек</th>
              </tr>
            </thead>
            <tbody>
              {employeePerformanceData.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', opacity: 0.5, padding: '32px' }}>
                    Нет данных по сотрудникам за выбранный период.
                  </td>
                </tr>
              ) : (
                employeePerformanceData.map(emp => (
                  <tr key={emp.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 600 }}>
                        <div style={{ 
                          width: '32px', 
                          height: '32px', 
                          borderRadius: '50%', 
                          overflow: 'hidden',
                          background: emp.avatarUrl ? 'transparent' : getAvatarGradient(emp.name), 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          color: '#fff',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          flexShrink: 0,
                          boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
                        }}>
                          {emp.avatarUrl ? (
                            <img src={emp.avatarUrl} alt={emp.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            getEmployeeInitials(emp.name)
                          )}
                        </div>
                        <span>{emp.name}</span>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{emp.position}</span>
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 600, color: emp.measurements > 0 ? '#a855f7' : 'inherit' }}>
                      {emp.measurements}
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 600, color: emp.installations > 0 ? '#22c55e' : 'inherit' }}>
                      {emp.installations}
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--accent-primary)' }}>
                      {emp.contracts}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`reports-badge-conversion ${getConversionClass(emp.ctr)}`}>
                        {emp.ctr}%
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--success)' }}>
                      {emp.revenue.toLocaleString()} ₽
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>
                      {emp.avgCheck.toLocaleString()} ₽
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 4: Detail Contracts List */}
      {activeTab === 'ORDERS' && (
        <div className="reports-table-container glass-panel">
          <table className="clients-table">
            <thead>
              <tr>
                <th>№ Заявки</th>
                <th>№ Договора</th>
                <th>Клиент</th>
                <th>Адрес</th>
                <th>Замер</th>
                <th>Статус</th>
                <th style={{ textAlign: 'right' }}>Сумма</th>
                <th style={{ textAlign: 'right' }}>Действие</th>
              </tr>
            </thead>
            <tbody>
              {contracts.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', opacity: 0.5, padding: '32px' }}>
                    Договоры за выбранный период не найдены.
                  </td>
                </tr>
              ) : (
                contracts.map(order => {
                  const client = clients.find(c => c.id === order.clientId);
                  const currentStatus = statuses.find(s => s.id === order.statusId);
                  const orderSum = (order.totalPrice || 0) + (order.installationPrice || 0);

                  return (
                    <tr key={order.id}>
                      <td>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', background: 'rgba(255, 255, 255, 0.05)', padding: '2px 6px', borderRadius: '4px' }}>
                          #{order.id}
                        </span>
                      </td>
                      <td>
                        <strong style={{ fontFamily: 'monospace', color: '#4ade80' }}>
                          № {order.orderNumber}
                        </strong>
                      </td>
                      <td>
                        <div>
                          <div style={{ fontWeight: 500 }}>{client?.name || '—'}</div>
                          {client?.phone && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                              {client.phone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td>{order.address || '—'}</td>
                      <td>
                        {order.measurementDate ? (
                          <span style={{ fontSize: '0.85rem', color: '#a855f7', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Ruler size={13} /> {new Date(order.measurementDate).toLocaleDateString('ru-RU')}
                          </span>
                        ) : '—'}
                      </td>
                      <td>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <span 
                            style={{ 
                              width: '8px', 
                              height: '8px', 
                              borderRadius: '50%', 
                              backgroundColor: currentStatus?.color || '#3b82f6',
                              flexShrink: 0
                            }} 
                          />
                          <span style={{ fontSize: '0.85rem' }}>{currentStatus?.name || '—'}</span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--success)' }}>
                        {orderSum.toLocaleString()} ₽
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button 
                          onClick={() => navigate(`/?orderId=${order.id}`)}
                          className="action-btn"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', fontSize: '0.8rem' }}
                          title="Перейти в Канбан к заявке"
                        >
                          Перейти <ArrowRight size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Reports;
