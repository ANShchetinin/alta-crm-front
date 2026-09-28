import { CalendarDays, Eye, EyeOff, Plus, Search, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { MobileViewMode } from '../../hooks/useBoardPreferences';
import type { ReminderFilter } from '../../utils/board';

interface KanbanToolbarProps {
  isMobile: boolean;
  isWorker: boolean;
  hideEmptyColumns: boolean;
  onToggleHideEmpty: () => void;
  mobileViewMode: MobileViewMode;
  onMobileViewModeChange: (mode: MobileViewMode) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  reminderFilter: ReminderFilter;
  onReminderFilterChange: (filter: ReminderFilter) => void;
  onOpenCalendar: () => void;
  onCreateOrder: () => void;
}

const REMINDER_FILTERS: { value: ReminderFilter; label: string; activeClass: string }[] = [
  { value: 'all', label: 'Все', activeClass: 'active' },
  { value: 'today', label: '⏰ Сегодня', activeClass: 'active-today' },
  { value: 'overdue', label: '🔥 Просроченные', activeClass: 'active-overdue' }
];

/** Панель доски: календарь, скрытие пустых колонок, вид на телефоне, поиск и фильтр напоминаний. */
export const KanbanToolbar = ({
  isMobile,
  isWorker,
  hideEmptyColumns,
  onToggleHideEmpty,
  mobileViewMode,
  onMobileViewModeChange,
  searchQuery,
  onSearchChange,
  reminderFilter,
  onReminderFilterChange,
  onOpenCalendar,
  onCreateOrder
}: KanbanToolbarProps) => {
  const { t } = useTranslation();

  return (
    <div className="kanban-header">
      <div className="kanban-toolbar-left">
        <button type="button" onClick={onOpenCalendar} className="kanban-toolbar-btn" title="Открыть календарь монтажей и замеров">
          <CalendarDays size={15} style={{ color: 'var(--accent-primary)' }} />
          <span>Календарь</span>
        </button>

        <button
          type="button"
          onClick={onToggleHideEmpty}
          className={`kanban-toolbar-btn ${hideEmptyColumns ? 'active' : ''}`}
          title={hideEmptyColumns ? 'Показать все колонки статусов' : 'Скрыть колонки, в которых нет заявок'}
        >
          {hideEmptyColumns ? <Eye size={15} /> : <EyeOff size={15} />}
          <span>{hideEmptyColumns ? 'Показать все' : 'Скрыть пустые'}</span>
        </button>

        {isMobile && (
          <div className="kanban-mobile-view-toggle">
            <button
              type="button"
              className={`kanban-view-mode-btn ${mobileViewMode === 'list' ? 'active' : ''}`}
              onClick={() => onMobileViewModeChange('list')}
            >
              Список
            </button>
            <button
              type="button"
              className={`kanban-view-mode-btn ${mobileViewMode === 'board' ? 'active' : ''}`}
              onClick={() => onMobileViewModeChange('board')}
            >
              Доска
            </button>
          </div>
        )}

        <div className="search-input-wrapper kanban-search-wrapper">
          <Search className="search-icon" size={15} />
          <input
            type="text"
            placeholder="Поиск по клиенту, адресу, № договора..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="search-input"
            style={{ width: '100%', paddingRight: searchQuery ? '32px' : '12px' }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="btn-icon"
              style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', padding: '2px', color: 'var(--text-secondary)' }}
              title="Очистить поиск"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {!isWorker && (
          <div className="kanban-reminder-segmented">
            {REMINDER_FILTERS.map(filter => (
              <button
                key={filter.value}
                type="button"
                onClick={() => onReminderFilterChange(filter.value)}
                className={`kanban-reminder-tab ${reminderFilter === filter.value ? filter.activeClass : ''}`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {!isWorker && isMobile && (
        <button className="btn btn-primary kanban-mobile-create-btn" onClick={onCreateOrder}>
          <Plus size={17} /> {t('kanban.addOrder')}
        </button>
      )}
    </div>
  );
};
