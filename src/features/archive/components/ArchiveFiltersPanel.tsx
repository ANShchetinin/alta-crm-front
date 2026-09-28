import { ArrowDown, ArrowUp, ArrowUpDown, Calendar, CalendarDays, RotateCcw, Search, Tag, User, X, type LucideIcon } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import type { OrderStatus } from '../../../api/kanban';
import type { Employee } from '../../../api/employees';
import {
  ALL,
  MONTHS,
  SORT_OPTIONS,
  activeFiltersCount,
  type ArchiveFilters,
  type SortDirection,
  type SortField
} from '../utils/archiveOrders';

interface ArchiveFiltersPanelProps {
  filters: ArchiveFilters;
  onChange: (changes: Partial<ArchiveFilters>) => void;
  onReset: () => void;
  years: string[];
  /** Сотрудники для фильтра; пустой список — фильтр скрыт (монтажнику он недоступен). */
  employees: Employee[];
  statuses: OrderStatus[];
  sortField: SortField;
  sortDirection: SortDirection;
  onSortFieldChange: (field: SortField) => void;
  onToggleSortDirection: () => void;
  foundCount: number;
  totalCount: number;
  /** Сумма найденных заявок; не задана — сумма скрыта (монтажнику). */
  totalSum?: number;
}

const FilterPill = ({ active, icon: Icon, label, children, className = '', style }: {
  active: boolean;
  icon: LucideIcon;
  label: string;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) => (
  <div className={`archive-filter-pill ${active ? 'active' : ''} ${className}`.trim()} style={style}>
    <Icon size={14} className="filter-pill-icon" />
    <span className="filter-pill-label">{label}</span>
    {children}
  </div>
);

/** Поиск, фильтры по году, месяцу, сотруднику и статусу, сортировка и итоги найденного. */
export const ArchiveFiltersPanel = ({
  filters,
  onChange,
  onReset,
  years,
  employees,
  statuses,
  sortField,
  sortDirection,
  onSortFieldChange,
  onToggleSortDirection,
  foundCount,
  totalCount,
  totalSum
}: ArchiveFiltersPanelProps) => {
  const filtersCount = activeFiltersCount(filters);

  return (
    <div className="archive-filters-panel">
      <div className="archive-search-row">
        <div className="archive-search-box">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Поиск по номеру, клиенту, телефону, адресу, сотруднику..."
            value={filters.search}
            onChange={e => onChange({ search: e.target.value })}
            className="archive-search-input"
          />
          {filters.search && (
            <button type="button" onClick={() => onChange({ search: '' })} className="archive-search-clear" title="Очистить поиск">
              <X size={15} />
            </button>
          )}
        </div>

        {filtersCount > 0 && (
          <button type="button" onClick={onReset} className="btn-archive-reset" title="Сбросить все фильтры">
            <RotateCcw size={14} />
            <span>Сбросить ({filtersCount})</span>
          </button>
        )}
      </div>

      <div className="archive-filters-row">
        <FilterPill active={filters.year !== ALL} icon={Calendar} label="Год:">
          <select value={filters.year} onChange={e => onChange({ year: e.target.value })} className="archive-select">
            <option value={ALL}>Все годы</option>
            {years.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </FilterPill>

        <FilterPill active={filters.month !== ALL} icon={CalendarDays} label="Месяц:">
          <select value={filters.month} onChange={e => onChange({ month: e.target.value })} className="archive-select">
            <option value={ALL}>Все месяцы</option>
            {MONTHS.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </FilterPill>

        {employees.length > 0 && (
          <FilterPill active={filters.employeeId !== ALL} icon={User} label="Сотрудник:">
            <select value={filters.employeeId} onChange={e => onChange({ employeeId: e.target.value })} className="archive-select">
              <option value={ALL}>Все сотрудники</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </select>
          </FilterPill>
        )}

        {statuses.length > 0 && (
          <FilterPill active={filters.statusId !== ALL} icon={Tag} label="Статус:">
            <select value={filters.statusId} onChange={e => onChange({ statusId: e.target.value })} className="archive-select">
              <option value={ALL}>Все статусы</option>
              {statuses.map(st => (
                <option key={st.id} value={st.id}>{st.name}</option>
              ))}
            </select>
          </FilterPill>
        )}

        <FilterPill active={false} icon={ArrowUpDown} label="Сортировка:" className="sort-pill" style={{ marginLeft: 'auto' }}>
          <select value={sortField} onChange={e => onSortFieldChange(e.target.value as SortField)} className="archive-select">
            {SORT_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={onToggleSortDirection}
            className="btn-sort-dir"
            title={sortDirection === 'asc' ? 'По возрастанию' : 'По убыванию'}
          >
            {sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
          </button>
        </FilterPill>
      </div>

      <div className="archive-stats-bar">
        <div>
          Найдено: <strong>{foundCount}</strong> из {totalCount} заявок
          {filtersCount > 0 && (
            <span style={{ color: 'var(--accent-primary)', marginLeft: '8px' }}>
              (применены фильтры: {filtersCount})
            </span>
          )}
        </div>
        {foundCount > 0 && totalSum !== undefined && (
          <div>
            Общая сумма: <strong style={{ color: 'var(--text-primary)', fontSize: '0.95rem' }}>{totalSum.toLocaleString('ru-RU')} ₽</strong>
          </div>
        )}
      </div>
    </div>
  );
};
