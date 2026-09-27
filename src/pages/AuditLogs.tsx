import React, { useState, useEffect } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { 
  ShieldCheck, 
  Search, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { getAuditLogs, type AuditLogItem, type AuditEntityType, type AuditActionType } from '../api/auditLogs';
import { useTenantQueryKey } from '../hooks/queries/useTenantQueryKey';
import { formatTimeAgo, formatDateTime } from '../utils/dateUtils';
import { toast } from '../utils/toast';
import '../styles/audit-logs.css';

const ENTITY_LABELS: Record<AuditEntityType, string> = {
  ORDER: 'Заказ',
  CLIENT: 'Клиент',
  EMPLOYEE: 'Сотрудник',
  TENANT: 'Настройки компании',
  CONTRACT_TEMPLATE: 'Шаблон договора',
  EXPENSE: 'Расход',
  MATERIAL: 'Склад',
  AUTH: 'Безопасность',
};

type AuditPeriod = 'today' | '7days' | '30days' | 'all';

const AUDIT_LOGS_QUERY_KEY = ['auditLogs'] as const;
const PAGE_SIZE = 20;
const EMPTY_LOGS: AuditLogItem[] = [];

const getDateRange = (selectedPeriod: AuditPeriod): { from?: string } => {
  const now = new Date();
  if (selectedPeriod === 'today') {
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    return { from: startOfDay.toISOString() };
  }
  if (selectedPeriod === '7days') {
    return { from: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString() };
  }
  if (selectedPeriod === '30days') {
    return { from: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString() };
  }
  return {};
};

export const AuditLogs: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<number>(0);

  // Filters
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [selectedEntity, setSelectedEntity] = useState<AuditEntityType | ''>('');
  const [selectedAction, setSelectedAction] = useState<AuditActionType | ''>('');
  const [period, setPeriod] = useState<AuditPeriod>('7days');

  const baseKey = useTenantQueryKey(AUDIT_LOGS_QUERY_KEY);
  const search = debouncedSearch.trim() || undefined;
  const { data, isFetching: loading, error, refetch } = useQuery({
    // Период, а не дата «от»: дата вычисляется в момент запроса, иначе ключ менялся бы каждый рендер
    queryKey: [...baseKey, { page: currentPage, search, selectedEntity, selectedAction, period }],
    queryFn: () => getAuditLogs({
      page: currentPage,
      size: PAGE_SIZE,
      search,
      entityType: selectedEntity || undefined,
      actionType: selectedAction || undefined,
      from: getDateRange(period).from,
    }),
    placeholderData: keepPreviousData,
    // Журнал пополняется постоянно: при открытии всегда сверяемся с сервером, показывая кеш до ответа
    staleTime: 0
  });
  const logs = data?.content ?? EMPTY_LOGS;
  const totalElements = data?.totalElements ?? 0;
  const totalPages = data?.totalPages ?? 0;

  useEffect(() => {
    if (error) {
      console.error('Failed to load audit logs', error);
      toast.error('Не удалось загрузить журнал аудита');
    }
  }, [error]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(0);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const getActionBadge = (action: AuditActionType) => {
    if (action.includes('CREATED') || action.includes('UPLOADED') || action.includes('SUCCESS')) {
      return <span className="audit-badge audit-badge-create">+ Создание / Загрузка</span>;
    }
    if (action.includes('DELETED')) {
      return <span className="audit-badge audit-badge-delete">× Удаление</span>;
    }
    if (action.includes('STATUS')) {
      return <span className="audit-badge audit-badge-status">⇄ Смена статуса</span>;
    }
    if (action.includes('SETTINGS') || action.includes('CONFIG')) {
      return <span className="audit-badge audit-badge-settings">⚙ Настройки</span>;
    }
    return <span className="audit-badge audit-badge-update">✎ Изменение</span>;
  };

  const getInitials = (name?: string) => {
    if (!name) return 'A';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="audit-logs-container">
      {/* Header */}
      <div className="audit-logs-header">
        <div className="audit-logs-title">
          <ShieldCheck size={28} style={{ color: 'var(--accent-primary, #3b82f6)' }} />
          <div>
            <h1>Журнал важных событий</h1>
            <div className="audit-logs-subtitle">
              Полный аудит значимых действий пользователей в системе (доступно только владельцу)
            </div>
          </div>
        </div>

        <button 
          className="btn btn-secondary" 
          onClick={() => refetch()}
          disabled={loading}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <RefreshCw size={16} className={loading ? 'spin' : ''} />
          <span>Обновить</span>
        </button>
      </div>

      {/* Filters Card */}
      <div className="audit-filters-card">
        <div className="audit-filters-row">
          <div className="audit-search-input-wrapper">
            <Search size={16} />
            <input
              type="text"
              className="audit-search-input"
              placeholder="Поиск по описанию, сотруднику или объекту..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            className="audit-select"
            value={selectedEntity}
            onChange={e => {
              setSelectedEntity(e.target.value as AuditEntityType | '');
              setCurrentPage(0);
            }}
          >
            <option value="">Все объекты</option>
            <option value="ORDER">Заявки</option>
            <option value="CLIENT">Клиенты</option>
            <option value="EMPLOYEE">Сотрудники</option>
            <option value="TENANT">Настройки компании</option>
            <option value="CONTRACT_TEMPLATE">Шаблоны договоров</option>
            <option value="EXPENSE">Расходы</option>
            <option value="MATERIAL">Склад</option>
          </select>

          <select
            className="audit-select"
            value={selectedAction}
            onChange={e => {
              setSelectedAction(e.target.value as AuditActionType | '');
              setCurrentPage(0);
            }}
          >
            <option value="">Все действия</option>
            <option value="ORDER_CREATED">Создание заявки</option>
            <option value="ORDER_STATUS_CHANGED">Смена статуса заявки</option>
            <option value="ORDER_UPDATED">Редактирование заявки</option>
            <option value="ORDER_DELETED">Удаление заявки</option>
            <option value="CLIENT_CREATED">Создание клиента</option>
            <option value="CLIENT_UPDATED">Редактирование клиента</option>
            <option value="CLIENT_DELETED">Удаление клиента</option>
            <option value="EMPLOYEE_CREATED">Создание сотрудника</option>
            <option value="EMPLOYEE_UPDATED">Редактирование сотрудника</option>
            <option value="EMPLOYEE_DELETED">Удаление сотрудника</option>
            <option value="TENANT_SETTINGS_CHANGED">Настройки компании</option>
            <option value="CONTRACT_TEMPLATE_UPLOADED">Загрузка шаблона</option>
            <option value="CONTRACT_TEMPLATE_DELETED">Удаление шаблона</option>
          </select>

          <div className="audit-period-pills">
            <button
              type="button"
              className={`audit-period-btn ${period === 'today' ? 'active' : ''}`}
              onClick={() => { setPeriod('today'); setCurrentPage(0); }}
            >
              Сегодня
            </button>
            <button
              type="button"
              className={`audit-period-btn ${period === '7days' ? 'active' : ''}`}
              onClick={() => { setPeriod('7days'); setCurrentPage(0); }}
            >
              7 дней
            </button>
            <button
              type="button"
              className={`audit-period-btn ${period === '30days' ? 'active' : ''}`}
              onClick={() => { setPeriod('30days'); setCurrentPage(0); }}
            >
              30 дней
            </button>
            <button
              type="button"
              className={`audit-period-btn ${period === 'all' ? 'active' : ''}`}
              onClick={() => { setPeriod('all'); setCurrentPage(0); }}
            >
              Все время
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading && logs.length === 0 ? (
        <div className="audit-empty-state">
          <RefreshCw size={36} className="spin" />
          <p>Загрузка записей аудита...</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="audit-empty-state">
          <AlertCircle size={40} />
          <h3>Событий не найдено</h3>
          <p>По выбранным фильтрам записей в журнале пока нет.</p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="audit-table-wrapper">
            <table className="audit-table">
              <thead>
                <tr>
                  <th style={{ width: '160px' }}>Время</th>
                  <th style={{ width: '220px' }}>Инициатор</th>
                  <th style={{ width: '150px' }}>Объект</th>
                  <th style={{ width: '160px' }}>Тип события</th>
                  <th>Описание действия</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                        {formatDateTime(log.createdAt)}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {formatTimeAgo(log.createdAt)}
                      </div>
                    </td>
                    <td>
                      <div className="audit-actor-pill">
                        <div className="audit-actor-avatar">
                          {getInitials(log.actorName || log.actorEmail)}
                        </div>
                        <div className="audit-actor-info">
                          <span className="audit-actor-name">{log.actorName || log.actorEmail || 'Система'}</span>
                          <span className="audit-actor-role">{log.actorRole || 'Пользователь'}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="audit-entity-tag">
                        {ENTITY_LABELS[log.entityType] || log.entityType}
                      </span>
                    </td>
                    <td>
                      {getActionBadge(log.actionType)}
                    </td>
                    <td>
                      <div style={{ wordBreak: 'break-word', lineHeight: 1.4 }}>
                        {log.description}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List */}
          <div className="audit-mobile-list">
            {logs.map(log => (
              <div key={log.id} className="audit-mobile-card">
                <div className="audit-mobile-card-header">
                  <span className="audit-entity-tag">
                    {ENTITY_LABELS[log.entityType] || log.entityType}
                  </span>
                  <span className="audit-mobile-card-time">
                    {formatTimeAgo(log.createdAt)}
                  </span>
                </div>

                <div className="audit-mobile-card-body">
                  <div style={{ marginBottom: '6px' }}>
                    {getActionBadge(log.actionType)}
                  </div>
                  <strong>{log.description}</strong>
                </div>

                <div className="audit-mobile-card-footer">
                  <div className="audit-actor-pill">
                    <div className="audit-actor-avatar" style={{ width: 22, height: 22, fontSize: '0.68rem' }}>
                      {getInitials(log.actorName || log.actorEmail)}
                    </div>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                      {log.actorName || log.actorEmail || 'Система'}
                    </span>
                  </div>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                    {formatDateTime(log.createdAt)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="audit-pagination">
              <div className="audit-pagination-info">
                Показано {logs.length} из {totalElements} записей (Страница {currentPage + 1} из {totalPages})
              </div>

              <div className="audit-pagination-controls">
                <button
                  className="btn btn-secondary"
                  disabled={currentPage === 0 || loading}
                  onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 12px' }}
                >
                  <ChevronLeft size={16} />
                  <span>Назад</span>
                </button>

                <button
                  className="btn btn-secondary"
                  disabled={currentPage >= totalPages - 1 || loading}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 12px' }}
                >
                  <span>Вперед</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AuditLogs;
