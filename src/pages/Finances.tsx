import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Wallet, 
  TrendingDown, 
  Receipt, 
  Search, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Plus, 
  Trash2, 
  Edit3, 
  Phone, 
  User, 
  ExternalLink, 
  FileText, 
  ChevronDown, 
  ChevronUp, 
  PieChart, 
  ArrowUpRight, 
  ArrowDownRight, 
  Sparkles, 
  RefreshCw, 
  X, 
  Check,
  Box,
  SlidersHorizontal
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { getOrders, getOrderStatuses, updateFinanceStatuses, togglePrepaymentPaid, toggleRemainderPaid, type Order, type OrderStatus } from '../api/kanban';
import { getEmployees, type Employee } from '../api/employees';
import { 
  getExpenses, 
  createExpense, 
  updateExpense, 
  deleteExpense, 
  EXPENSE_CATEGORIES, 
  type Expense, 
  type ExpenseCategory 
} from '../api/finances';
import { useAppStore } from '../store/useAppStore';
import { formatDateTimeInTimezone, formatDateOnly } from '../utils/dateUtils';
import '../styles/clients.css';

type TabType = 'TRANSACTIONS' | 'RECEIVABLES' | 'EXPENSES' | 'INSTALLERS' | 'PL_STRUCTURE';
type PeriodFilter = 'THIS_MONTH' | 'LAST_MONTH' | 'THREE_MONTHS' | 'THIS_YEAR' | 'ALL';
type PaymentStatusFilter = 'ALL' | 'PAID' | 'PREPAYMENT' | 'UNPAID' | 'DEBT';

export const Finances = () => {
  const navigate = useNavigate();
  const { tenantSettings } = useAppStore();

  const [activeTab, setActiveTab] = useState<TabType>('TRANSACTIONS');
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [statuses, setStatuses] = useState<OrderStatus[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  // Mobile KPI collapse state
  const [isKpiCollapsedMobile, setIsKpiCollapsedMobile] = useState(true);

  // Status Configuration Modal State
  const [isStatusConfigModalOpen, setIsStatusConfigModalOpen] = useState(false);
  const [tempStatusSettings, setTempStatusSettings] = useState<Record<number, boolean>>({});
  const [savingStatusSettings, setSavingStatusSettings] = useState(false);

  // Filters
  const [period, setPeriod] = useState<PeriodFilter>('THIS_MONTH');
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<PaymentStatusFilter>('ALL');
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState<string>('ALL');

  // Expense Modal State
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<number | null>(null);
  const [expenseFormData, setExpenseFormData] = useState<{
    title: string;
    category: ExpenseCategory;
    amount: string;
    expenseDate: string;
    orderId: string;
    comment: string;
  }>({
    title: '',
    category: 'OTHER',
    amount: '',
    expenseDate: new Date().toISOString().split('T')[0],
    orderId: '',
    comment: ''
  });

  // Expanded installers state
  const [expandedInstallerId, setExpandedInstallerId] = useState<number | null>(null);

  // Initial Data Fetch
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [ordersData, statusesData, employeesData, expensesData] = await Promise.all([
        getOrders(),
        getOrderStatuses(),
        getEmployees(),
        getExpenses()
      ]);
      setOrders(ordersData);
      setStatuses(statusesData);
      setEmployees(employeesData);
      setExpenses(expensesData);
    } catch (err) {
      console.error('Failed to load finances data', err);
    } finally {
      setLoading(false);
    }
  };

  // Date Range Calculation
  const dateRange = useMemo(() => {
    const now = new Date();
    let from: Date | null = null;
    let to: Date | null = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    if (period === 'THIS_MONTH') {
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (period === 'LAST_MONTH') {
      from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      to = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    } else if (period === 'THREE_MONTHS') {
      from = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (period === 'THIS_YEAR') {
      from = new Date(now.getFullYear(), 0, 1);
      to = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    } else if (period === 'ALL') {
      from = null;
      to = null;
    }

    return { from, to };
  }, [period]);

  // Filter helper: check if date is within selected range
  const isDateInRange = (dateStr?: string | null) => {
    if (!dateStr) return false;
    if (!dateRange.from && !dateRange.to) return true;
    const d = new Date(dateStr);
    if (dateRange.from && d < dateRange.from) return false;
    if (dateRange.to && d > dateRange.to) return false;
    return true;
  };

  // Status helper
  const isCompletedStatus = (statusId: number) => {
    const s = statuses.find(st => st.id === statusId);
    if (!s || !s.name) return false;
    const n = s.name.toLowerCase();
    return n.includes('заверш') || n.includes('готов') || n.includes('выполнен') || n.includes('complete');
  };

  // Filter orders that belong to statuses included in finances
  const financeOrders = useMemo(() => {
    return orders.filter(order => {
      const st = statuses.find(s => s.id === order.statusId);
      return st ? st.includeInFinances !== false : true;
    });
  }, [orders, statuses]);

  // Metrics Calculation (Cash-Basis Method)
  const metrics = useMemo(() => {
    let receivedPrepayments = 0;
    let receivedRemainders = 0;
    let pendingReceivables = 0;
    let completedRevenue = 0;
    let completedInstallationsCost = 0;
    let materialsCost = 0;

    financeOrders.forEach(order => {
      const prep = order.prepayment || 0;
      const rem = order.remainder != null ? order.remainder : Math.max(0, (order.totalPrice || 0) - prep);
      const isCompleted = isCompletedStatus(order.statusId);

      // Prepayment Fact
      if (order.prepaymentPaid) {
        if (isDateInRange(order.prepaymentPaidAt || order.createdAt)) {
          receivedPrepayments += prep;
        }
      } else {
        // Pending prepayment debt
        pendingReceivables += prep;
      }

      // Remainder Fact
      if (order.remainderPaid) {
        if (isDateInRange(order.remainderPaidAt || order.installedAt || order.createdAt)) {
          receivedRemainders += rem;
        }
      } else {
        // Pending remainder debt
        pendingReceivables += rem;
      }

      // Completed revenue and costs
      if (isCompleted && isDateInRange(order.installedAt || order.createdAt)) {
        completedRevenue += (order.totalPrice || 0);
        completedInstallationsCost += (order.installationPrice || 0);
        materialsCost += (order.materialsCost || 0);
      }
    });

    // Expenses in range
    const filteredExpenses = expenses.filter(exp => isDateInRange(exp.expenseDate));
    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    const totalCashInflow = receivedPrepayments + receivedRemainders;
    const totalCashOutflow = totalExpenses + completedInstallationsCost + materialsCost;
    const netCashProfit = totalCashInflow - totalCashOutflow;

    return {
      receivedPrepayments,
      receivedRemainders,
      totalCashInflow,
      pendingReceivables,
      completedRevenue,
      completedInstallationsCost,
      materialsCost,
      totalExpenses,
      totalCashOutflow,
      netCashProfit
    };
  }, [financeOrders, expenses, statuses, dateRange]);

  // Payment Toggle Handlers
  const handleTogglePrepayment = async (orderId: number, currentStatus: boolean) => {
    try {
      const newStatus = !currentStatus;
      const updated = await togglePrepaymentPaid(orderId, newStatus, newStatus ? new Date().toISOString() : undefined);
      setOrders(prev => prev.map(o => o.id === orderId ? {
        ...o,
        prepaymentPaid: updated.prepaymentPaid,
        prepaymentPaidAt: updated.prepaymentPaidAt
      } : o));
    } catch (err) {
      console.error('Failed to toggle prepayment status', err);
      alert('Не удалось изменить статус оплаты аванса');
    }
  };

  const handleToggleRemainder = async (orderId: number, currentStatus: boolean) => {
    try {
      const newStatus = !currentStatus;
      const updated = await toggleRemainderPaid(orderId, newStatus, newStatus ? new Date().toISOString() : undefined);
      setOrders(prev => prev.map(o => o.id === orderId ? {
        ...o,
        remainderPaid: updated.remainderPaid,
        remainderPaidAt: updated.remainderPaidAt
      } : o));
    } catch (err) {
      console.error('Failed to toggle remainder status', err);
      alert('Не удалось изменить статус оплаты остатка');
    }
  };

  // Expense Modal Handlers
  const openCreateExpenseModal = () => {
    setEditingExpenseId(null);
    setExpenseFormData({
      title: '',
      category: 'OTHER',
      amount: '',
      expenseDate: new Date().toISOString().split('T')[0],
      orderId: '',
      comment: ''
    });
    setIsExpenseModalOpen(true);
  };

  const openEditExpenseModal = (exp: Expense) => {
    setEditingExpenseId(exp.id);
    setExpenseFormData({
      title: exp.title,
      category: exp.category,
      amount: exp.amount.toString(),
      expenseDate: exp.expenseDate,
      orderId: exp.orderId ? exp.orderId.toString() : '',
      comment: exp.comment || ''
    });
    setIsExpenseModalOpen(true);
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseFormData.title.trim() || !expenseFormData.amount) return;

    const payload: Partial<Expense> = {
      title: expenseFormData.title.trim(),
      category: expenseFormData.category,
      amount: parseFloat(expenseFormData.amount) || 0,
      expenseDate: expenseFormData.expenseDate,
      orderId: expenseFormData.orderId ? parseInt(expenseFormData.orderId) : undefined,
      comment: expenseFormData.comment.trim() || undefined
    };

    try {
      if (editingExpenseId) {
        const updated = await updateExpense(editingExpenseId, payload);
        setExpenses(prev => prev.map(ex => ex.id === editingExpenseId ? updated : ex));
      } else {
        const created = await createExpense(payload);
        setExpenses(prev => [created, ...prev]);
      }
      setIsExpenseModalOpen(false);
    } catch (err) {
      console.error('Failed to save expense', err);
      alert('Не удалось сохранить расход');
    }
  };

  const handleDeleteExpense = async (id: number, title: string) => {
    if (!window.confirm(`Удалить статью расхода «${title}»?`)) return;
    try {
      await deleteExpense(id);
      setExpenses(prev => prev.filter(e => e.id !== id));
    } catch (err) {
      console.error('Failed to delete expense', err);
      alert('Не удалось удалить расход');
    }
  };

  // Status Config Modal Handlers
  const handleOpenStatusConfig = () => {
    const initialMap: Record<number, boolean> = {};
    statuses.forEach(s => {
      initialMap[s.id] = s.includeInFinances !== false;
    });
    setTempStatusSettings(initialMap);
    setIsStatusConfigModalOpen(true);
  };

  const handleSaveStatusSettings = async () => {
    setSavingStatusSettings(true);
    try {
      const updated = await updateFinanceStatuses(tempStatusSettings);
      setStatuses(updated.sort((a, b) => a.sortOrder - b.sortOrder));
      setIsStatusConfigModalOpen(false);
    } catch (err) {
      console.error('Failed to update finance statuses', err);
      alert('Не удалось сохранить настройки статусов');
    } finally {
      setSavingStatusSettings(false);
    }
  };

  // Filtered Orders for Transactions Tab
  const filteredOrders = useMemo(() => {
    return financeOrders.filter(order => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const num = (order.orderNumber || '').toLowerCase();
        const cName = (order.clientName || '').toLowerCase();
        const cPhone = (order.clientPhone || '').toLowerCase();
        const addr = (order.address || '').toLowerCase();
        if (!num.includes(q) && !cName.includes(q) && !cPhone.includes(q) && !addr.includes(q)) {
          return false;
        }
      }

      // Payment Status Filter
      const isPaid = order.prepaymentPaid && order.remainderPaid;
      const isPrepaymentOnly = order.prepaymentPaid && !order.remainderPaid;
      const isUnpaid = !order.prepaymentPaid && !order.remainderPaid;
      const hasDebt = !order.prepaymentPaid || !order.remainderPaid;

      if (paymentFilter === 'PAID' && !isPaid) return false;
      if (paymentFilter === 'PREPAYMENT' && !isPrepaymentOnly) return false;
      if (paymentFilter === 'UNPAID' && !isUnpaid) return false;
      if (paymentFilter === 'DEBT' && !hasDebt) return false;

      // Period Filter (based on creation, completion or payment)
      if (period !== 'ALL') {
        const inCreated = isDateInRange(order.createdAt);
        const inInstalled = isDateInRange(order.installedAt);
        const inPrepPaid = isDateInRange(order.prepaymentPaidAt);
        const inRemPaid = isDateInRange(order.remainderPaidAt);
        if (!inCreated && !inInstalled && !inPrepPaid && !inRemPaid) {
          return false;
        }
      }

      return true;
    });
  }, [financeOrders, searchQuery, paymentFilter, period, dateRange]);

  // Debtor Orders
  const debtorOrders = useMemo(() => {
    return financeOrders.filter(order => {
      const hasPrepaymentDebt = !order.prepaymentPaid && (order.prepayment || 0) > 0;
      const hasRemainderDebt = !order.remainderPaid && (order.remainder != null ? order.remainder : ((order.totalPrice || 0) - (order.prepayment || 0))) > 0;
      return hasPrepaymentDebt || hasRemainderDebt;
    }).sort((a, b) => {
      const debtA = (!a.prepaymentPaid ? (a.prepayment || 0) : 0) + (!a.remainderPaid ? (a.remainder || 0) : 0);
      const debtB = (!b.prepaymentPaid ? (b.prepayment || 0) : 0) + (!b.remainderPaid ? (b.remainder || 0) : 0);
      return debtB - debtA;
    });
  }, [financeOrders]);

  // Installers Summary
  const installersSummary = useMemo(() => {
    const map = new Map<number, {
      employee: Employee;
      completedCount: number;
      completedEarnings: number;
      inProgressCount: number;
      inProgressEarnings: number;
      orders: Order[];
    }>();

    employees.forEach(emp => {
      map.set(emp.id, {
        employee: emp,
        completedCount: 0,
        completedEarnings: 0,
        inProgressCount: 0,
        inProgressEarnings: 0,
        orders: []
      });
    });

    financeOrders.forEach(order => {
      const installerId = order.installedById || order.assigneeId;
      if (!installerId || !map.has(installerId)) return;

      const instData = map.get(installerId)!;
      instData.orders.push(order);

      const isCompleted = isCompletedStatus(order.statusId);
      const price = order.installationPrice || 0;

      if (isCompleted) {
        if (isDateInRange(order.installedAt || order.createdAt)) {
          instData.completedCount += 1;
          instData.completedEarnings += price;
        }
      } else {
        instData.inProgressCount += 1;
        instData.inProgressEarnings += price;
      }
    });

    return Array.from(map.values())
      .filter(item => item.orders.length > 0 || item.employee.position?.toLowerCase().includes('монтаж'))
      .sort((a, b) => b.completedEarnings - a.completedEarnings);
  }, [employees, financeOrders, statuses, dateRange]);

  // Filtered Expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => {
      if (expenseCategoryFilter !== 'ALL' && exp.category !== expenseCategoryFilter) {
        return false;
      }
      if (!isDateInRange(exp.expenseDate)) {
        return false;
      }
      return true;
    });
  }, [expenses, expenseCategoryFilter, dateRange]);

  if (loading) {
    return (
      <div className="clients-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
          <RefreshCw size={32} className="animate-spin" style={{ margin: '0 auto 12px', opacity: 0.6 }} />
          <p>Загрузка финансовых данных...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="clients-wrapper">
      {/* 1. Header with Period Filters */}
      <div className="clients-header" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ margin: 0, fontSize: '1.45rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Wallet size={24} style={{ color: 'var(--accent-primary)' }} /> Финансы и касса
            </h1>
            <span style={{ fontSize: '0.75rem', background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80', padding: '3px 8px', borderRadius: '12px', fontWeight: 600 }}>
              Кассовый метод
            </span>
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Фактический учет поступивших денег, дебиторская задолженность, статьи расходов и выплаты
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Statuses Filter / Config button */}
          <button
            type="button"
            onClick={handleOpenStatusConfig}
            className="btn btn-ghost"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.82rem',
              border: '1px solid var(--glass-border)',
              background: 'rgba(255, 255, 255, 0.03)',
              color: 'var(--text-primary)',
              cursor: 'pointer'
            }}
            title="Настроить статусы заявок, учитываемые в расчетах финансов"
          >
            <SlidersHorizontal size={14} style={{ color: 'var(--accent-primary)' }} />
            <span>Статусы в финансах:</span>
            <span style={{
              fontSize: '0.75rem',
              background: 'rgba(59, 130, 246, 0.15)',
              color: 'var(--accent-primary)',
              padding: '2px 7px',
              borderRadius: '10px',
              fontWeight: 600
            }}>
              {statuses.filter(s => s.includeInFinances !== false).length} из {statuses.length}
            </span>
          </button>

          {/* Period Selector */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
            {(['THIS_MONTH', 'LAST_MONTH', 'THREE_MONTHS', 'THIS_YEAR', 'ALL'] as PeriodFilter[]).map(pKey => {
              const labels: Record<PeriodFilter, string> = {
                THIS_MONTH: 'Этот месяц',
                LAST_MONTH: 'Прошлый месяц',
                THREE_MONTHS: '3 месяца',
                THIS_YEAR: 'Этот год',
                ALL: 'Все время'
              };
              const active = period === pKey;
              return (
                <button
                  key={pKey}
                  type="button"
                  onClick={() => setPeriod(pKey)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.82rem',
                    fontWeight: active ? 600 : 400,
                    border: active ? '1px solid var(--accent-primary)' : '1px solid var(--glass-border)',
                    background: active ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.03)',
                    color: active ? '#fff' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {labels[pKey]}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. Mobile Quick KPI Banner (Collapsible) */}
      <div className="finances-kpi-mobile-banner">
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', flex: 1 }}>
          <div style={{ fontSize: '0.82rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Приход: </span>
            <strong style={{ color: '#4ade80' }}>+{metrics.totalCashInflow.toLocaleString('ru-RU')} ₽</strong>
          </div>
          <div style={{ fontSize: '0.82rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Касса: </span>
            <strong style={{ color: metrics.netCashProfit >= 0 ? '#4ade80' : '#ef4444' }}>{metrics.netCashProfit.toLocaleString('ru-RU')} ₽</strong>
          </div>
          <div style={{ fontSize: '0.82rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Долги: </span>
            <strong style={{ color: '#f59e0b' }}>{metrics.pendingReceivables.toLocaleString('ru-RU')} ₽</strong>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsKpiCollapsedMobile(!isKpiCollapsedMobile)}
          style={{
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid var(--glass-border)',
            borderRadius: 'var(--radius-sm)',
            padding: '4px 8px',
            fontSize: '0.75rem',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          {isKpiCollapsedMobile ? 'Все показатели ▾' : 'Свернуть ▴'}
        </button>
      </div>

      {/* 2. Top KPI Cards */}
      <div className={`finances-kpi-grid ${isKpiCollapsedMobile ? 'collapsed-mobile' : ''}`}>
        {/* Card 1: Реальный приход */}
        <div className="glass-panel" style={{ padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(34, 197, 94, 0.25)', background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.08), rgba(255, 255, 255, 0.02))' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Реально получено</span>
            <div style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80', padding: '5px', borderRadius: '8px' }}>
              <ArrowDownRight size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 700, color: '#4ade80' }}>
            {metrics.totalCashInflow.toLocaleString('ru-RU')} ₽
          </div>
          <div style={{ fontSize: '0.73rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Авансы: {metrics.receivedPrepayments.toLocaleString('ru-RU')} ₽ • Доплаты: {metrics.receivedRemainders.toLocaleString('ru-RU')} ₽
          </div>
        </div>

        {/* Card 2: Дебиторка (Ожидает поступления) */}
        <div className="glass-panel" style={{ padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(245, 158, 11, 0.25)', background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08), rgba(255, 255, 255, 0.02))' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Дебиторка (Долги)</span>
            <div style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', padding: '5px', borderRadius: '8px' }}>
              <Clock size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 700, color: '#f59e0b' }}>
            {metrics.pendingReceivables.toLocaleString('ru-RU')} ₽
          </div>
          <div style={{ fontSize: '0.73rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Неоплаченные остатки и авансы по сделкам
          </div>
        </div>

        {/* Card 3: Затраты на материалы */}
        <div className="glass-panel" style={{ padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(251, 191, 36, 0.25)', background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.08), rgba(255, 255, 255, 0.02))' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Затраты на материалы</span>
            <div style={{ background: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24', padding: '5px', borderRadius: '8px' }}>
              <Box size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 700, color: '#fbbf24' }}>
            {metrics.materialsCost.toLocaleString('ru-RU')} ₽
          </div>
          <div style={{ fontSize: '0.73rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Себестоимость комплектующих по сделкам
          </div>
        </div>

        {/* Card 4: Расходы компании */}
        <div className="glass-panel" style={{ padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(239, 68, 68, 0.25)', background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08), rgba(255, 255, 255, 0.02))' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Расходы компании</span>
            <div style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', padding: '5px', borderRadius: '8px' }}>
              <ArrowUpRight size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 700, color: '#ef4444' }}>
            {metrics.totalExpenses.toLocaleString('ru-RU')} ₽
          </div>
          <div style={{ fontSize: '0.73rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Аренда, маркетинг, доставка и прочее ({filteredExpenses.length} записей)
          </div>
        </div>

        {/* Card 4: Выплаты монтажникам */}
        <div className="glass-panel" style={{ padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(59, 130, 246, 0.25)', background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08), rgba(255, 255, 255, 0.02))' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Начислено монтажникам</span>
            <div style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', padding: '5px', borderRadius: '8px' }}>
              <User size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 700, color: '#60a5fa' }}>
            {metrics.completedInstallationsCost.toLocaleString('ru-RU')} ₽
          </div>
          <div style={{ fontSize: '0.73rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            По фактически завершённым монтажам
          </div>
        </div>

        {/* Card 5: Чистый результат кассы */}
        <div className="glass-panel" style={{ padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(168, 85, 247, 0.3)', background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.1), rgba(255, 255, 255, 0.02))' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Чистый баланс кассы</span>
            <div style={{ background: 'rgba(168, 85, 247, 0.2)', color: '#c084fc', padding: '5px', borderRadius: '8px' }}>
              <Sparkles size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 700, color: metrics.netCashProfit >= 0 ? '#4ade80' : '#ef4444' }}>
            {metrics.netCashProfit.toLocaleString('ru-RU')} ₽
          </div>
          <div style={{ fontSize: '0.73rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Приход ({metrics.totalCashInflow.toLocaleString('ru-RU')} ₽) − Расход ({metrics.totalCashOutflow.toLocaleString('ru-RU')} ₽)
          </div>
        </div>
      </div>

      {/* 3. Navigation Tabs (Desktop & Mobile Pills) */}
      <div style={{
        display: 'flex',
        gap: '6px',
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none',
        padding: '4px 2px 10px 2px',
        marginBottom: '16px',
        borderBottom: '1px solid var(--glass-border)'
      }}>
        {[
          { id: 'TRANSACTIONS', label: 'Взаиморасчёты и приём оплат', shortLabel: 'Оплаты', icon: Receipt, count: filteredOrders.length, color: 'var(--accent-primary)' },
          { id: 'RECEIVABLES', label: 'Дебиторка / Должники', shortLabel: 'Дебиторка', icon: Clock, count: debtorOrders.length, color: '#f59e0b' },
          { id: 'EXPENSES', label: 'Расходы компании', shortLabel: 'Расходы', icon: TrendingDown, count: filteredExpenses.length, color: '#ef4444' },
          { id: 'INSTALLERS', label: 'Расчёты с монтажниками', shortLabel: 'Монтажники', icon: User, count: installersSummary.length, color: '#60a5fa' },
          { id: 'PL_STRUCTURE', label: 'Движение средств (Cash Flow)', shortLabel: 'ДДС и P&L', icon: PieChart, color: '#c084fc' }
        ].map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as TabType)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.85rem',
                fontWeight: active ? 600 : 500,
                border: active ? `1px solid ${tab.color}` : '1px solid var(--glass-border)',
                background: active ? (tab.color.startsWith('var') ? 'rgba(59, 130, 246, 0.18)' : `${tab.color}22`) : 'rgba(255, 255, 255, 0.02)',
                color: active ? (tab.color.startsWith('var') ? 'var(--accent-primary)' : tab.color) : 'var(--text-secondary)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                transition: 'all 0.15s ease'
              }}
            >
              <Icon size={16} style={{ color: active ? (tab.color.startsWith('var') ? 'var(--accent-primary)' : tab.color) : 'var(--text-secondary)', flexShrink: 0 }} />
              <span className="desktop-tab-label">{tab.label}</span>
              <span className="mobile-tab-label">{tab.shortLabel}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span style={{
                  fontSize: '0.72rem',
                  background: active ? (tab.color.startsWith('var') ? 'rgba(59, 130, 246, 0.25)' : `${tab.color}33`) : 'rgba(255, 255, 255, 0.06)',
                  color: active ? (tab.color.startsWith('var') ? 'var(--accent-primary)' : tab.color) : 'var(--text-secondary)',
                  padding: '1px 6px',
                  borderRadius: '10px',
                  fontWeight: 700,
                  marginLeft: '2px'
                }}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 4. TAB CONTENT */}

      {/* TAB 1: ВЗАИМОРАСЧЁТЫ И ПРИЁМ ОПЛАТ */}
      {activeTab === 'TRANSACTIONS' && (
        <>
          {/* Controls Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '14px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '8px', flex: 1, minWidth: '240px' }}>
              <div className="search-input-wrapper" style={{ flex: 1 }}>
                <Search className="search-icon" size={16} />
                <input
                  type="text"
                  placeholder="Поиск по клиенту, телефону, договору, адресу..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                />
              </div>
            </div>

            {/* Payment Filter Badges */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {[
                { id: 'ALL', label: 'Все оплаты' },
                { id: 'PAID', label: '🟢 Оплачены 100%' },
                { id: 'PREPAYMENT', label: '🟡 Только аванс' },
                { id: 'UNPAID', label: '🔴 Без оплаты' },
                { id: 'DEBT', label: '⏳ Есть долг' }
              ].map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setPaymentFilter(f.id as PaymentStatusFilter)}
                  style={{
                    padding: '5px 10px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.78rem',
                    fontWeight: paymentFilter === f.id ? 600 : 400,
                    border: paymentFilter === f.id ? '1px solid var(--accent-primary)' : '1px solid var(--glass-border)',
                    background: paymentFilter === f.id ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                    color: paymentFilter === f.id ? '#60a5fa' : 'var(--text-secondary)',
                    cursor: 'pointer'
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Desktop Table View */}
          <div className="finances-desktop-table glass-panel" style={{ overflowX: 'auto', borderRadius: 'var(--radius-md)' }}>
            <table className="clients-table" style={{ width: '100%', fontSize: '0.85rem' }}>
              <thead>
                <tr>
                  <th style={{ padding: '12px 14px' }}>Договор / Заявка</th>
                  <th>Клиент</th>
                  <th>Статус</th>
                  <th>Сумма договора</th>
                  <th>Аванс (Факт)</th>
                  <th>Остаток (Факт)</th>
                  <th>Статус оплаты</th>
                  <th>С/с материалов</th>
                  <th>Монтаж</th>
                  <th>Прибыль</th>
                  <th style={{ textAlign: 'right' }}>Действия</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={11} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                      Сделок по выбранным фильтрам не найдено
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map(order => {
                    const statusObj = statuses.find(s => s.id === order.statusId);
                    const prep = order.prepayment || 0;
                    const rem = order.remainder != null ? order.remainder : Math.max(0, (order.totalPrice || 0) - prep);
                    const isFullyPaid = order.prepaymentPaid && order.remainderPaid;
                    const isPartiallyPaid = order.prepaymentPaid && !order.remainderPaid;

                    return (
                      <tr key={order.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                        {/* Order & Number */}
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                            {order.orderNumber ? `№ ${order.orderNumber}` : `#${order.id}`}
                          </div>
                          {order.address && (
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={order.address}>
                              {order.address}
                            </div>
                          )}
                        </td>

                        {/* Client */}
                        <td>
                          <div style={{ fontWeight: 500 }}>{order.clientName || 'Клиент'}</div>
                          {order.clientPhone && (
                            <a href={`tel:${order.clientPhone}`} style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', textDecoration: 'none' }}>
                              {order.clientPhone}
                            </a>
                          )}
                        </td>

                        {/* Status */}
                        <td>
                          {statusObj && (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '2px 8px',
                              borderRadius: '10px',
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              background: `${statusObj.color || '#3b82f6'}22`,
                              color: statusObj.color || '#60a5fa',
                              border: `1px solid ${statusObj.color || '#3b82f6'}44`
                            }}>
                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: statusObj.color || '#3b82f6' }} />
                              {statusObj.name}
                            </span>
                          )}
                        </td>

                        {/* Total Price */}
                        <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                          {(order.totalPrice || 0).toLocaleString('ru-RU')} ₽
                        </td>

                        {/* Prepayment Button */}
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <span style={{ fontWeight: 600 }}>{prep.toLocaleString('ru-RU')} ₽</span>
                            {order.prepaymentPaid ? (
                              <button
                                type="button"
                                onClick={() => handleTogglePrepayment(order.id, true)}
                                title={`Аванс получен: ${order.prepaymentPaidAt ? formatDateTimeInTimezone(order.prepaymentPaidAt, tenantSettings?.timezone) : 'да'}. Нажмите для отмены.`}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontSize: '0.7rem',
                                  padding: '2px 6px',
                                  background: 'rgba(34, 197, 94, 0.15)',
                                  border: '1px solid rgba(34, 197, 94, 0.3)',
                                  color: '#4ade80',
                                  borderRadius: '4px',
                                  cursor: 'pointer'
                                }}
                              >
                                <Check size={11} /> Получен
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleTogglePrepayment(order.id, false)}
                                title="Нажмите, чтобы отметить получение аванса"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontSize: '0.7rem',
                                  padding: '2px 6px',
                                  background: 'rgba(255, 255, 255, 0.04)',
                                  border: '1px solid var(--glass-border)',
                                  color: 'var(--text-secondary)',
                                  borderRadius: '4px',
                                  cursor: 'pointer'
                                }}
                              >
                                <Plus size={11} /> Принять
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Remainder Button */}
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <span style={{ fontWeight: 600 }}>{rem.toLocaleString('ru-RU')} ₽</span>
                            {order.remainderPaid ? (
                              <button
                                type="button"
                                onClick={() => handleToggleRemainder(order.id, true)}
                                title={`Остаток получен: ${order.remainderPaidAt ? formatDateTimeInTimezone(order.remainderPaidAt, tenantSettings?.timezone) : 'да'}. Нажмите для отмены.`}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontSize: '0.7rem',
                                  padding: '2px 6px',
                                  background: 'rgba(34, 197, 94, 0.15)',
                                  border: '1px solid rgba(34, 197, 94, 0.3)',
                                  color: '#4ade80',
                                  borderRadius: '4px',
                                  cursor: 'pointer'
                                }}
                              >
                                <Check size={11} /> Получен
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleToggleRemainder(order.id, false)}
                                title="Нажмите, чтобы отметить получение остатка"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontSize: '0.7rem',
                                  padding: '2px 6px',
                                  background: 'rgba(255, 255, 255, 0.04)',
                                  border: '1px solid var(--glass-border)',
                                  color: 'var(--text-secondary)',
                                  borderRadius: '4px',
                                  cursor: 'pointer'
                                }}
                              >
                                <Plus size={11} /> Принять
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Payment Summary Badge */}
                        <td>
                          {isFullyPaid ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#4ade80', fontSize: '0.75rem', fontWeight: 600 }}>
                              <CheckCircle2 size={13} /> Оплачен
                            </span>
                          ) : isPartiallyPaid ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#f59e0b', fontSize: '0.75rem', fontWeight: 600 }}>
                              <Clock size={13} /> Аванс
                            </span>
                          ) : (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#ef4444', fontSize: '0.75rem', fontWeight: 500 }}>
                              <AlertTriangle size={13} /> Не оплачен
                            </span>
                          )}
                        </td>

                        {/* Costs and Profit */}
                        <td style={{ color: 'var(--text-secondary)' }}>
                          {(order.materialsCost || 0).toLocaleString('ru-RU')} ₽
                        </td>
                        <td style={{ color: 'var(--text-secondary)' }}>
                          {(order.installationPrice || 0).toLocaleString('ru-RU')} ₽
                        </td>
                        <td style={{ fontWeight: 600, color: (order.profit || 0) >= 0 ? '#4ade80' : '#ef4444' }}>
                          {order.profit != null ? (
                            `${order.profit.toLocaleString('ru-RU')} ₽`
                          ) : (
                            `${((order.totalPrice || 0) - (order.materialsCost || 0) - (order.installationPrice || 0)).toLocaleString('ru-RU')} ₽`
                          )}
                          {order.profitMargin != null && (
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block' }}>
                              {order.profitMargin.toFixed(1)}%
                            </span>
                          )}
                        </td>

                        {/* Action: Open in Kanban */}
                        <td style={{ textAlign: 'right', padding: '10px 14px' }}>
                          <button
                            type="button"
                            onClick={() => navigate(`/kanban?orderId=${order.id}`)}
                            className="btn btn-ghost"
                            style={{ padding: '5px 8px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            title="Открыть сделку в Канбане"
                          >
                            <ExternalLink size={14} /> Открыть
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View (for Phones and Tablets) */}
          <div className="finances-mobile-cards">
            {filteredOrders.length === 0 ? (
              <div className="glass-panel" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                Сделок по выбранным фильтрам не найдено
              </div>
            ) : (
              filteredOrders.map(order => {
                const statusObj = statuses.find(s => s.id === order.statusId);
                const prep = order.prepayment || 0;
                const rem = order.remainder != null ? order.remainder : Math.max(0, (order.totalPrice || 0) - prep);
                const isFullyPaid = order.prepaymentPaid && order.remainderPaid;
                const isPartiallyPaid = order.prepaymentPaid && !order.remainderPaid;

                return (
                  <div 
                    key={order.id} 
                    className="glass-panel" 
                    style={{ 
                      padding: '16px', 
                      borderRadius: 'var(--radius-md)', 
                      border: isFullyPaid 
                        ? '1px solid rgba(34, 197, 94, 0.25)' 
                        : isPartiallyPaid 
                          ? '1px solid rgba(245, 158, 11, 0.25)' 
                          : '1px solid rgba(239, 68, 68, 0.25)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px'
                    }}
                  >
                    {/* Header: Number, Status & Total Sum */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
                          {order.orderNumber ? `№ ${order.orderNumber}` : `Заявка #${order.id}`}
                        </div>
                        {statusObj && (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '2px 8px',
                            borderRadius: '10px',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            marginTop: '4px',
                            background: `${statusObj.color || '#3b82f6'}22`,
                            color: statusObj.color || '#60a5fa',
                            border: `1px solid ${statusObj.color || '#3b82f6'}44`
                          }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: statusObj.color || '#3b82f6' }} />
                            {statusObj.name}
                          </span>
                        )}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Сумма сделки:</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {(order.totalPrice || 0).toLocaleString('ru-RU')} ₽
                        </div>
                      </div>
                    </div>

                    {/* Client & Address */}
                    <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '10px 12px', borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{order.clientName || 'Клиент'}</span>
                        {order.clientPhone && (
                          <a 
                            href={`tel:${order.clientPhone}`} 
                            style={{ 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              gap: '4px', 
                              fontSize: '0.8rem', 
                              color: 'var(--accent-primary)', 
                              textDecoration: 'none',
                              padding: '4px 8px',
                              background: 'rgba(59, 130, 246, 0.12)',
                              borderRadius: '6px'
                            }}
                          >
                            <Phone size={13} /> {order.clientPhone}
                          </a>
                        )}
                      </div>
                      {order.address && (
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                          📍 {order.address}
                        </div>
                      )}
                    </div>

                    {/* Payment Toggles (Prepayment & Remainder) */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      {/* Prepayment */}
                      <div style={{ 
                        padding: '10px', 
                        borderRadius: 'var(--radius-sm)', 
                        background: order.prepaymentPaid ? 'rgba(34, 197, 94, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                        border: order.prepaymentPaid ? '1px solid rgba(34, 197, 94, 0.2)' : '1px solid var(--glass-border)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '6px'
                      }}>
                        <div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Аванс:</div>
                          <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{prep.toLocaleString('ru-RU')} ₽</div>
                        </div>
                        {order.prepaymentPaid ? (
                          <button
                            type="button"
                            onClick={() => handleTogglePrepayment(order.id, true)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              padding: '6px',
                              background: 'rgba(34, 197, 94, 0.2)',
                              border: '1px solid rgba(34, 197, 94, 0.4)',
                              color: '#4ade80',
                              borderRadius: '6px',
                              cursor: 'pointer'
                            }}
                          >
                            <Check size={13} /> Оплачен
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleTogglePrepayment(order.id, false)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              padding: '6px',
                              background: 'rgba(255, 255, 255, 0.06)',
                              border: '1px solid var(--glass-border)',
                              color: 'var(--text-primary)',
                              borderRadius: '6px',
                              cursor: 'pointer'
                            }}
                          >
                            <Plus size={13} /> Принять
                          </button>
                        )}
                      </div>

                      {/* Remainder */}
                      <div style={{ 
                        padding: '10px', 
                        borderRadius: 'var(--radius-sm)', 
                        background: order.remainderPaid ? 'rgba(34, 197, 94, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                        border: order.remainderPaid ? '1px solid rgba(34, 197, 94, 0.2)' : '1px solid var(--glass-border)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '6px'
                      }}>
                        <div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Остаток:</div>
                          <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{rem.toLocaleString('ru-RU')} ₽</div>
                        </div>
                        {order.remainderPaid ? (
                          <button
                            type="button"
                            onClick={() => handleToggleRemainder(order.id, true)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              padding: '6px',
                              background: 'rgba(34, 197, 94, 0.2)',
                              border: '1px solid rgba(34, 197, 94, 0.4)',
                              color: '#4ade80',
                              borderRadius: '6px',
                              cursor: 'pointer'
                            }}
                          >
                            <Check size={13} /> Оплачен
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleToggleRemainder(order.id, false)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              padding: '6px',
                              background: 'rgba(255, 255, 255, 0.06)',
                              border: '1px solid var(--glass-border)',
                              color: 'var(--text-primary)',
                              borderRadius: '6px',
                              cursor: 'pointer'
                            }}
                          >
                            <Plus size={13} /> Принять
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Bottom row: Costs breakdown and Link to Kanban */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '6px', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        Материалы: {(order.materialsCost || 0).toLocaleString('ru-RU')} ₽ • Монтаж: {(order.installationPrice || 0).toLocaleString('ru-RU')} ₽
                      </div>
                      <button
                        type="button"
                        onClick={() => navigate(`/kanban?orderId=${order.id}`)}
                        className="btn btn-ghost"
                        style={{ padding: '4px 8px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <ExternalLink size={13} /> В Канбан
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {/* TAB 2: ДЕБИТОРСКАЯ ЗАДОЛЖЕННОСТЬ */}
      {activeTab === 'RECEIVABLES' && (
        <div>
          {/* Banner */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12), rgba(255, 255, 255, 0.02))',
            border: '1px solid rgba(245, 158, 11, 0.25)',
            borderRadius: 'var(--radius-md)',
            padding: '16px 20px',
            marginBottom: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div>
              <div style={{ fontSize: '0.9rem', color: '#f59e0b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertTriangle size={18} /> Дебиторская задолженность клиентов
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '3px' }}>
                Сделки, по которым клиенты ещё не внесли аванс или не доплатили остаток по договору
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Всего долг клиентов:</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f59e0b' }}>
                {debtorOrders.reduce((sum, o) => {
                  const p = !o.prepaymentPaid ? (o.prepayment || 0) : 0;
                  const r = !o.remainderPaid ? (o.remainder != null ? o.remainder : Math.max(0, (o.totalPrice || 0) - (o.prepayment || 0))) : 0;
                  return sum + p + r;
                }, 0).toLocaleString('ru-RU')} ₽
              </div>
            </div>
          </div>

          {/* Debtors List */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
            {debtorOrders.length === 0 ? (
              <div className="glass-panel" style={{ gridColumn: '1 / -1', padding: '32px', textAlign: 'center', color: '#4ade80' }}>
                <CheckCircle2 size={32} style={{ margin: '0 auto 10px' }} />
                <p style={{ margin: 0, fontWeight: 600 }}>Все сделки полностью оплачены! Дебиторской задолженности нет.</p>
              </div>
            ) : (
              debtorOrders.map(order => {
                const prep = order.prepayment || 0;
                const rem = order.remainder != null ? order.remainder : Math.max(0, (order.totalPrice || 0) - prep);
                const prepDebt = !order.prepaymentPaid ? prep : 0;
                const remDebt = !order.remainderPaid ? rem : 0;
                const totalDebt = prepDebt + remDebt;

                return (
                  <div key={order.id} className="glass-panel" style={{ padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                          {order.orderNumber ? `Договор № ${order.orderNumber}` : `Заявка #${order.id}`}
                        </div>
                        <div style={{ fontSize: '0.88rem', color: 'var(--text-primary)', marginTop: '2px' }}>
                          {order.clientName || 'Клиент'}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>К доплате:</span>
                        <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f59e0b' }}>
                          {totalDebt.toLocaleString('ru-RU')} ₽
                        </div>
                      </div>
                    </div>

                    {order.address && (
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        📍 {order.address}
                      </div>
                    )}

                    {/* Breakdown */}
                    <div style={{
                      display: 'flex',
                      gap: '8px',
                      padding: '8px',
                      background: 'rgba(255, 255, 255, 0.02)',
                      borderRadius: 'var(--radius-sm)',
                      marginBottom: '12px',
                      fontSize: '0.78rem'
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ color: 'var(--text-secondary)' }}>Аванс:</div>
                        <div style={{ fontWeight: 600, color: order.prepaymentPaid ? '#4ade80' : '#ef4444' }}>
                          {prep.toLocaleString('ru-RU')} ₽ {order.prepaymentPaid ? '✓ Оплачен' : '✗ Долг'}
                        </div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ color: 'var(--text-secondary)' }}>Остаток:</div>
                        <div style={{ fontWeight: 600, color: order.remainderPaid ? '#4ade80' : '#ef4444' }}>
                          {rem.toLocaleString('ru-RU')} ₽ {order.remainderPaid ? '✓ Оплачен' : '✗ Долг'}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      {order.clientPhone ? (
                        <a
                          href={`tel:${order.clientPhone}`}
                          className="btn btn-ghost"
                          style={{
                            color: 'var(--success)',
                            padding: '6px 10px',
                            background: 'rgba(34, 197, 94, 0.1)',
                            border: '1px solid rgba(34, 197, 94, 0.25)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            textDecoration: 'none',
                            fontSize: '0.8rem',
                            fontWeight: 600
                          }}
                        >
                          <Phone size={13} /> Позвонить: {order.clientPhone}
                        </a>
                      ) : <div />}

                      <div style={{ display: 'flex', gap: '6px' }}>
                        {!order.prepaymentPaid && (
                          <button
                            type="button"
                            onClick={() => handleTogglePrepayment(order.id, false)}
                            className="btn btn-primary"
                            style={{ fontSize: '0.75rem', padding: '5px 8px' }}
                          >
                            + Аванс ({prep.toLocaleString('ru-RU')} ₽)
                          </button>
                        )}
                        {!order.remainderPaid && (
                          <button
                            type="button"
                            onClick={() => handleToggleRemainder(order.id, false)}
                            className="btn btn-primary"
                            style={{ fontSize: '0.75rem', padding: '5px 8px', background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
                          >
                            + Остаток ({rem.toLocaleString('ru-RU')} ₽)
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 3: РАСХОДЫ КОМПАНИИ */}
      {activeTab === 'EXPENSES' && (
        <div>
          {/* Controls Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '14px', flexWrap: 'wrap' }}>
            {/* Category Filter */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => setExpenseCategoryFilter('ALL')}
                style={{
                  padding: '5px 10px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.78rem',
                  fontWeight: expenseCategoryFilter === 'ALL' ? 600 : 400,
                  border: expenseCategoryFilter === 'ALL' ? '1px solid var(--accent-primary)' : '1px solid var(--glass-border)',
                  background: expenseCategoryFilter === 'ALL' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                  color: expenseCategoryFilter === 'ALL' ? '#60a5fa' : 'var(--text-secondary)',
                  cursor: 'pointer'
                }}
              >
                Все категории ({expenses.length})
              </button>
              {EXPENSE_CATEGORIES.map(cat => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setExpenseCategoryFilter(cat.value)}
                  style={{
                    padding: '5px 10px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.78rem',
                    fontWeight: expenseCategoryFilter === cat.value ? 600 : 400,
                    border: expenseCategoryFilter === cat.value ? '1px solid var(--accent-primary)' : '1px solid var(--glass-border)',
                    background: expenseCategoryFilter === cat.value ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                    color: expenseCategoryFilter === cat.value ? '#60a5fa' : 'var(--text-secondary)',
                    cursor: 'pointer'
                  }}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Add Expense Button */}
            <button
              type="button"
              onClick={openCreateExpenseModal}
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={16} /> Добавить расход
            </button>
          </div>

          {/* Expenses Desktop Table */}
          <div className="finances-expenses-desktop glass-panel" style={{ overflowX: 'auto', borderRadius: 'var(--radius-md)' }}>
            <table className="clients-table" style={{ width: '100%', fontSize: '0.85rem' }}>
              <thead>
                <tr>
                  <th style={{ padding: '12px 14px' }}>Дата</th>
                  <th>Категория</th>
                  <th>Назначение расхода</th>
                  <th>Привязка к сделке</th>
                  <th>Сумма (₽)</th>
                  <th>Автор</th>
                  <th style={{ textAlign: 'right' }}>Действия</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                      Расходов за выбранный период не зафиксировано
                    </td>
                  </tr>
                ) : (
                  filteredExpenses.map(exp => (
                    <tr key={exp.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                        {formatDateOnly(exp.expenseDate)}
                      </td>
                      <td>
                        <span style={{
                          fontSize: '0.74rem',
                          fontWeight: 600,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: 'rgba(239, 68, 68, 0.12)',
                          color: '#f87171',
                          border: '1px solid rgba(239, 68, 68, 0.25)'
                        }}>
                          {exp.categoryLabel || exp.category}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{exp.title}</div>
                        {exp.comment && (
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                            {exp.comment}
                          </div>
                        )}
                      </td>
                      <td>
                        {exp.orderId ? (
                          <button
                            type="button"
                            onClick={() => navigate(`/kanban?orderId=${exp.orderId}`)}
                            className="btn btn-ghost"
                            style={{ padding: '2px 6px', fontSize: '0.74rem', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                          >
                            <FileText size={12} /> {exp.orderNumber ? `№ ${exp.orderNumber}` : `#${exp.orderId}`} {exp.clientName ? `(${exp.clientName})` : ''}
                          </button>
                        ) : (
                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>—</span>
                        )}
                      </td>
                      <td style={{ fontWeight: 700, color: '#ef4444', fontSize: '0.95rem' }}>
                        −{(exp.amount || 0).toLocaleString('ru-RU')} ₽
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                        {exp.createdByName || '—'}
                      </td>
                      <td style={{ textAlign: 'right', padding: '10px 14px' }}>
                        <div style={{ display: 'inline-flex', gap: '4px' }}>
                          <button
                            type="button"
                            onClick={() => openEditExpenseModal(exp)}
                            className="btn-icon"
                            title="Редактировать расход"
                            style={{ padding: '6px' }}
                          >
                            <Edit3 size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteExpense(exp.id, exp.title)}
                            className="btn-icon"
                            title="Удалить расход"
                            style={{ padding: '6px', color: 'var(--danger)' }}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Expenses Mobile Cards */}
          <div className="finances-expenses-mobile">
            {filteredExpenses.length === 0 ? (
              <div className="glass-panel" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                Расходов за выбранный период не зафиксировано
              </div>
            ) : (
              filteredExpenses.map(exp => {
                const catObj = EXPENSE_CATEGORIES.find(c => c.value === exp.category);
                return (
                  <div key={exp.id} className="glass-panel" style={{ padding: '14px', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <span style={{
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          background: 'rgba(239, 68, 68, 0.12)',
                          color: '#f87171',
                          padding: '2px 8px',
                          borderRadius: '10px',
                          display: 'inline-block',
                          marginBottom: '4px',
                          border: '1px solid rgba(239, 68, 68, 0.25)'
                        }}>
                          {catObj?.label || exp.category}
                        </span>
                        <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                          {exp.title}
                        </div>
                      </div>
                      <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ef4444' }}>
                        −{exp.amount.toLocaleString('ru-RU')} ₽
                      </div>
                    </div>

                    {exp.comment && (
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', background: 'rgba(255, 255, 255, 0.02)', padding: '6px 10px', borderRadius: '4px' }}>
                        {exp.comment}
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.76rem', color: 'var(--text-secondary)', borderTop: '1px solid rgba(255, 255, 255, 0.04)', paddingTop: '8px' }}>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <span>📅 {formatDateOnly(exp.expenseDate)}</span>
                        {exp.orderId && (
                          <button
                            type="button"
                            onClick={() => navigate(`/kanban?orderId=${exp.orderId}`)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--accent-primary)',
                              fontSize: '0.76rem',
                              cursor: 'pointer',
                              padding: 0,
                              textDecoration: 'underline'
                            }}
                          >
                            Заказ #{exp.orderId}
                          </button>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => openEditExpenseModal(exp)}
                          className="btn-icon"
                          style={{ width: '28px', height: '28px' }}
                          title="Редактировать расход"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteExpense(exp.id, exp.title)}
                          className="btn-icon delete"
                          style={{ width: '28px', height: '28px', color: 'var(--danger)' }}
                          title="Удалить расход"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 4: РАСЧЁТЫ С МОНТАЖНИКАМИ */}
      {activeTab === 'INSTALLERS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {installersSummary.map(item => {
            const isExpanded = expandedInstallerId === item.employee.id;
            return (
              <div key={item.employee.id} className="glass-panel" style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                <div 
                  onClick={() => setExpandedInstallerId(isExpanded ? null : item.employee.id)}
                  style={{
                    padding: '16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    background: isExpanded ? 'rgba(255, 255, 255, 0.04)' : 'transparent',
                    flexWrap: 'wrap',
                    gap: '12px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {item.employee.avatarUrl ? (
                      <img src={item.employee.avatarUrl} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                        {item.employee.name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{item.employee.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {item.employee.position || 'Монтажник'} {item.employee.phone ? `• ${item.employee.phone}` : ''}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Завершено монтажей:</div>
                      <div style={{ fontWeight: 700, color: '#4ade80' }}>
                        {item.completedCount} шт. ({item.completedEarnings.toLocaleString('ru-RU')} ₽)
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>В работе:</div>
                      <div style={{ fontWeight: 600, color: '#f59e0b' }}>
                        {item.inProgressCount} шт. ({item.inProgressEarnings.toLocaleString('ru-RU')} ₽)
                      </div>
                    </div>
                    <div>
                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div style={{ padding: '12px 16px', borderTop: '1px solid var(--glass-border)', background: 'rgba(0, 0, 0, 0.15)' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '8px', color: 'var(--text-secondary)' }}>
                      Объекты и сделки монтажника ({item.orders.length}):
                    </div>
                    <div className="finances-installers-desktop">
                      <table style={{ width: '100%', fontSize: '0.8rem' }}>
                        <thead>
                          <tr style={{ color: 'var(--text-secondary)', textAlign: 'left' }}>
                            <th style={{ padding: '6px 0' }}>Договор / Объект</th>
                            <th>Клиент</th>
                            <th>Дата завершения</th>
                            <th>Сумма за монтаж</th>
                            <th>Статус</th>
                          </tr>
                        </thead>
                        <tbody>
                          {item.orders.map(ord => {
                            const isComp = isCompletedStatus(ord.statusId);
                            const st = statuses.find(s => s.id === ord.statusId);
                            return (
                              <tr key={ord.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.03)' }}>
                                <td style={{ padding: '6px 0' }}>
                                  <span style={{ fontWeight: 600 }}>{ord.orderNumber ? `№ ${ord.orderNumber}` : `#${ord.id}`}</span>
                                  {ord.address && <span style={{ color: 'var(--text-secondary)', marginLeft: '6px' }}>({ord.address})</span>}
                                </td>
                                <td>{ord.clientName || '—'}</td>
                                <td>{ord.installedAt ? formatDateOnly(ord.installedAt) : (ord.installationDate ? formatDateOnly(ord.installationDate) : '—')}</td>
                                <td style={{ fontWeight: 700, color: '#60a5fa' }}>
                                  {(ord.installationPrice || 0).toLocaleString('ru-RU')} ₽
                                </td>
                                <td>
                                  <span style={{ fontSize: '0.72rem', color: isComp ? '#4ade80' : '#f59e0b', fontWeight: 600 }}>
                                    {st?.name || (isComp ? 'Завершен' : 'В работе')}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Card List for Installer Orders */}
                    <div className="finances-installers-mobile">
                      {item.orders.map(ord => {
                        const isComp = isCompletedStatus(ord.statusId);
                        const st = statuses.find(s => s.id === ord.statusId);
                        return (
                          <div key={ord.id} style={{ padding: '8px 10px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                                {ord.orderNumber ? `№ ${ord.orderNumber}` : `#${ord.id}`} • {ord.clientName || 'Клиент'}
                              </div>
                              {ord.address && <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>📍 {ord.address}</div>}
                              <div style={{ fontSize: '0.7rem', color: isComp ? '#4ade80' : '#f59e0b', marginTop: '2px', fontWeight: 600 }}>
                                {st?.name || (isComp ? 'Завершен' : 'В работе')} {ord.installedAt ? `• ${formatDateOnly(ord.installedAt)}` : ''}
                              </div>
                            </div>
                            <div style={{ fontWeight: 700, color: '#60a5fa', fontSize: '0.95rem', textAlign: 'right', flexShrink: 0 }}>
                              {(ord.installationPrice || 0).toLocaleString('ru-RU')} ₽
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 5: ДВИЖЕНИЕ СРЕДСТВ И P&L */}
      {activeTab === 'PL_STRUCTURE' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Visual Flow Balance */}
          <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--radius-md)' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <PieChart size={20} style={{ color: 'var(--accent-primary)' }} /> Структура движения денежных средств (ДДС)
            </h3>

            {/* Visual Bar */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '6px' }}>
                <span style={{ color: '#4ade80', fontWeight: 600 }}>
                  Приход: +{metrics.totalCashInflow.toLocaleString('ru-RU')} ₽ (100%)
                </span>
                <span style={{ color: '#ef4444', fontWeight: 600 }}>
                  Расход: −{metrics.totalCashOutflow.toLocaleString('ru-RU')} ₽
                </span>
              </div>
              <div style={{ height: '14px', borderRadius: '7px', background: 'rgba(255, 255, 255, 0.05)', overflow: 'hidden', display: 'flex' }}>
                <div style={{
                  width: `${metrics.totalCashInflow > 0 ? Math.min(100, ((metrics.materialsCost) / metrics.totalCashInflow) * 100) : 0}%`,
                  background: '#f59e0b'
                }} title={`Материалы: ${metrics.materialsCost.toLocaleString('ru-RU')} ₽`} />
                <div style={{
                  width: `${metrics.totalCashInflow > 0 ? Math.min(100, ((metrics.completedInstallationsCost) / metrics.totalCashInflow) * 100) : 0}%`,
                  background: '#60a5fa'
                }} title={`Монтаж: ${metrics.completedInstallationsCost.toLocaleString('ru-RU')} ₽`} />
                <div style={{
                  width: `${metrics.totalCashInflow > 0 ? Math.min(100, ((metrics.totalExpenses) / metrics.totalCashInflow) * 100) : 0}%`,
                  background: '#ef4444'
                }} title={`Расходы компании: ${metrics.totalExpenses.toLocaleString('ru-RU')} ₽`} />
                <div style={{
                  width: `${metrics.totalCashInflow > 0 ? Math.max(0, ((metrics.netCashProfit) / metrics.totalCashInflow) * 100) : 0}%`,
                  background: '#4ade80'
                }} title={`Чистая прибыль: ${metrics.netCashProfit.toLocaleString('ru-RU')} ₽`} />
              </div>
              {/* Legend */}
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '10px', fontSize: '0.78rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#f59e0b' }} />
                  <span>Себестоимость материалов: <strong>{metrics.materialsCost.toLocaleString('ru-RU')} ₽</strong></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#60a5fa' }} />
                  <span>Оплата монтажных работ: <strong>{metrics.completedInstallationsCost.toLocaleString('ru-RU')} ₽</strong></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#ef4444' }} />
                  <span>Прочие расходы компании: <strong>{metrics.totalExpenses.toLocaleString('ru-RU')} ₽</strong></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#4ade80' }} />
                  <span>Чистый остаток кассы: <strong>{metrics.netCashProfit.toLocaleString('ru-RU')} ₽</strong></span>
                </div>
              </div>
            </div>

            {/* P&L Statement Table */}
            <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '16px' }}>
              <table style={{ width: '100%', fontSize: '0.88rem' }}>
                <tbody>
                  <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                    <td style={{ padding: '8px 0', fontWeight: 600 }}>1. Фактический приход денежных средств</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#4ade80' }}>+{metrics.totalCashInflow.toLocaleString('ru-RU')} ₽</td>
                  </tr>
                  <tr style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                    <td style={{ padding: '4px 0 4px 16px' }}>— Полученные авансы клиентов</td>
                    <td style={{ textAlign: 'right' }}>+{metrics.receivedPrepayments.toLocaleString('ru-RU')} ₽</td>
                  </tr>
                  <tr style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                    <td style={{ padding: '4px 0 8px 16px' }}>— Полученные доплаты (остатки)</td>
                    <td style={{ textAlign: 'right' }}>+{metrics.receivedRemainders.toLocaleString('ru-RU')} ₽</td>
                  </tr>

                  <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                    <td style={{ padding: '8px 0', fontWeight: 600 }}>2. Фактические затраты и выплаты</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#ef4444' }}>−{metrics.totalCashOutflow.toLocaleString('ru-RU')} ₽</td>
                  </tr>
                  <tr style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                    <td style={{ padding: '4px 0 4px 16px' }}>— Себестоимость комплектующих и материалов</td>
                    <td style={{ textAlign: 'right' }}>−{metrics.materialsCost.toLocaleString('ru-RU')} ₽</td>
                  </tr>
                  <tr style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                    <td style={{ padding: '4px 0 4px 16px' }}>— Вознаграждение монтажникам (выполненные монтажи)</td>
                    <td style={{ textAlign: 'right' }}>−{metrics.completedInstallationsCost.toLocaleString('ru-RU')} ₽</td>
                  </tr>
                  <tr style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                    <td style={{ padding: '4px 0 8px 16px' }}>— Статьи операционных расходов компании</td>
                    <td style={{ textAlign: 'right' }}>−{metrics.totalExpenses.toLocaleString('ru-RU')} ₽</td>
                  </tr>

                  <tr style={{ background: 'rgba(255, 255, 255, 0.03)' }}>
                    <td style={{ padding: '12px 10px', fontWeight: 700, fontSize: '1rem' }}>ИТОГО ЧИСТЫЙ ДЕНЕЖНЫЙ РЕЗУЛЬТАТ:</td>
                    <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: 700, fontSize: '1.2rem', color: metrics.netCashProfit >= 0 ? '#4ade80' : '#ef4444' }}>
                      {metrics.netCashProfit.toLocaleString('ru-RU')} ₽
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 5. ADD / EDIT EXPENSE MODAL */}
      {isExpenseModalOpen && createPortal(
        <div className="modal-overlay" onClick={() => setIsExpenseModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h2>{editingExpenseId ? 'Редактировать расход' : 'Новый расход компании'}</h2>
              <button type="button" onClick={() => setIsExpenseModalOpen(false)} className="btn-icon">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveExpense}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="form-group">
                  <label>Название / Назначение платежа *</label>
                  <input
                    type="text"
                    required
                    placeholder="Например: Аренда офиса за Август или Реклама в Яндексе"
                    value={expenseFormData.title}
                    onChange={(e) => setExpenseFormData({ ...expenseFormData, title: e.target.value })}
                    className="search-input"
                    style={{ width: '100%' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <div className="form-group" style={{ flex: 1, minWidth: '180px' }}>
                    <label>Категория расхода *</label>
                    <select
                      value={expenseFormData.category}
                      onChange={(e) => setExpenseFormData({ ...expenseFormData, category: e.target.value as ExpenseCategory })}
                      className="custom-select"
                      style={{ width: '100%' }}
                    >
                      {EXPENSE_CATEGORIES.map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group" style={{ flex: 1, minWidth: '140px' }}>
                    <label>Сумма расхода (₽) *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      placeholder="0"
                      value={expenseFormData.amount}
                      onChange={(e) => setExpenseFormData({ ...expenseFormData, amount: e.target.value })}
                      className="custom-number-input"
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <div className="form-group" style={{ flex: 1, minWidth: '180px' }}>
                    <label>Дата расхода *</label>
                    <input
                      type="date"
                      required
                      value={expenseFormData.expenseDate}
                      onChange={(e) => setExpenseFormData({ ...expenseFormData, expenseDate: e.target.value })}
                      className="custom-date-input"
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div className="form-group" style={{ flex: 1, minWidth: '180px' }}>
                    <label>Привязка к сделке (опционально)</label>
                    <select
                      value={expenseFormData.orderId}
                      onChange={(e) => setExpenseFormData({ ...expenseFormData, orderId: e.target.value })}
                      className="custom-select"
                      style={{ width: '100%' }}
                    >
                      <option value="">Без привязки (общефирменный)</option>
                      {orders.map(ord => (
                        <option key={ord.id} value={ord.id}>
                          {ord.orderNumber ? `№ ${ord.orderNumber}` : `#${ord.id}`} — {ord.clientName || 'Клиент'}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Комментарий / Примечание</label>
                  <textarea
                    rows={2}
                    placeholder="Дополнительные детали платежа..."
                    value={expenseFormData.comment}
                    onChange={(e) => setExpenseFormData({ ...expenseFormData, comment: e.target.value })}
                    className="search-input"
                    style={{ width: '100%', resize: 'vertical' }}
                  />
                </div>
              </div>

              <div className="modal-actions" style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" onClick={() => setIsExpenseModalOpen(false)} className="btn btn-ghost">
                  Отмена
                </button>
                <button type="submit" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <Check size={16} /> Сохранить расход
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Status Configuration Modal */}
      {isStatusConfigModalOpen && createPortal(
        <div className="modal-overlay" onClick={() => !savingStatusSettings && setIsStatusConfigModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px', width: '95%' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <SlidersHorizontal size={20} style={{ color: 'var(--accent-primary)' }} />
                <h2 style={{ margin: 0, fontSize: '1.15rem' }}>Статусы, учитываемые в финансах</h2>
              </div>
              <button 
                type="button" 
                onClick={() => setIsStatusConfigModalOpen(false)}
                className="btn-icon"
                aria-label="Close"
                disabled={savingStatusSettings}
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body" style={{ padding: '16px 20px' }}>
              <p style={{ margin: '0 0 16px 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Отметьте этапы и статусы воронки, заявки из которых должны формировать кассу, выручку, дебиторку и финансовые отчеты (P&L):
              </p>

              <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                <button
                  type="button"
                  onClick={() => {
                    const allTrue: Record<number, boolean> = {};
                    statuses.forEach(s => { allTrue[s.id] = true; });
                    setTempStatusSettings(allTrue);
                  }}
                  style={{
                    fontSize: '0.78rem',
                    padding: '5px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid var(--glass-border)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer'
                  }}
                >
                  Выбрать все
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const allFalse: Record<number, boolean> = {};
                    statuses.forEach(s => { allFalse[s.id] = false; });
                    setTempStatusSettings(allFalse);
                  }}
                  style={{
                    fontSize: '0.78rem',
                    padding: '5px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid var(--glass-border)',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer'
                  }}
                >
                  Снять все
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '360px', overflowY: 'auto' }}>
                {statuses.map(st => {
                  const isChecked = tempStatusSettings[st.id] !== false;
                  const count = orders.filter(o => o.statusId === st.id).length;

                  return (
                    <label
                      key={st.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        borderRadius: 'var(--radius-sm)',
                        background: isChecked ? 'rgba(59, 130, 246, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                        border: isChecked ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid var(--glass-border)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span 
                          style={{ 
                            width: '12px', 
                            height: '12px', 
                            borderRadius: '50%', 
                            backgroundColor: st.color || '#3b82f6',
                            flexShrink: 0
                          }} 
                        />
                        <span style={{ fontWeight: 600, fontSize: '0.9rem', color: isChecked ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                          {st.name}
                        </span>
                        <span style={{
                          fontSize: '0.75rem',
                          color: 'var(--text-secondary)',
                          background: 'rgba(255, 255, 255, 0.06)',
                          padding: '2px 7px',
                          borderRadius: '8px'
                        }}>
                          {count} заявок
                        </span>
                      </div>

                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          setTempStatusSettings(prev => ({ ...prev, [st.id]: e.target.checked }));
                        }}
                        style={{
                          width: '18px',
                          height: '18px',
                          accentColor: 'var(--accent-primary)',
                          cursor: 'pointer'
                        }}
                      />
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="modal-actions" style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setIsStatusConfigModalOpen(false)}
                className="btn btn-ghost"
                disabled={savingStatusSettings}
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleSaveStatusSettings}
                disabled={savingStatusSettings}
                className="btn btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Check size={16} /> {savingStatusSettings ? 'Сохранение...' : 'Применить и сохранить'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
