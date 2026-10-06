import { Search } from 'lucide-react';
import type { Order, OrderStatus } from '../../../../api/kanban';
import type { PaymentStatusFilter } from '../../utils/financeCalculations';
import { FilterChip } from '../FilterChip';
import { TransactionsTable } from './TransactionsTable';
import { TransactionCards } from './TransactionCards';

export interface TransactionsViewProps {
  orders: Order[];
  statuses: OrderStatus[];
  timezone?: string;
  onTogglePrepayment: (orderId: number, currentlyPaid: boolean) => void;
  onToggleRemainder: (orderId: number, currentlyPaid: boolean) => void;
  onOpenOrder: (orderId: number) => void;
}

interface TransactionsTabProps extends TransactionsViewProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  paymentFilter: PaymentStatusFilter;
  onPaymentFilterChange: (filter: PaymentStatusFilter) => void;
}

const PAYMENT_FILTERS: { id: PaymentStatusFilter; label: string }[] = [
  { id: 'ALL', label: 'Все оплаты' },
  { id: 'PAID', label: '🟢 Оплачены 100%' },
  { id: 'PREPAYMENT', label: '🟡 Оплачены частично' },
  { id: 'UNPAID', label: '🔴 Без оплаты' },
  { id: 'DEBT', label: '⏳ Есть долг' }
];

/** Вкладка взаиморасчетов: поиск, фильтр по оплате и отметка получения аванса/остатка. */
export const TransactionsTab = ({ searchQuery, onSearchChange, paymentFilter, onPaymentFilterChange, ...view }: TransactionsTabProps) => (
  <>
    <div className="finances-controls-bar">
      <div style={{ display: 'flex', gap: '8px', flex: 1, minWidth: '240px', width: '100%' }}>
        <div className="search-input-wrapper" style={{ flex: 1, width: '100%' }}>
          <Search className="search-icon" size={16} />
          <input
            type="text"
            placeholder="Поиск по клиенту, телефону, договору, адресу..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="search-input"
            style={{ width: '100%' }}
          />
        </div>
      </div>

      <div className="finances-payment-filters">
        {PAYMENT_FILTERS.map(filter => (
          <FilterChip key={filter.id} active={paymentFilter === filter.id} onClick={() => onPaymentFilterChange(filter.id)}>
            {filter.label}
          </FilterChip>
        ))}
      </div>
    </div>

    <TransactionsTable {...view} />
    <TransactionCards {...view} />
  </>
);
