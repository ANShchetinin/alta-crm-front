import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/useAuthStore';
import { useTenantQueryKey } from '../../../hooks/queries/useTenantQueryKey';
import { ordersQueryOptions, ORDERS_QUERY_KEY } from '../../../hooks/queries/useOrdersQuery';
import { orderStatusesQueryOptions, useOrderStatusesQuery } from '../../../hooks/queries/useOrderStatusesQuery';
import { useEmployeesQuery } from '../../../hooks/queries/useEmployeesQuery';
import { getExpenses, type Expense } from '../../../api/finances';
import { getCompanyAiUsageSummary, type AiUsageSummaryDto } from '../../../api/aiUsage';
import type { Order, OrderStatus } from '../../../api/kanban';
import type { Employee } from '../../../api/employees';
import { toLocalDateString } from '../../../utils/dateUtils';
import type { DateRange } from '../utils/financeCalculations';

const AI_USAGE_QUERY_KEY = ['companyAiUsage'] as const;
const EXPENSES_QUERY_KEY = ['expenses'] as const;
const EMPTY_ORDERS: Order[] = [];
const EMPTY_EXPENSES: Expense[] = [];
const EMPTY_STATUSES: OrderStatus[] = [];
const EMPTY_EMPLOYEES: Employee[] = [];

/** Данные страницы финансов (заказы, расходы, статусы, сотрудники) и точечные обновления их кеша. */
export const useFinanceData = () => {
  const queryClient = useQueryClient();
  const tenantId = useAuthStore(state => state.tenantId);
  const { data: statuses = EMPTY_STATUSES, isLoading: statusesLoading } = useOrderStatusesQuery();
  const { data: employees = EMPTY_EMPLOYEES, isLoading: employeesLoading } = useEmployeesQuery();
  const allOrdersOptions = ordersQueryOptions(tenantId, 'all');
  const { data: orders = EMPTY_ORDERS, isLoading: ordersLoading } = useQuery(allOrdersOptions);
  const expensesKey = useTenantQueryKey(EXPENSES_QUERY_KEY);
  const { data: expenses = EMPTY_EXPENSES, isLoading: expensesLoading } = useQuery({
    queryKey: expensesKey,
    queryFn: () => getExpenses()
  });

  const updateCachedOrder = (orderId: number, patch: Partial<Order>) => {
    queryClient.setQueryData<Order[]>(allOrdersOptions.queryKey, prev => prev?.map(o => (o.id === orderId ? { ...o, ...patch } : o)));
    // Доска и архив подтянут отметку об оплате при следующем открытии, без лишних запросов сейчас
    queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEY, refetchType: 'none' });
  };

  const setExpenses = (updater: (prev: Expense[]) => Expense[]) => {
    queryClient.setQueryData<Expense[]>(expensesKey, prev => updater(prev ?? EMPTY_EXPENSES));
  };

  const setStatuses = (updated: OrderStatus[]) => {
    queryClient.setQueryData(orderStatusesQueryOptions(tenantId).queryKey, updated);
  };

  return {
    orders,
    expenses,
    statuses,
    employees,
    loading: ordersLoading || expensesLoading || statusesLoading || employeesLoading,
    updateCachedOrder,
    setExpenses,
    setStatuses
  };
};

/** Сводка расходов компании на ИИ за период; при открытии всегда сверяется с сервером. */
export const useAiUsageSummary = (range: DateRange) => {
  const baseKey = useTenantQueryKey(AI_USAGE_QUERY_KEY);
  // Границы периода — локальные даты: toISOString сдвинул бы начало месяца на день назад (UTC)
  const from = range.from ? toLocalDateString(range.from) : undefined;
  const to = range.to ? toLocalDateString(range.to) : undefined;
  const { data, isFetching, refetch } = useQuery<AiUsageSummaryDto>({
    queryKey: [...baseKey, from, to],
    queryFn: () => getCompanyAiUsageSummary(from, to),
    placeholderData: keepPreviousData,
    // Расходы на ИИ растут с каждым обращением: при открытии всегда сверяемся с сервером
    staleTime: 0
  });
  return { summary: data ?? null, loading: isFetching, reload: () => refetch() };
};
