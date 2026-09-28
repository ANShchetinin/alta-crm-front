import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import type { Order } from '../api/kanban';
import { useAppStore } from '../store/useAppStore';
import { useFinanceData, useAiUsageSummary } from '../features/finances/hooks/useFinanceData';
import { isCompletedStatus } from '../utils/orderStatus';
import { usePaymentToggles } from '../features/finances/hooks/usePaymentToggles';
import { useExpenseEditor } from '../features/finances/hooks/useExpenseEditor';
import { useFinanceStatusSettings } from '../features/finances/hooks/useFinanceStatusSettings';
import {
  calculateCashMetrics,
  filterExpenses,
  filterFinanceOrders,
  filterTransactions,
  getDebtorOrders,
  getPeriodRange,
  summarizeInstallers,
  type PaymentStatusFilter,
  type PeriodFilter
} from '../features/finances/utils/financeCalculations';
import { FinancesHeader } from '../features/finances/components/FinancesHeader';
import { FinanceKpiPanel } from '../features/finances/components/FinanceKpiPanel';
import { FinanceTabsBar, type FinanceTab } from '../features/finances/components/FinanceTabsBar';
import { TransactionsTab } from '../features/finances/components/transactions/TransactionsTab';
import { ReceivablesTab } from '../features/finances/components/ReceivablesTab';
import { ExpensesTab } from '../features/finances/components/ExpensesTab';
import { InstallersTab } from '../features/finances/components/InstallersTab';
import { CashFlowTab } from '../features/finances/components/CashFlowTab';
import { AiCostsTab } from '../features/finances/components/AiCostsTab';
import { ExpenseModal } from '../features/finances/components/ExpenseModal';
import { StatusConfigModal } from '../features/finances/components/StatusConfigModal';
import '../styles/clients.css';

export const Finances = () => {
  const navigate = useNavigate();
  const { tenantSettings } = useAppStore();
  const timezone = tenantSettings?.timezone;

  const [activeTab, setActiveTab] = useState<FinanceTab>('TRANSACTIONS');
  const [period, setPeriod] = useState<PeriodFilter>('THIS_MONTH');
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<PaymentStatusFilter>('ALL');
  const [expenseCategory, setExpenseCategory] = useState('ALL');

  const { orders, expenses, statuses, employees, loading, updateCachedOrder, setExpenses, setStatuses } = useFinanceData();
  const range = useMemo(() => getPeriodRange(period), [period]);
  const aiUsage = useAiUsageSummary(range);
  const { togglePrepayment, toggleRemainder } = usePaymentToggles(updateCachedOrder);
  const expenseEditor = useExpenseEditor(setExpenses);
  const statusSettings = useFinanceStatusSettings(statuses, setStatuses);

  const isOrderCompleted = useCallback(
    (order: Order) => isCompletedStatus(statuses.find(s => s.id === order.statusId)),
    [statuses]
  );
  const financeOrders = useMemo(() => filterFinanceOrders(orders, statuses), [orders, statuses]);
  const metrics = useMemo(
    () => calculateCashMetrics(financeOrders, expenses, range, isOrderCompleted),
    [financeOrders, expenses, range, isOrderCompleted]
  );
  const transactions = useMemo(
    () => filterTransactions(financeOrders, searchQuery, paymentFilter, range),
    [financeOrders, searchQuery, paymentFilter, range]
  );
  const debtors = useMemo(() => getDebtorOrders(financeOrders), [financeOrders]);
  const installers = useMemo(
    () => summarizeInstallers(employees, financeOrders, range, isOrderCompleted),
    [employees, financeOrders, range, isOrderCompleted]
  );
  const visibleExpenses = useMemo(() => filterExpenses(expenses, expenseCategory, range), [expenses, expenseCategory, range]);

  const openOrder = (orderId: number) => navigate(`/kanban?orderId=${orderId}`);

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
    <div className="clients-wrapper" style={{ minHeight: '100%', height: 'auto', overflowY: 'visible' }}>
      <FinancesHeader
        statuses={statuses}
        period={period}
        onPeriodChange={setPeriod}
        onOpenStatusConfig={statusSettings.open}
      />

      <FinanceKpiPanel metrics={metrics} expensesCount={visibleExpenses.length} />

      <FinanceTabsBar
        activeTab={activeTab}
        onChange={setActiveTab}
        counts={{
          TRANSACTIONS: transactions.length,
          RECEIVABLES: debtors.length,
          EXPENSES: visibleExpenses.length,
          INSTALLERS: installers.length,
          AI_COSTS: aiUsage.summary?.totalRequestsCount
        }}
      />

      {activeTab === 'TRANSACTIONS' && (
        <TransactionsTab
          orders={transactions}
          statuses={statuses}
          timezone={timezone}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          paymentFilter={paymentFilter}
          onPaymentFilterChange={setPaymentFilter}
          onTogglePrepayment={togglePrepayment}
          onToggleRemainder={toggleRemainder}
          onOpenOrder={openOrder}
        />
      )}

      {activeTab === 'RECEIVABLES' && (
        <ReceivablesTab debtors={debtors} onTogglePrepayment={togglePrepayment} onToggleRemainder={toggleRemainder} />
      )}

      {activeTab === 'EXPENSES' && (
        <ExpensesTab
          totalCount={expenses.length}
          expenses={visibleExpenses}
          category={expenseCategory}
          onCategoryChange={setExpenseCategory}
          onCreate={expenseEditor.openCreate}
          onEdit={expenseEditor.openEdit}
          onDelete={expenseEditor.remove}
          onOpenOrder={openOrder}
        />
      )}

      {activeTab === 'INSTALLERS' && (
        <InstallersTab installers={installers} statuses={statuses} isCompleted={isOrderCompleted} />
      )}

      {activeTab === 'PL_STRUCTURE' && <CashFlowTab metrics={metrics} />}

      {activeTab === 'AI_COSTS' && (
        <AiCostsTab
          summary={aiUsage.summary}
          loading={aiUsage.loading}
          onReload={aiUsage.reload}
          timezone={timezone}
          onOpenOrder={openOrder}
        />
      )}

      {expenseEditor.isOpen && (
        <ExpenseModal
          isEditing={expenseEditor.editingId !== null}
          form={expenseEditor.form}
          onChange={expenseEditor.setForm}
          orders={orders}
          onSave={expenseEditor.save}
          onClose={expenseEditor.close}
        />
      )}

      {statusSettings.isOpen && (
        <StatusConfigModal
          statuses={statuses}
          orders={orders}
          settings={statusSettings.settings}
          saving={statusSettings.saving}
          onToggle={statusSettings.setIncluded}
          onSetAll={statusSettings.setAll}
          onSave={statusSettings.save}
          onClose={statusSettings.close}
        />
      )}
    </div>
  );
};
