import { useState, useEffect, useMemo } from 'react';
import { 
  Archive as ArchiveIcon, 
  Search, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  Building2, 
  Phone, 
  MapPin, 
  Eye, 
  FileText, 
  Download, 
  FileCheck, 
  RotateCcw, 
  Trash2,
  X, 
  MessageCircle,
  Send,
  Calculator,
  Layers,
  Calendar,
  CalendarDays,
  User,
  Tag
} from 'lucide-react';
import { 
  getArchivedOrders, 
  getOrderStatuses, 
  updateOrder, 
  deleteOrder,
  downloadContractDocx, 
  downloadContractPdf, 
  type Order, 
  type OrderStatus 
} from '../api/kanban';
import { getClients, type Client } from '../api/clients';
import { getEmployees, type Employee } from '../api/employees';
import { getMeasurementByOrderId, type MeasurementDto } from '../api/measurements';
import { useAppStore } from '../store/useAppStore';
import { useAuthStore } from '../store/useAuthStore';
import { formatDateTimeInTimezone, formatDateInTimezone } from '../utils/dateUtils';
import { getAvatarGradient, getClientInitials } from '../utils/avatarUtils';
import { getWhatsAppLink, getTelegramLink } from '../utils/messengerUtils';
import { getYandexMapsUrl, get2GisUrl } from '../utils/navigation';
import '../styles/clients.css';

type SortField = 'installedAt' | 'createdAt' | 'orderNumber' | 'totalPrice' | 'clientName';
type SortDirection = 'asc' | 'desc';

export const Archive = () => {
  const { role } = useAuthStore();
  const isWorker = role === 'WORKER';
  const { tenantSettings } = useAppStore();

  const [orders, setOrders] = useState<Order[]>([]);
  const [statuses, setStatuses] = useState<OrderStatus[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState<string>('ALL');
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('ALL');
  const [selectedStatusId, setSelectedStatusId] = useState<string>('ALL');

  // Sorting State
  const [sortField, setSortField] = useState<SortField>('installedAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Detail Modal State
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [orderMeasurement, setOrderMeasurement] = useState<MeasurementDto | null>(null);
  const [loadingMeasurement, setLoadingMeasurement] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [archivedData, statusesData, clientsData, employeesData] = await Promise.all([
        getArchivedOrders().catch(() => []),
        getOrderStatuses().catch(() => []),
        !isWorker ? getClients().catch(() => []) : Promise.resolve([]),
        !isWorker ? getEmployees().catch(() => []) : Promise.resolve([])
      ]);
      setOrders(archivedData);
      setStatuses(statusesData);
      setClients(clientsData);
      setEmployees(employeesData);
    } catch (err) {
      console.error("Failed to load archive data", err);
    } finally {
      setLoading(false);
    }
  };

  // Extract available years for filter
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    orders.forEach(o => {
      const dateStr = o.installedAt || o.createdAt;
      if (dateStr) {
        const year = new Date(dateStr).getFullYear().toString();
        years.add(year);
      }
    });
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [orders]);

  const monthsList = [
    { value: '0', label: 'Январь' },
    { value: '1', label: 'Февраль' },
    { value: '2', label: 'Март' },
    { value: '3', label: 'Апрель' },
    { value: '4', label: 'Май' },
    { value: '5', label: 'Июнь' },
    { value: '6', label: 'Июль' },
    { value: '7', label: 'Август' },
    { value: '8', label: 'Сентябрь' },
    { value: '9', label: 'Октябрь' },
    { value: '10', label: 'Ноябрь' },
    { value: '11', label: 'Декабрь' }
  ];

  // Filtering Logic
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const client = clients.find(c => c.id === order.clientId);
        const employee = employees.find(e => e.id === (order.installedById || order.assigneeId));
        
        const numMatch = order.orderNumber?.toLowerCase().includes(q) || false;
        const idMatch = order.id.toString() === q || `№${order.id}` === q;
        const clientMatch = (order.clientName || client?.name || '').toLowerCase().includes(q);
        const phoneMatch = (order.clientPhone || client?.phone || '').includes(q);
        const addrMatch = (order.address || '').toLowerCase().includes(q);
        const descMatch = (order.description || '').toLowerCase().includes(q);
        const empMatch = (order.installedByName || order.assigneeName || employee?.name || '').toLowerCase().includes(q);

        if (!numMatch && !idMatch && !clientMatch && !phoneMatch && !addrMatch && !descMatch && !empMatch) {
          return false;
        }
      }

      // 2. Year Filter
      const targetDate = order.installedAt ? new Date(order.installedAt) : (order.createdAt ? new Date(order.createdAt) : null);
      if (selectedYear !== 'ALL' && targetDate) {
        if (targetDate.getFullYear().toString() !== selectedYear) {
          return false;
        }
      }

      // 3. Month Filter
      if (selectedMonth !== 'ALL' && targetDate) {
        if (targetDate.getMonth().toString() !== selectedMonth) {
          return false;
        }
      }

      // 4. Employee Filter
      if (selectedEmployeeId !== 'ALL') {
        const empId = Number(selectedEmployeeId);
        const matchesEmployee = order.installedById === empId || order.assigneeId === empId || order.measurerId === empId;
        if (!matchesEmployee) {
          return false;
        }
      }

      // 5. Status Filter
      if (selectedStatusId !== 'ALL') {
        if (order.statusId !== Number(selectedStatusId)) {
          return false;
        }
      }

      return true;
    });
  }, [orders, searchQuery, selectedYear, selectedMonth, selectedEmployeeId, selectedStatusId, clients, employees]);

  // Sorting Logic
  const sortedOrders = useMemo(() => {
    return [...filteredOrders].sort((a, b) => {
      let comparison = 0;
      if (sortField === 'installedAt') {
        const timeA = a.installedAt ? new Date(a.installedAt).getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
        const timeB = b.installedAt ? new Date(b.installedAt).getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
        comparison = timeA - timeB;
      } else if (sortField === 'createdAt') {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        comparison = timeA - timeB;
      } else if (sortField === 'orderNumber') {
        const numA = a.orderNumber || `#${a.id}`;
        const numB = b.orderNumber || `#${b.id}`;
        comparison = numA.localeCompare(numB);
      } else if (sortField === 'totalPrice') {
        const priceA = a.totalPrice || 0;
        const priceB = b.totalPrice || 0;
        comparison = priceA - priceB;
      } else if (sortField === 'clientName') {
        const nameA = a.clientName || '';
        const nameB = b.clientName || '';
        comparison = nameA.localeCompare(nameB);
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredOrders, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc'); // default to newest / highest
    }
  };

  const hasActiveFilters = searchQuery.trim() !== '' || selectedYear !== 'ALL' || selectedMonth !== 'ALL' || selectedEmployeeId !== 'ALL' || selectedStatusId !== 'ALL';

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchQuery.trim()) count++;
    if (selectedYear !== 'ALL') count++;
    if (selectedMonth !== 'ALL') count++;
    if (selectedEmployeeId !== 'ALL') count++;
    if (selectedStatusId !== 'ALL') count++;
    return count;
  }, [searchQuery, selectedYear, selectedMonth, selectedEmployeeId, selectedStatusId]);

  const totalFilteredSum = useMemo(() => {
    return filteredOrders.reduce((sum, o) => sum + (o.totalPrice || 0), 0);
  }, [filteredOrders]);

  const handleOpenDetail = async (order: Order) => {
    setSelectedOrder(order);
    setIsDetailModalOpen(true);
    setOrderMeasurement(null);

    try {
      setLoadingMeasurement(true);
      const measurement = await getMeasurementByOrderId(order.id);
      setOrderMeasurement(measurement);
    } catch {
      // Measurement might not exist for this order
      setOrderMeasurement(null);
    } finally {
      setLoadingMeasurement(false);
    }
  };

  const handleCloseDetail = () => {
    setSelectedOrder(null);
    setIsDetailModalOpen(false);
    setOrderMeasurement(null);
  };

  const handleReturnToKanban = async (targetStatusId: number) => {
    if (!selectedOrder) return;
    if (!window.confirm('Вернуть эту заявку из архива в работу на Канбан?')) return;

    try {
      setActionLoading(true);
      await updateOrder(selectedOrder.id, {
        ...selectedOrder,
        statusId: targetStatusId
      });
      alert('Заявка успешно возвращена на Канбан-доску');
      handleCloseDetail();
      fetchData();
    } catch (err: any) {
      alert('Ошибка при возврате заявки: ' + (err.response?.data?.message || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteOrder = async (orderId: number, orderNumber?: string | null) => {
    const label = orderNumber || `№${orderId}`;
    if (!window.confirm(`Вы уверены, что хотите безвозвратно удалить заявку ${label}?`)) {
      return;
    }

    try {
      setActionLoading(true);
      await deleteOrder(orderId);
      if (selectedOrder?.id === orderId) {
        handleCloseDetail();
      }
      fetchData();
    } catch (err: any) {
      alert('Ошибка при удалении заявки: ' + (err.response?.data?.message || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDownloadDocx = async (orderId: number) => {
    try {
      const blob = await downloadContractDocx(orderId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Договор_${orderId}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Ошибка при скачивании договора DOCX');
    }
  };

  const handleDownloadPdf = async (orderId: number) => {
    try {
      const blob = await downloadContractPdf(orderId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Договор_${orderId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Ошибка при скачивании договора PDF');
    }
  };

  const handleExportCsv = () => {
    if (sortedOrders.length === 0) {
      alert('Нет данных для экспорта');
      return;
    }

    const headers = ['№', 'Номер заявки', 'Дата завершения', 'Клиент', 'Телефон', 'Адрес', 'Сумма (₽)', 'Предоплата (₽)', 'Остаток (₽)', 'Исполнитель', 'Статус'];
    const rows = sortedOrders.map(o => [
      o.id,
      o.orderNumber || '',
      o.installedAt ? formatDateTimeInTimezone(o.installedAt, tenantSettings?.timezone) : '',
      o.clientName || '',
      o.clientPhone || '',
      `"${(o.address || '').replace(/"/g, '""')}"`,
      o.totalPrice || 0,
      o.prepayment || 0,
      o.remainder || 0,
      o.installedByName || o.assigneeName || '',
      statuses.find(s => s.id === o.statusId)?.name || ''
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Архив_заявок_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedYear('ALL');
    setSelectedMonth('ALL');
    setSelectedEmployeeId('ALL');
    setSelectedStatusId('ALL');
  };

  return (
    <div className="clients-wrapper">
      {/* Header */}
      <div className="clients-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(147, 51, 234, 0.2))',
            border: '1px solid var(--glass-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent-primary)'
          }}>
            <ArchiveIcon size={22} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
              Архив заявок
            </h1>
            <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Выполненные заявки за предыдущие месяцы (отсортированы по дате завершения)
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={handleExportCsv}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            title="Экспорт отфильтрованных строк в CSV"
          >
            <Download size={16} /> Экспорт CSV
          </button>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="archive-filters-panel">
        {/* Search Row */}
        <div className="archive-search-row">
          <div className="archive-search-box">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Поиск по номеру, клиенту, телефону, адресу, сотруднику..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="archive-search-input"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="archive-search-clear"
                title="Очистить поиск"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="btn-archive-reset"
              title="Сбросить все фильтры"
            >
              <RotateCcw size={14} />
              <span>Сбросить ({activeFiltersCount})</span>
            </button>
          )}
        </div>

        {/* Dropdown Filters Row */}
        <div className="archive-filters-row">
          {/* Year */}
          <div className={`archive-filter-pill ${selectedYear !== 'ALL' ? 'active' : ''}`}>
            <Calendar size={14} className="filter-pill-icon" />
            <span className="filter-pill-label">Год:</span>
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(e.target.value)}
              className="archive-select"
            >
              <option value="ALL">Все годы</option>
              {availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          {/* Month */}
          <div className={`archive-filter-pill ${selectedMonth !== 'ALL' ? 'active' : ''}`}>
            <CalendarDays size={14} className="filter-pill-icon" />
            <span className="filter-pill-label">Месяц:</span>
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="archive-select"
            >
              <option value="ALL">Все месяцы</option>
              {monthsList.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          {/* Employee */}
          {!isWorker && employees.length > 0 && (
            <div className={`archive-filter-pill ${selectedEmployeeId !== 'ALL' ? 'active' : ''}`}>
              <User size={14} className="filter-pill-icon" />
              <span className="filter-pill-label">Сотрудник:</span>
              <select
                value={selectedEmployeeId}
                onChange={e => setSelectedEmployeeId(e.target.value)}
                className="archive-select"
              >
                <option value="ALL">Все сотрудники</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Status */}
          {statuses.length > 0 && (
            <div className={`archive-filter-pill ${selectedStatusId !== 'ALL' ? 'active' : ''}`}>
              <Tag size={14} className="filter-pill-icon" />
              <span className="filter-pill-label">Статус:</span>
              <select
                value={selectedStatusId}
                onChange={e => setSelectedStatusId(e.target.value)}
                className="archive-select"
              >
                <option value="ALL">Все статусы</option>
                {statuses.map(st => (
                  <option key={st.id} value={st.id}>{st.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Sorting */}
          <div className="archive-filter-pill sort-pill" style={{ marginLeft: 'auto' }}>
            <ArrowUpDown size={14} className="filter-pill-icon" />
            <span className="filter-pill-label">Сортировка:</span>
            <select
              value={sortField}
              onChange={e => setSortField(e.target.value as SortField)}
              className="archive-select"
            >
              <option value="installedAt">По дате завершения</option>
              <option value="createdAt">По дате создания</option>
              <option value="totalPrice">По стоимости</option>
              <option value="clientName">По клиенту</option>
              <option value="orderNumber">По номеру</option>
            </select>
            <button
              type="button"
              onClick={() => setSortDirection(d => d === 'asc' ? 'desc' : 'asc')}
              className="btn-sort-dir"
              title={sortDirection === 'asc' ? 'По возрастанию' : 'По убыванию'}
            >
              {sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
            </button>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="archive-stats-bar">
          <div>
            Найдено: <strong>{filteredOrders.length}</strong> из {orders.length} заявок
            {hasActiveFilters && (
              <span style={{ color: 'var(--accent-primary)', marginLeft: '8px' }}>
                (применены фильтры: {activeFiltersCount})
              </span>
            )}
          </div>
          {filteredOrders.length > 0 && !isWorker && (
            <div>
              Общая сумма: <strong style={{ color: 'var(--text-primary)', fontSize: '0.95rem' }}>{totalFilteredSum.toLocaleString('ru-RU')} ₽</strong>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area: Loading / Empty / Desktop Table & Mobile Cards */}
      {loading ? (
        <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)', borderRadius: 'var(--radius-md)' }}>
          Загрузка архивных заявок...
        </div>
      ) : sortedOrders.length === 0 ? (
        <div className="glass-panel" style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-secondary)', borderRadius: 'var(--radius-md)' }}>
          <ArchiveIcon size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
          <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            {orders.length === 0 ? 'Архив заявок пуст' : 'По выбранным фильтрам ничего не найдено'}
          </div>
          <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>
            {orders.length === 0 
              ? 'Заявки автоматически перемещаются в архив после завершения за предыдущие месяцы'
              : 'Попробуйте изменить параметры поиска или сбросить фильтры'}
          </p>
        </div>
      ) : (
        <>
          {/* 1. Desktop Table View */}
          <div className="table-responsive glass-panel archive-desktop-table" style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
            <table className="clients-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort('orderNumber')} style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>Номер</span>
                      {sortField === 'orderNumber' ? (
                        sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                      ) : (
                        <ArrowUpDown size={14} style={{ opacity: 0.4 }} />
                      )}
                    </div>
                  </th>
                  <th onClick={() => handleSort('installedAt')} style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>Дата завершения</span>
                      {sortField === 'installedAt' ? (
                        sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                      ) : (
                        <ArrowUpDown size={14} style={{ opacity: 0.4 }} />
                      )}
                    </div>
                  </th>
                  <th onClick={() => handleSort('clientName')} style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>Клиент</span>
                      {sortField === 'clientName' ? (
                        sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                      ) : (
                        <ArrowUpDown size={14} style={{ opacity: 0.4 }} />
                      )}
                    </div>
                  </th>
                  <th>Адрес объекта</th>
                  <th>Исполнитель</th>
                  {!isWorker && (
                    <th onClick={() => handleSort('totalPrice')} style={{ cursor: 'pointer', textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                        <span>Сумма сделки</span>
                        {sortField === 'totalPrice' ? (
                          sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                        ) : (
                          <ArrowUpDown size={14} style={{ opacity: 0.4 }} />
                        )}
                      </div>
                    </th>
                  )}
                  <th>Статус</th>
                  <th style={{ textAlign: 'right' }}>Действия</th>
                </tr>
              </thead>
              <tbody>
                {sortedOrders.map(order => {
                  const client = clients.find(c => c.id === order.clientId);
                  const status = statuses.find(s => s.id === order.statusId);
                  const isLegal = (order.clientType || client?.clientType) === 'LEGAL_ENTITY';
                  const cAvatar = order.clientAvatarUrl || client?.avatarUrl;
                  const cName = order.clientName || client?.name || `Клиент #${order.clientId}`;
                  const cPhone = order.clientPhone || client?.phone;
                  const installerName = order.installedByName || order.assigneeName || '—';

                  return (
                    <tr 
                      key={order.id}
                      onClick={() => handleOpenDetail(order)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 700, color: 'var(--accent-primary)', fontSize: '0.92rem' }}>
                            {order.orderNumber || `#${order.id}`}
                          </span>
                          {order.orderNumber && (
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                              ID: {order.id}
                            </span>
                          )}
                        </div>
                      </td>

                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.86rem', color: 'var(--text-primary)' }}>
                            {order.installedAt 
                              ? formatDateInTimezone(order.installedAt, tenantSettings?.timezone)
                              : (order.createdAt ? formatDateInTimezone(order.createdAt, tenantSettings?.timezone) : '—')}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                            {order.installedAt 
                              ? formatDateTimeInTimezone(order.installedAt, tenantSettings?.timezone).split(',')[1] || ''
                              : ''}
                          </span>
                        </div>
                      </td>

                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            overflow: 'hidden',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            color: '#fff',
                            background: cAvatar ? 'transparent' : getAvatarGradient(cName),
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            flexShrink: 0
                          }}>
                            {cAvatar ? (
                              <img src={cAvatar} alt={cName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              isLegal ? <Building2 size={15} /> : getClientInitials(cName)
                            )}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                            <span style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                              {cName}
                            </span>
                            {cPhone && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '1px' }}>
                                <a
                                  href={`tel:${cPhone.replace(/[^\d+]/g, '')}`}
                                  onClick={(e) => e.stopPropagation()}
                                  style={{ color: '#22c55e', textDecoration: 'none', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                                >
                                  <Phone size={10} /> {cPhone}
                                </a>
                                {order.clientWhatsapp && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      window.open(getWhatsAppLink(order.clientWhatsapp!), '_blank');
                                    }}
                                    className="contact-btn whatsapp-btn"
                                    style={{ width: '18px', height: '18px' }}
                                    title="WhatsApp"
                                  >
                                    <MessageCircle size={10} />
                                  </button>
                                )}
                                {order.clientTelegram && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      window.open(getTelegramLink(order.clientTelegram!), '_blank');
                                    }}
                                    className="contact-btn telegram-btn"
                                    style={{ width: '18px', height: '18px' }}
                                    title="Telegram"
                                  >
                                    <Send size={10} />
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', maxWidth: '240px' }}>
                          <MapPin size={14} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                          <span style={{ fontSize: '0.84rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {order.address || '—'}
                          </span>
                        </div>
                      </td>

                      <td>
                        <div style={{ fontSize: '0.84rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                          {installerName}
                        </div>
                      </td>

                      {!isWorker && (
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                            <span style={{ fontWeight: 700, fontSize: '0.92rem', color: '#22c55e' }}>
                              {order.totalPrice != null ? `${order.totalPrice.toLocaleString('ru-RU')} ₽` : '—'}
                            </span>
                            {order.prepayment != null && order.prepayment > 0 && (
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                                Аванс: {order.prepayment.toLocaleString('ru-RU')} ₽
                              </span>
                            )}
                          </div>
                        </td>
                      )}

                      <td>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '3px 10px',
                            borderRadius: '12px',
                            fontSize: '0.76rem',
                            fontWeight: 600,
                            backgroundColor: status?.color ? `${status.color}22` : 'rgba(59, 130, 246, 0.15)',
                            color: status?.color || 'var(--accent-primary)',
                            border: `1px solid ${status?.color || 'var(--accent-primary)'}44`
                          }}
                        >
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: status?.color || '#3b82f6' }} />
                          {status?.name || 'Завершен'}
                        </span>
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                          <button
                            type="button"
                            className="btn-icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDetail(order);
                            }}
                            title="Просмотреть детали заявки"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            type="button"
                            className="btn-icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownloadDocx(order.id);
                            }}
                            title="Скачать договор Word (.docx)"
                          >
                            <FileText size={16} />
                          </button>
                          {!isWorker && (
                            <button
                              type="button"
                              className="btn-icon text-danger"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteOrder(order.id, order.orderNumber);
                              }}
                              title="Удалить заявку"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* 2. Mobile Cards View */}
          <div className="archive-mobile-cards">
            {sortedOrders.map(order => {
              const client = clients.find(c => c.id === order.clientId);
              const status = statuses.find(s => s.id === order.statusId);
              const isLegal = (order.clientType || client?.clientType) === 'LEGAL_ENTITY';
              const cAvatar = order.clientAvatarUrl || client?.avatarUrl;
              const cName = order.clientName || client?.name || `Клиент #${order.clientId}`;
              const cPhone = order.clientPhone || client?.phone;
              const installerName = order.installedByName || order.assigneeName || '—';

              return (
                <div
                  key={order.id}
                  className="archive-mobile-card"
                  onClick={() => handleOpenDetail(order)}
                >
                  {/* Card Header: Number, ID and Status Badge */}
                  <div className="archive-card-header">
                    <div className="archive-card-number-box">
                      <span className="archive-card-order-num">
                        {order.orderNumber || `#${order.id}`}
                      </span>
                      {order.orderNumber && (
                        <span className="archive-card-id-tag">ID: {order.id}</span>
                      )}
                    </div>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '3px 10px',
                        borderRadius: '12px',
                        fontSize: '0.76rem',
                        fontWeight: 600,
                        backgroundColor: status?.color ? `${status.color}22` : 'rgba(59, 130, 246, 0.15)',
                        color: status?.color || 'var(--accent-primary)',
                        border: `1px solid ${status?.color || 'var(--accent-primary)'}44`
                      }}
                    >
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: status?.color || '#3b82f6' }} />
                      {status?.name || 'Завершен'}
                    </span>
                  </div>

                  {/* Date completed / created */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    <Calendar size={13} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                    <span>
                      {order.installedAt 
                        ? `Завершен: ${formatDateTimeInTimezone(order.installedAt, tenantSettings?.timezone)}`
                        : (order.createdAt ? `Создан: ${formatDateTimeInTimezone(order.createdAt, tenantSettings?.timezone)}` : 'Дата не указана')}
                    </span>
                  </div>

                  {/* Client Info */}
                  <div className="archive-card-client-section">
                    <div className="archive-card-client-left">
                      <div
                        className="archive-card-client-avatar"
                        style={{
                          background: cAvatar ? 'transparent' : getAvatarGradient(cName)
                        }}
                      >
                        {cAvatar ? (
                          <img src={cAvatar} alt={cName} />
                        ) : (
                          isLegal ? <Building2 size={16} /> : getClientInitials(cName)
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                        <span className="archive-card-client-name">{cName}</span>
                        {cPhone && (
                          <a
                            href={`tel:${cPhone.replace(/[^\d+]/g, '')}`}
                            onClick={(e) => e.stopPropagation()}
                            className="archive-card-client-phone"
                          >
                            <Phone size={11} />
                            <span>{cPhone}</span>
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Messenger Buttons */}
                    <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                      {order.clientWhatsapp && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(getWhatsAppLink(order.clientWhatsapp!), '_blank');
                          }}
                          className="contact-btn whatsapp-btn"
                          style={{ width: '28px', height: '28px' }}
                          title="WhatsApp"
                        >
                          <MessageCircle size={13} />
                        </button>
                      )}
                      {order.clientTelegram && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(getTelegramLink(order.clientTelegram!), '_blank');
                          }}
                          className="contact-btn telegram-btn"
                          style={{ width: '28px', height: '28px' }}
                          title="Telegram"
                        >
                          <Send size={13} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Address */}
                  {order.address && (
                    <div className="archive-card-address-block">
                      <div className="archive-card-address-text">
                        <MapPin size={14} style={{ color: 'var(--accent-primary)', flexShrink: 0, marginTop: '2px' }} />
                        <span>
                          {order.address}
                          {order.entrance && `, подъезд ${order.entrance}`}
                          {order.floor && `, этаж ${order.floor}`}
                        </span>
                      </div>
                      <div className="archive-card-nav-buttons">
                        <a
                          href={getYandexMapsUrl(order.address)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="archive-card-nav-link"
                        >
                          Яндекс.Карты
                        </a>
                        <a
                          href={get2GisUrl(order.address)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="archive-card-nav-link"
                        >
                          2ГИС
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Financial Details & Executor Grid */}
                  <div className="archive-card-details-grid">
                    {!isWorker && (
                      <div>
                        <div className="archive-card-stat-label">Сумма сделки</div>
                        <div className="archive-card-stat-value price">
                          {order.totalPrice != null ? `${order.totalPrice.toLocaleString('ru-RU')} ₽` : '—'}
                        </div>
                      </div>
                    )}
                    {!isWorker && order.prepayment != null && order.prepayment > 0 && (
                      <div>
                        <div className="archive-card-stat-label">Предоплата</div>
                        <div className="archive-card-stat-value">
                          {order.prepayment.toLocaleString('ru-RU')} ₽
                        </div>
                      </div>
                    )}
                    <div>
                      <div className="archive-card-stat-label">Исполнитель</div>
                      <div className="archive-card-stat-value" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <User size={12} style={{ opacity: 0.6, flexShrink: 0 }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {installerName}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Mobile Actions */}
                  <div className="archive-card-actions">
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenDetail(order);
                      }}
                      style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}
                    >
                      <Eye size={14} /> Подробнее
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadDocx(order.id);
                      }}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      title="Скачать договор Word"
                    >
                      <FileText size={14} /> DOCX
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadPdf(order.id);
                      }}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      title="Скачать договор PDF"
                    >
                      <Download size={14} /> PDF
                    </button>
                    {!isWorker && (
                      <button
                        type="button"
                        className="btn btn-ghost text-danger"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteOrder(order.id, order.orderNumber);
                        }}
                        style={{ padding: '6px 8px' }}
                        title="Удалить заявку"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Detail & Quick View Modal */}
      {isDetailModalOpen && selectedOrder && (
        <div className="modal-overlay" onClick={handleCloseDetail}>
          <div 
            className="modal-content animate-scale-up" 
            style={{ 
              maxWidth: '720px', 
              maxHeight: '90vh', 
              overflowY: 'auto',
              background: 'var(--modal-bg, var(--bg-secondary, #1e293b))',
              border: '1px solid var(--glass-border)',
              boxShadow: 'var(--glass-shadow, 0 25px 50px -12px rgba(0, 0, 0, 0.35))',
              borderRadius: 'var(--radius-lg, 16px)'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="modal-header" style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '14px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                  <ArchiveIcon size={20} style={{ color: 'var(--accent-primary)' }} />
                  Заявка {selectedOrder.orderNumber || `#${selectedOrder.id}`}
                </h2>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Архивная завершенная заявка от {selectedOrder.createdAt ? formatDateInTimezone(selectedOrder.createdAt, tenantSettings?.timezone) : ''}
                </div>
              </div>
              <button type="button" className="btn-icon" onClick={handleCloseDetail}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '18px 0' }}>
              {/* Status & Date */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                background: 'var(--chip-bg, rgba(255, 255, 255, 0.04))',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--glass-border)'
              }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Статус в архиве</div>
                  <div style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--text-primary)', marginTop: '2px' }}>
                    {statuses.find(s => s.id === selectedOrder.statusId)?.name || 'Завершен'}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Дата завершения</div>
                  <div style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--text-primary)', marginTop: '2px' }}>
                    {selectedOrder.installedAt 
                      ? formatDateTimeInTimezone(selectedOrder.installedAt, tenantSettings?.timezone)
                      : (selectedOrder.createdAt ? formatDateTimeInTimezone(selectedOrder.createdAt, tenantSettings?.timezone) : '—')}
                  </div>
                </div>
              </div>

              {/* Client Info */}
              <div style={{
                padding: '14px 16px',
                background: 'var(--chip-bg, rgba(255, 255, 255, 0.04))',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--glass-border)'
              }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Данные клиента
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-primary)' }}>
                      {selectedOrder.clientName || 'Без имени'}
                    </div>
                    {selectedOrder.clientPhone && (
                      <a
                        href={`tel:${selectedOrder.clientPhone.replace(/[^\d+]/g, '')}`}
                        style={{ color: '#22c55e', textDecoration: 'none', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}
                      >
                        <Phone size={12} /> {selectedOrder.clientPhone}
                      </a>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {selectedOrder.clientWhatsapp && (
                      <button
                        type="button"
                        onClick={() => window.open(getWhatsAppLink(selectedOrder.clientWhatsapp!), '_blank')}
                        className="contact-btn whatsapp-btn"
                        style={{ width: '32px', height: '32px' }}
                        title="Написать в WhatsApp"
                      >
                        <MessageCircle size={15} />
                      </button>
                    )}
                    {selectedOrder.clientTelegram && (
                      <button
                        type="button"
                        onClick={() => window.open(getTelegramLink(selectedOrder.clientTelegram!), '_blank')}
                        className="contact-btn telegram-btn"
                        style={{ width: '32px', height: '32px' }}
                        title="Написать в Telegram"
                      >
                        <Send size={15} />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Address */}
              {selectedOrder.address && (
                <div style={{
                  padding: '14px 16px',
                  background: 'var(--chip-bg, rgba(255, 255, 255, 0.04))',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--glass-border)'
                }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Адрес объекта
                  </div>
                  <div style={{ fontSize: '0.92rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MapPin size={16} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                    <span>{selectedOrder.address}</span>
                  </div>
                  {(selectedOrder.entrance || selectedOrder.floor) && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px', paddingLeft: '22px' }}>
                      {selectedOrder.entrance && `Подъезд ${selectedOrder.entrance}`}
                      {selectedOrder.entrance && selectedOrder.floor && ', '}
                      {selectedOrder.floor && `Этаж ${selectedOrder.floor}`}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '8px', marginTop: '10px', paddingLeft: '22px' }}>
                    <a
                      href={getYandexMapsUrl(selectedOrder.address)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-ghost"
                      style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                    >
                      Яндекс.Карты
                    </a>
                    <a
                      href={get2GisUrl(selectedOrder.address)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-ghost"
                      style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                    >
                      2ГИС
                    </a>
                  </div>
                </div>
              )}

              {/* Financials (if not worker) */}
              {!isWorker && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                  gap: '10px',
                  padding: '14px 16px',
                  background: 'var(--chip-bg, rgba(255, 255, 255, 0.04))',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--glass-border)'
                }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Сумма сделки</div>
                    <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#22c55e', marginTop: '2px' }}>
                      {selectedOrder.totalPrice != null ? `${selectedOrder.totalPrice.toLocaleString('ru-RU')} ₽` : '—'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Предоплата</div>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)', marginTop: '2px' }}>
                      {selectedOrder.prepayment != null ? `${selectedOrder.prepayment.toLocaleString('ru-RU')} ₽` : '0 ₽'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Остаток</div>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)', marginTop: '2px' }}>
                      {selectedOrder.remainder != null ? `${selectedOrder.remainder.toLocaleString('ru-RU')} ₽` : '0 ₽'}
                    </div>
                  </div>
                  {selectedOrder.installationPrice != null && selectedOrder.installationPrice > 0 && (
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Монтаж</div>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--accent-primary)', marginTop: '2px' }}>
                        {selectedOrder.installationPrice.toLocaleString('ru-RU')} ₽
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* СМЕТА И СПЕЦИФИКАЦИЯ */}
              <div style={{
                padding: '14px 16px',
                background: 'var(--chip-bg, rgba(255, 255, 255, 0.04))',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--glass-border)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Calculator size={16} style={{ color: 'var(--accent-primary)' }} />
                    Смета и спецификация заказа
                  </div>
                  {loadingMeasurement && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Загрузка сметы...</span>
                  )}
                </div>

                {orderMeasurement && orderMeasurement.rooms && orderMeasurement.rooms.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {/* Список комнат */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {orderMeasurement.rooms.map((room, idx) => (
                        <div
                          key={idx}
                          style={{
                            padding: '6px 12px',
                            background: 'rgba(59, 130, 246, 0.08)',
                            border: '1px solid rgba(59, 130, 246, 0.25)',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.8rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          <Layers size={13} style={{ color: 'var(--accent-primary)' }} />
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{room.roomName || `Помещение ${idx + 1}`}</span>
                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                            ({room.area || 0} м², {room.perimeter || 0} м/п)
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Позиции калькуляции / сметы */}
                    {orderMeasurement.items && orderMeasurement.items.length > 0 ? (
                      <div style={{ overflowX: 'auto', marginTop: '4px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-secondary)', textAlign: 'left' }}>
                              <th style={{ padding: '6px 4px', width: '30px' }}>№</th>
                              <th style={{ padding: '6px 8px' }}>Наименование</th>
                              <th style={{ padding: '6px 8px' }}>Помещение</th>
                              <th style={{ padding: '6px 8px', textAlign: 'right' }}>Кол-во</th>
                              <th style={{ padding: '6px 8px', textAlign: 'right' }}>Цена</th>
                              <th style={{ padding: '6px 8px', textAlign: 'right' }}>Сумма</th>
                            </tr>
                          </thead>
                          <tbody>
                            {orderMeasurement.items.map((item, i) => (
                              <tr key={i} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                                <td style={{ padding: '6px 4px', color: 'var(--text-secondary)' }}>{i + 1}</td>
                                <td style={{ padding: '6px 8px', color: 'var(--text-primary)', fontWeight: 500 }}>
                                  {item.name}
                                </td>
                                <td style={{ padding: '6px 8px', color: 'var(--text-secondary)' }}>
                                  {item.roomName || '—'}
                                </td>
                                <td style={{ padding: '6px 8px', textAlign: 'right', color: 'var(--text-primary)' }}>
                                  {item.quantity} {item.unit}
                                </td>
                                <td style={{ padding: '6px 8px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                                  {item.unitSalePrice?.toLocaleString('ru-RU')} ₽
                                </td>
                                <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600, color: '#22c55e' }}>
                                  {item.totalSalePrice?.toLocaleString('ru-RU')} ₽
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        Позиции расчета зафиксированы в параметрах комнат
                      </div>
                    )}
                  </div>
                ) : selectedOrder.contractParams?.specItems && selectedOrder.contractParams.specItems.length > 0 ? (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-secondary)', textAlign: 'left' }}>
                          <th style={{ padding: '6px 4px', width: '30px' }}>№</th>
                          <th style={{ padding: '6px 8px' }}>Наименование</th>
                          <th style={{ padding: '6px 8px', textAlign: 'right' }}>Кол-во</th>
                          <th style={{ padding: '6px 8px', textAlign: 'right' }}>Цена</th>
                          <th style={{ padding: '6px 8px', textAlign: 'right' }}>Сумма</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedOrder.contractParams.specItems.map((item, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                            <td style={{ padding: '6px 4px', color: 'var(--text-secondary)' }}>{item.idx || i + 1}</td>
                            <td style={{ padding: '6px 8px', color: 'var(--text-primary)', fontWeight: 500 }}>
                              {item.name}
                            </td>
                            <td style={{ padding: '6px 8px', textAlign: 'right', color: 'var(--text-primary)' }}>
                              {item.quantity} {item.unit || 'шт.'}
                            </td>
                            <td style={{ padding: '6px 8px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                              {item.price?.toLocaleString('ru-RU')} ₽
                            </td>
                            <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600, color: '#22c55e' }}>
                              {item.total?.toLocaleString('ru-RU')} ₽
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : selectedOrder.materials && selectedOrder.materials.length > 0 ? (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-secondary)', textAlign: 'left' }}>
                          <th style={{ padding: '6px 4px', width: '30px' }}>№</th>
                          <th style={{ padding: '6px 8px' }}>Материал</th>
                          <th style={{ padding: '6px 8px', textAlign: 'right' }}>Кол-во</th>
                          <th style={{ padding: '6px 8px', textAlign: 'right' }}>Цена</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedOrder.materials.map((m, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                            <td style={{ padding: '6px 4px', color: 'var(--text-secondary)' }}>{i + 1}</td>
                            <td style={{ padding: '6px 8px', color: 'var(--text-primary)' }}>
                              {m.materialName || `Материал #${m.materialId}`}
                            </td>
                            <td style={{ padding: '6px 8px', textAlign: 'right', color: 'var(--text-primary)' }}>
                              {m.quantity}
                            </td>
                            <td style={{ padding: '6px 8px', textAlign: 'right', color: '#22c55e', fontWeight: 600 }}>
                              {m.fixedSalePrice != null ? `${m.fixedSalePrice.toLocaleString('ru-RU')} ₽` : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', padding: '6px 0' }}>
                    Детальная спецификация сметы не сохранена. Фиксация стоимости произведена в договоре.
                  </div>
                )}
              </div>

              {/* Description / Comment */}
              {selectedOrder.description && (
                <div style={{
                  padding: '14px 16px',
                  background: 'var(--chip-bg, rgba(255, 255, 255, 0.04))',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--glass-border)'
                }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Комментарий / Описание
                  </div>
                  <div style={{ fontSize: '0.88rem', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>
                    {selectedOrder.description}
                  </div>
                </div>
              )}

              {/* Attachments list */}
              {selectedOrder.attachments && selectedOrder.attachments.length > 0 && (
                <div style={{
                  padding: '14px 16px',
                  background: 'var(--chip-bg, rgba(255, 255, 255, 0.04))',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--glass-border)'
                }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>
                    Прикрепленные документы ({selectedOrder.attachments.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {selectedOrder.attachments.map(att => (
                      <div 
                        key={att.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '6px 10px',
                          background: 'var(--input-bg, rgba(255, 255, 255, 0.02))',
                          border: '1px solid var(--glass-border)',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.82rem'
                        }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <FileCheck size={14} style={{ color: att.isAct ? '#22c55e' : 'var(--accent-primary)' }} />
                          {att.fileName}
                        </span>
                        <a
                          href={`/api/v1/orders/attachments/${att.id}?download=true`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-ghost"
                          style={{ padding: '2px 6px', fontSize: '0.75rem' }}
                        >
                          <Download size={13} /> Скачать
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '6px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => handleDownloadDocx(selectedOrder.id)}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  <FileText size={16} /> Договор Word (.docx)
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => handleDownloadPdf(selectedOrder.id)}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  <Download size={16} /> Договор PDF
                </button>
              </div>

              {/* Danger & Return Actions */}
              {!isWorker && (
                <div style={{ marginTop: '6px', borderTop: '1px solid var(--glass-border)', paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    Управление архивной заявкой:
                  </div>
                  
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {statuses.length > 0 && (
                      <button
                        type="button"
                        className="btn btn-ghost"
                        disabled={actionLoading}
                        onClick={() => {
                          const firstStatus = statuses.find(s => !s.isCompleted) || statuses[0];
                          if (firstStatus) {
                            handleReturnToKanban(firstStatus.id);
                          }
                        }}
                        style={{
                          flex: 1,
                          color: 'var(--accent-primary)',
                          border: '1px solid rgba(59, 130, 246, 0.3)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px'
                        }}
                      >
                        <RotateCcw size={16} />
                        <span>Вернуть на Канбан</span>
                      </button>
                    )}

                    <button
                      type="button"
                      className="btn btn-ghost"
                      disabled={actionLoading}
                      onClick={() => handleDeleteOrder(selectedOrder.id, selectedOrder.orderNumber)}
                      style={{
                        color: 'var(--danger, #ef4444)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        padding: '8px 16px'
                      }}
                    >
                      <Trash2 size={16} />
                      <span>Удалить</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-actions" style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '14px' }}>
              <button type="button" className="btn btn-primary" onClick={handleCloseDetail}>
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
