import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, BarChart2, Filter } from 'lucide-react';
import { getOrders, getOrderStatuses } from '../api/kanban';
import type { Order } from '../api/kanban';
import { getClients } from '../api/clients';
import type { Client } from '../api/clients';
import { getMaterials } from '../api/storage';
import type { Material } from '../api/storage';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import '../styles/clients.css'; 
import '../styles/reports.css'; 

export const Reports = () => {
  const { t } = useTranslation();
  const [orders, setOrders] = useState<Order[]>([]);
  const [completedStatusId, setCompletedStatusId] = useState<number | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [monthFilter, setMonthFilter] = useState('all'); // 'all' or 'YYYY-MM'

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [allOrders, statuses, allClients, allMaterials] = await Promise.all([
        getOrders(),
        getOrderStatuses(),
        getClients(),
        getMaterials()
      ]);

      const sortedStatuses = [...statuses].sort((a, b) => a.sortOrder - b.sortOrder);
      const finalStatus = sortedStatuses.length > 0 ? sortedStatuses[sortedStatuses.length - 1] : null;

      if (finalStatus) {
        setCompletedStatusId(finalStatus.id);
      }
      setOrders(allOrders);
      setClients(allClients);
      setMaterials(allMaterials);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const calculateMaterialsCost = (order: Order) => {
    if (!order.materials) return 0;
    return order.materials.reduce((sum, m) => {
      const mat = materials.find(x => x.id === m.materialId);
      return sum + (mat ? mat.costPrice * m.quantity : 0);
    }, 0);
  };

  const completedOrders = useMemo(() => {
    if (!completedStatusId) return [];
    return orders.filter(o => o.statusId === completedStatusId);
  }, [orders, completedStatusId]);

  const filteredOrders = useMemo(() => {
    return completedOrders.filter(order => {
      // Month filter
      if (monthFilter !== 'all') {
        const dateStr = order.createdAt || ''; // Fallback to createdAt or a completedAt field if you have one.
        const orderMonth = new Date(dateStr).toISOString().slice(0, 7); // YYYY-MM
        if (orderMonth !== monthFilter) return false;
      }
      
      // Search filter
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const clientName = (clients.find(c => c.id === order.clientId)?.name || '').toLowerCase();
        const address = (order.address || '').toLowerCase();
        
        if (!clientName.includes(term) && !address.includes(term)) {
          return false;
        }
      }
      return true;
    });
  }, [completedOrders, monthFilter, searchTerm, clients]);

  const chartData = useMemo(() => {
    // Group by month
    const dataMap: Record<string, { income: number; expenses: number; month: string }> = {};
    
    // Process ALL completed orders for the chart to show a trend over time, or just filtered?
    // Usually a chart shows the trend. Let's base it on filteredOrders so the chart responds to filters.
    // If "all" is selected, it shows all months. If a specific month is selected, it shows just that month.
    
    // However, a chart is better if it shows all time by month, and table is filtered.
    // Let's make the chart reflect the selected filter. If 'all', group by month.
    const sourceOrders = monthFilter === 'all' ? completedOrders : filteredOrders;
    
    sourceOrders.forEach(order => {
      const dateStr = order.createdAt || new Date().toISOString();
      const month = new Date(dateStr).toISOString().slice(0, 7); // YYYY-MM
      
      if (!dataMap[month]) {
        dataMap[month] = { month, income: 0, expenses: 0 };
      }
      
      const income = (order.totalPrice || 0) + (order.installationPrice || 0);
      const expenses = calculateMaterialsCost(order);
      
      dataMap[month].income += income;
      dataMap[month].expenses += expenses;
    });

    return Object.values(dataMap).sort((a, b) => a.month.localeCompare(b.month));
  }, [completedOrders, filteredOrders, monthFilter, materials]);

  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    completedOrders.forEach(o => {
      if (o.createdAt) {
        months.add(new Date(o.createdAt).toISOString().slice(0, 7));
      }
    });
    return Array.from(months).sort().reverse();
  }, [completedOrders]);

  const totalIncome = filteredOrders.reduce((sum, o) => sum + (o.totalPrice || 0) + (o.installationPrice || 0), 0);
  const totalExpenses = filteredOrders.reduce((sum, o) => sum + calculateMaterialsCost(o), 0);
  const totalProfit = totalIncome - totalExpenses;

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="reports-wrapper clients-wrapper">
      <div className="clients-header">
        <h1>{t('reports.title') || 'Отчеты'}</h1>
        
        <div className="clients-actions">
          <div className="search-input-wrapper">
            <Search className="search-icon" size={18} />
            <input 
              type="text" 
              placeholder={t('reports.searchPlaceholder') || 'Поиск по клиенту / адресу...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          
          <div className="search-input-wrapper">
            <Filter className="search-icon" size={18} />
            <select 
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="search-input"
              style={{ paddingLeft: '40px', backgroundColor: 'transparent', cursor: 'pointer' }}
            >
              <option value="all">{t('reports.allTime') || 'За все время'}</option>
              {availableMonths.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="reports-kpi-grid">
        <div className="reports-kpi-card glass-panel">
          <div className="reports-kpi-title">{t('reports.totalIncome') || 'Доходы'}</div>
          <div className="reports-kpi-value" style={{ color: 'var(--success)' }}>{totalIncome.toLocaleString()} ₽</div>
        </div>
        <div className="reports-kpi-card glass-panel">
          <div className="reports-kpi-title">{t('reports.totalExpenses') || 'Расходы'}</div>
          <div className="reports-kpi-value" style={{ color: 'var(--danger)' }}>{totalExpenses.toLocaleString()} ₽</div>
        </div>
        <div className="reports-kpi-card glass-panel">
          <div className="reports-kpi-title">{t('reports.totalProfit') || 'Прибыль'}</div>
          <div className="reports-kpi-value" style={{ color: 'var(--accent-primary)' }}>{totalProfit.toLocaleString()} ₽</div>
        </div>
      </div>

      {chartData.length > 0 && (
        <div className="reports-chart-card glass-panel">
          <div className="reports-chart-header">
            <BarChart2 size={20} style={{ display: 'inline', verticalAlign: 'middle', color: 'var(--accent-primary)' }} />
            <span>{t('reports.chartTitle') || 'График доходов и расходов'}</span>
          </div>
          <div style={{ flex: 1, minHeight: 0, minWidth: 0, width: '100%', overflow: 'hidden' }}>
            <ResponsiveContainer width="99%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="month" stroke="var(--text-secondary)" tick={{ fontSize: 12 }} />
                <YAxis stroke="var(--text-secondary)" tick={{ fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', borderRadius: '8px' }} 
                  itemStyle={{ color: 'var(--text-primary)' }}
                />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 4 }} />
                <Bar dataKey="income" name={t('reports.totalIncome') || 'Доходы'} fill="var(--success)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" name={t('reports.totalExpenses') || 'Расходы'} fill="var(--danger)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="reports-table-container clients-table-container glass-panel">
        <table className="clients-table">
          <thead>
            <tr>
              <th>{t('reports.columns.date') || 'Дата'}</th>
              <th>{t('reports.columns.client') || 'Клиент'}</th>
              <th>{t('reports.columns.address') || 'Адрес'}</th>
              <th style={{textAlign: 'right'}}>{t('reports.columns.income') || 'Доход'}</th>
              <th style={{textAlign: 'right'}}>{t('reports.columns.expenses') || 'Расход'}</th>
              <th style={{textAlign: 'right'}}>{t('reports.columns.profit') || 'Прибыль'}</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={6} style={{textAlign: 'center', opacity: 0.5}}>
                  Заказы не найдены.
                </td>
              </tr>
            ) : (
              filteredOrders.map(order => {
                const income = (order.totalPrice || 0) + (order.installationPrice || 0);
                const expenses = calculateMaterialsCost(order);
                const profit = income - expenses;
                const clientName = clients.find(c => c.id === order.clientId)?.name || 'Неизвестно';
                
                return (
                  <tr key={order.id}>
                    <td>{new Date(order.createdAt || '').toLocaleDateString('ru-RU')}</td>
                    <td>{clientName}</td>
                    <td>{order.address}</td>
                    <td style={{textAlign: 'right', color: 'var(--success)', fontWeight: 500}}>{income.toLocaleString()} ₽</td>
                    <td style={{textAlign: 'right', color: 'var(--danger)', fontWeight: 500}}>{expenses.toLocaleString()} ₽</td>
                    <td style={{textAlign: 'right', fontWeight: 'bold'}}>{profit.toLocaleString()} ₽</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
