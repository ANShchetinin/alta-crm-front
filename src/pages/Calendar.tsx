import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  Phone, 
  LayoutDashboard
} from 'lucide-react';
import { type CalendarEventDto, getCalendarEvents } from '../api/calendar';
import { getEmployees, type Employee } from '../api/employees';
import { useAuthStore } from '../store/useAuthStore';
import '../styles/calendar.css';

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export const Calendar: React.FC = () => {
  const navigate = useNavigate();
  const role = useAuthStore(state => state.role);
  const isWorker = role === 'WORKER';

  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'agenda'>('month');
  
  const [filterMeasurement, setFilterMeasurement] = useState(true);
  const [filterInstallation, setFilterInstallation] = useState(true);
  const [filterReminder, setFilterReminder] = useState(!isWorker);
  
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | undefined>(undefined);
  const [employees, setEmployees] = useState<Employee[]>([]);
  
  const [events, setEvents] = useState<CalendarEventDto[]>([]);

  useEffect(() => {
    if (!isWorker) {
      getEmployees().then(setEmployees).catch(console.error);
    }
  }, [isWorker]);

  const activeTypes = useMemo(() => {
    const types: string[] = [];
    if (filterMeasurement) types.push('MEASUREMENT');
    if (filterInstallation) types.push('INSTALLATION');
    if (filterReminder && !isWorker) types.push('REMINDER');
    return types;
  }, [filterMeasurement, filterInstallation, filterReminder, isWorker]);

  // Calculate Date Bounds
  const { rangeStart, rangeEnd } = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    if (viewMode === 'month') {
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);

      // Pad to start on Monday and end on Sunday
      const startDayOffset = (firstDay.getDay() + 6) % 7;
      const start = new Date(year, month, 1 - startDayOffset, 0, 0, 0);

      const endDayOffset = (7 - lastDay.getDay()) % 7;
      const end = new Date(year, month + 1, endDayOffset, 23, 59, 59);

      return { rangeStart: start, rangeEnd: end };
    } else if (viewMode === 'week') {
      const dayOffset = (currentDate.getDay() + 6) % 7;
      const start = new Date(currentDate);
      start.setDate(currentDate.getDate() - dayOffset);
      start.setHours(0, 0, 0, 0);

      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);

      return { rangeStart: start, rangeEnd: end };
    } else {
      // Agenda (from today - 3 days to + 30 days)
      const start = new Date(currentDate);
      start.setDate(start.getDate() - 3);
      start.setHours(0, 0, 0, 0);

      const end = new Date(currentDate);
      end.setDate(end.getDate() + 30);
      end.setHours(23, 59, 59, 999);

      return { rangeStart: start, rangeEnd: end };
    }
  }, [currentDate, viewMode]);

  const fetchEvents = async () => {
    try {
      const data = await getCalendarEvents({
        start: rangeStart.toISOString(),
        end: rangeEnd.toISOString(),
        types: activeTypes,
        employeeId: selectedEmployeeId
      });
      setEvents(data);
    } catch (err) {
      console.error('Failed to fetch calendar events', err);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [rangeStart, rangeEnd, activeTypes, selectedEmployeeId]);

  // Navigation handlers
  const handlePrev = () => {
    const next = new Date(currentDate);
    if (viewMode === 'month') {
      next.setMonth(next.getMonth() - 1);
    } else if (viewMode === 'week') {
      next.setDate(next.getDate() - 7);
    } else {
      next.setDate(next.getDate() - 7);
    }
    setCurrentDate(next);
  };

  const handleNext = () => {
    const next = new Date(currentDate);
    if (viewMode === 'month') {
      next.setMonth(next.getMonth() + 1);
    } else if (viewMode === 'week') {
      next.setDate(next.getDate() + 7);
    } else {
      next.setDate(next.getDate() + 7);
    }
    setCurrentDate(next);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const formattedHeaderTitle = useMemo(() => {
    if (viewMode === 'month') {
      return currentDate.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
    } else if (viewMode === 'week') {
      const startStr = rangeStart.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
      const endStr = rangeEnd.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
      return `${startStr} — ${endStr}`;
    } else {
      return `Повестка: ${currentDate.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}`;
    }
  }, [currentDate, viewMode, rangeStart, rangeEnd]);

  // Month grid days builder
  const monthDays = useMemo(() => {
    if (viewMode !== 'month') return [];
    const days = [];
    const curr = new Date(rangeStart);
    const today = new Date();

    while (curr <= rangeEnd) {
      const dateKey = curr.toISOString().split('T')[0];
      const isCurrentMonth = curr.getMonth() === currentDate.getMonth();
      const isToday = curr.getDate() === today.getDate() && 
                      curr.getMonth() === today.getMonth() && 
                      curr.getFullYear() === today.getFullYear();

      // Events on this day
      const dayEvents = events.filter(e => {
        const eDate = new Date(e.start);
        return eDate.getFullYear() === curr.getFullYear() &&
               eDate.getMonth() === curr.getMonth() &&
               eDate.getDate() === curr.getDate();
      });

      days.push({
        date: new Date(curr),
        dateKey,
        dayNumber: curr.getDate(),
        isCurrentMonth,
        isToday,
        events: dayEvents
      });

      curr.setDate(curr.getDate() + 1);
    }
    return days;
  }, [rangeStart, rangeEnd, currentDate, events, viewMode]);

  // Week days builder
  const weekDays = useMemo(() => {
    if (viewMode !== 'week') return [];
    const days = [];
    const curr = new Date(rangeStart);
    const today = new Date();

    while (curr <= rangeEnd) {
      const dateKey = curr.toISOString().split('T')[0];
      const isToday = curr.getDate() === today.getDate() && 
                      curr.getMonth() === today.getMonth() && 
                      curr.getFullYear() === today.getFullYear();

      const dayEvents = events.filter(e => {
        const eDate = new Date(e.start);
        return eDate.getFullYear() === curr.getFullYear() &&
               eDate.getMonth() === curr.getMonth() &&
               eDate.getDate() === curr.getDate();
      });

      days.push({
        date: new Date(curr),
        dateKey,
        dayNumber: curr.getDate(),
        dayName: WEEKDAYS[(curr.getDay() + 6) % 7],
        isToday,
        events: dayEvents
      });

      curr.setDate(curr.getDate() + 1);
    }
    return days;
  }, [rangeStart, rangeEnd, events, viewMode]);

  // Agenda groups builder
  const agendaGroups = useMemo(() => {
    if (viewMode !== 'agenda') return [];
    const groups: { [key: string]: { dateStr: string; isToday: boolean; events: CalendarEventDto[] } } = {};
    const today = new Date();
    const todayKey = today.toISOString().split('T')[0];

    events.forEach(e => {
      const eDate = new Date(e.start);
      const key = eDate.toISOString().split('T')[0];
      if (!groups[key]) {
        groups[key] = {
          dateStr: eDate.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }),
          isToday: key === todayKey,
          events: []
        };
      }
      groups[key].events.push(e);
    });

    return Object.keys(groups).sort().map(k => groups[k]);
  }, [events, viewMode]);

  const handleEventClick = (event: CalendarEventDto) => {
    if (event.orderId) {
      navigate(`/kanban?orderId=${event.orderId}`);
    }
  };

  return (
    <div className="calendar-page-container animate-fade-in">
      {/* Верхний тулбар */}
      <div className="calendar-header-toolbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          {/* Переход к Канбану */}
          <button
            type="button"
            onClick={() => navigate('/kanban')}
            className="btn btn-ghost"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              border: '1px solid var(--glass-border)',
              borderRadius: 'var(--radius-md)',
              padding: '6px 12px',
              fontSize: '0.85rem',
              fontWeight: 600
            }}
          >
            <LayoutDashboard size={16} />
            Канбан-доска
          </button>

          {/* Навигация по датам */}
          <div className="calendar-nav-controls">
            <button type="button" onClick={handlePrev} className="btn-icon" title="Назад">
              <ChevronLeft size={18} />
            </button>
            <button type="button" onClick={handleToday} className="btn btn-ghost" style={{ fontSize: '0.82rem', fontWeight: 600, padding: '4px 10px' }}>
              Сегодня
            </button>
            <button type="button" onClick={handleNext} className="btn-icon" title="Вперед">
              <ChevronRight size={18} />
            </button>
            <span className="calendar-current-title">{formattedHeaderTitle}</span>
          </div>
        </div>

        {/* Фильтры и переключатель режима */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Фильтры по типам событий */}
          <div className="calendar-filters-row">
            <div
              className={`calendar-type-pill measurement ${!filterMeasurement ? 'disabled' : ''}`}
              onClick={() => setFilterMeasurement(!filterMeasurement)}
              title="Показать / скрыть замеры"
            >
              <span>📏</span>
              <span>Замеры</span>
            </div>
            <div
              className={`calendar-type-pill installation ${!filterInstallation ? 'disabled' : ''}`}
              onClick={() => setFilterInstallation(!filterInstallation)}
              title="Показать / скрыть монтажи"
            >
              <span>🔨</span>
              <span>Монтажи</span>
            </div>
            {!isWorker && (
              <div
                className={`calendar-type-pill reminder ${!filterReminder ? 'disabled' : ''}`}
                onClick={() => setFilterReminder(!filterReminder)}
                title="Показать / скрыть напоминания и звонки"
              >
                <span>⏰</span>
                <span>Напоминания</span>
              </div>
            )}
          </div>

          {/* Выбор сотрудника */}
          {!isWorker && employees.length > 0 && (
            <select
              value={selectedEmployeeId || ''}
              onChange={e => setSelectedEmployeeId(e.target.value ? parseInt(e.target.value) : undefined)}
              className="search-input"
              style={{ height: '34px', fontSize: '0.82rem', padding: '0 8px' }}
            >
              <option value="">Все сотрудники</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </select>
          )}

          {/* Режимы отображения */}
          <div className="calendar-view-mode-toggle">
            <button
              type="button"
              className={`calendar-view-mode-btn ${viewMode === 'month' ? 'active' : ''}`}
              onClick={() => setViewMode('month')}
            >
              Месяц
            </button>
            <button
              type="button"
              className={`calendar-view-mode-btn ${viewMode === 'week' ? 'active' : ''}`}
              onClick={() => setViewMode('week')}
            >
              Неделя
            </button>
            <button
              type="button"
              className={`calendar-view-mode-btn ${viewMode === 'agenda' ? 'active' : ''}`}
              onClick={() => setViewMode('agenda')}
            >
              Список
            </button>
          </div>
        </div>
      </div>

      {/* Основная сетка Календаря */}
      {viewMode === 'month' && (
        <div className="calendar-month-grid">
          <div className="calendar-weekdays-header">
            {WEEKDAYS.map(day => (
              <div key={day} className="calendar-weekday-cell">
                {day}
              </div>
            ))}
          </div>

          <div className="calendar-month-body">
            {monthDays.map(d => (
              <div
                key={d.dateKey}
                className={`calendar-day-cell ${!d.isCurrentMonth ? 'other-month' : ''} ${d.isToday ? 'today' : ''}`}
              >
                <div className="calendar-day-header">
                  <span className="calendar-day-number">{d.dayNumber}</span>
                  {d.events.length > 0 && (
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                      {d.events.length}
                    </span>
                  )}
                </div>

                <div className="calendar-day-events-list">
                  {d.events.map(ev => {
                    const timeStr = !ev.allDay
                      ? new Date(ev.start).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
                      : '';
                    const typeClass = ev.type.toLowerCase();
                    const overdueClass = ev.isOverdue ? 'overdue' : '';

                    return (
                      <div
                        key={ev.id}
                        onClick={() => handleEventClick(ev)}
                        className={`calendar-event-item ${typeClass} ${overdueClass}`}
                        title={`${ev.title}\nКлиент: ${ev.clientName}${ev.clientPhone ? ` (${ev.clientPhone})` : ''}\nАдрес: ${ev.address || '—'}`}
                      >
                        <span>{ev.type === 'MEASUREMENT' ? '📏' : (ev.type === 'INSTALLATION' ? '🔨' : '⏰')}</span>
                        {timeStr && <span style={{ opacity: 0.9 }}>{timeStr}</span>}
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.clientName}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Режим: Неделя */}
      {viewMode === 'week' && (
        <div className="calendar-month-grid" style={{ minHeight: '400px' }}>
          <div className="calendar-weekdays-header">
            {weekDays.map(d => (
              <div key={d.dateKey} className="calendar-weekday-cell" style={{ background: d.isToday ? 'rgba(59, 130, 246, 0.08)' : 'transparent' }}>
                <div>{d.dayName}</div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: d.isToday ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
                  {d.dayNumber}
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', flex: 1, overflowY: 'auto' }}>
            {weekDays.map(d => (
              <div
                key={d.dateKey}
                style={{
                  borderRight: '1px solid var(--glass-border)',
                  padding: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  background: d.isToday ? 'rgba(59, 130, 246, 0.02)' : 'transparent'
                }}
              >
                {d.events.map(ev => {
                  const timeStr = !ev.allDay
                    ? new Date(ev.start).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
                    : 'Весь день';
                  const typeClass = ev.type.toLowerCase();

                  return (
                    <div
                      key={ev.id}
                      onClick={() => handleEventClick(ev)}
                      className={`calendar-event-item ${typeClass}`}
                      style={{ padding: '6px 8px', fontSize: '0.78rem', whiteSpace: 'normal', flexDirection: 'column', alignItems: 'flex-start' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700 }}>
                        <span>{ev.type === 'MEASUREMENT' ? '📏 Замер' : (ev.type === 'INSTALLATION' ? '🔨 Монтаж' : '⏰ Звонок')}</span>
                        <span style={{ opacity: 0.8 }}>({timeStr})</span>
                      </div>
                      <div style={{ fontWeight: 600, marginTop: '2px' }}>{ev.clientName}</div>
                      {ev.address && (
                        <div style={{ fontSize: '0.72rem', opacity: 0.85, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <MapPin size={11} /> {ev.address}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Режим: Список / Повестка */}
      {viewMode === 'agenda' && (
        <div className="calendar-agenda-container">
          {agendaGroups.length > 0 ? (
            agendaGroups.map((grp, idx) => (
              <div key={idx} className="calendar-agenda-group">
                <div className="calendar-agenda-date-header">
                  <CalendarIcon size={16} style={{ color: grp.isToday ? 'var(--accent-primary)' : 'var(--text-secondary)' }} />
                  <span style={{ color: grp.isToday ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
                    {grp.dateStr}
                  </span>
                  {grp.isToday && (
                    <span style={{ fontSize: '0.72rem', background: 'var(--accent-primary)', color: '#fff', padding: '1px 6px', borderRadius: '8px' }}>
                      Сегодня
                    </span>
                  )}
                </div>

                <div className="calendar-agenda-items">
                  {grp.events.map(ev => {
                    const timeStr = !ev.allDay
                      ? new Date(ev.start).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
                      : 'В течение дня';
                    const isOverdue = ev.isOverdue;

                    return (
                      <div
                        key={ev.id}
                        onClick={() => handleEventClick(ev)}
                        className="calendar-agenda-card"
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                          <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: 'var(--radius-md)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.2rem',
                            background: ev.type === 'MEASUREMENT'
                              ? 'rgba(139, 92, 246, 0.15)'
                              : (ev.type === 'INSTALLATION' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(245, 158, 11, 0.15)'),
                            flexShrink: 0
                          }}>
                            {ev.type === 'MEASUREMENT' ? '📏' : (ev.type === 'INSTALLATION' ? '🔨' : '⏰')}
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <span style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                                {ev.title}
                              </span>
                              {ev.orderNumber && (
                                <span style={{ fontSize: '0.72rem', color: '#4ade80', background: 'rgba(34, 197, 94, 0.12)', padding: '1px 5px', borderRadius: '4px' }}>
                                  № {ev.orderNumber}
                                </span>
                              )}
                              <span style={{
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                color: isOverdue ? '#ef4444' : 'var(--text-secondary)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}>
                                <Clock size={12} /> {timeStr}
                                {isOverdue && ' (просрочено)'}
                              </span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                              {ev.clientPhone && (
                                <a
                                  href={`tel:${ev.clientPhone}`}
                                  onClick={e => e.stopPropagation()}
                                  style={{ color: 'var(--accent-primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                                >
                                  <Phone size={12} /> {ev.clientPhone}
                                </a>
                              )}
                              {ev.address && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <MapPin size={12} /> {ev.address}
                                </span>
                              )}
                              {ev.assigneeName && (
                                <span>👤 {ev.assigneeName}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          className="btn btn-ghost"
                          style={{ fontSize: '0.8rem', padding: '6px 10px', color: 'var(--accent-primary)' }}
                        >
                          Открыть сделку →
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            <div style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--text-secondary)', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--glass-border)' }}>
              <CalendarIcon size={36} style={{ opacity: 0.3, marginBottom: '8px' }} />
              <div>Нет запланированных событий на выбранный период.</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Calendar;
