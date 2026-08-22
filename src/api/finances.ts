import { api } from './axiosConfig';

export type ExpenseCategory =
  | 'RENT'
  | 'MARKETING'
  | 'LOGISTICS'
  | 'TOOLS'
  | 'TAXES'
  | 'UTILITIES'
  | 'SALARY'
  | 'OTHER';

export const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: 'RENT', label: 'Аренда' },
  { value: 'MARKETING', label: 'Маркетинг и реклама' },
  { value: 'LOGISTICS', label: 'Логистика и доставка' },
  { value: 'TOOLS', label: 'Инструмент и оборудование' },
  { value: 'TAXES', label: 'Налоги и сборы' },
  { value: 'UTILITIES', label: 'Связь и хознужды' },
  { value: 'SALARY', label: 'Зарплаты и премии' },
  { value: 'OTHER', label: 'Прочие расходы' },
];

export interface Expense {
  id: number;
  title: string;
  category: ExpenseCategory;
  categoryLabel?: string;
  amount: number;
  expenseDate: string;
  orderId?: number;
  orderNumber?: string;
  clientName?: string;
  comment?: string;
  createdById?: number;
  createdByName?: string;
  createdAt: string;
}

export const getExpenses = async (from?: string, to?: string): Promise<Expense[]> => {
  const params: any = {};
  if (from) params.from = from;
  if (to) params.to = to;
  const response = await api.get('/expenses', { params });
  return response.data;
};

export const createExpense = async (data: Partial<Expense>): Promise<Expense> => {
  const response = await api.post('/expenses', data);
  return response.data;
};

export const updateExpense = async (id: number, data: Partial<Expense>): Promise<Expense> => {
  const response = await api.put(`/expenses/${id}`, data);
  return response.data;
};

export const deleteExpense = async (id: number): Promise<void> => {
  await api.delete(`/expenses/${id}`);
};
