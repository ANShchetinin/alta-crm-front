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
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'agenda'>('month');
  const [isMobile, setIsMobile] = useState<boolean>(() => typeof window !== 'undefined' && window.innerWidth <= 768);
  
  const [filterMeasurement, setFilterMeasurement] = useState(true);
  const [filterInstallation, setFilterInstallation] = useState(true);
  const [filterReminder, setFilterReminder] = useState(true);
  
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | undefined>(undefined);
  const [employees, setEmployees] = useState<Employee[]>([]);
  
  const [events, setEvents] = useState<CalendarEventDto[]>([]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!isWorker) {
      getEmployees().then(setEmployees).catch(console.error);
    }
  }, [isWorker]);

  const activeTypes = useMemo(() => {
    const types: string[] = [];
    if (filterMeasurement) types.push('MEASUREMENT');
    if (filterInstallation) types.push('INSTALLATION');
    if (filterReminder) types.push('REMINDER');
    return types;
  }, [filterMeasurement, filterInstallation, filterReminder]);

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
    const now = new Date();
    setCurrentDate(now);
    setSelectedDate(now);
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
      const isSelected = curr.getDate() === selectedDate.getDate() &&
                         curr.getMonth() === selectedDate.getMonth() &&
                         curr.getFullYear() === selectedDate.getFullYear();

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
        isSelected,
        events: dayEvents
      });

      curr.setDate(curr.getDate() + 1);
    }
    return days;
  }, [rangeStart, rangeEnd, currentDate, selectedDate, events, viewMode]);

  // Selected Day Events list
  const selectedDayEvents = useMemo(() => {
    return events.filter(e => {
      const eDate = new Date(e.start);
      return eDate.getFullYear() === selectedDate.getFullYear() &&
             eDate.getMonth() === selectedDate.getMonth() &&
             eDate.getDate() === selectedDate.getDate();
    }).sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  }, [events, selectedDate]);

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
      const isSelected = curr.getDate() === selectedDate.getDate() &&
                         curr.getMonth() === selectedDate.getMonth() &&
                         curr.getFullYear() === selectedDate.getFullYear();

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
        isSelected,
        events: dayEvents
      });

      curr.setDate(curr.getDate() + 1);
    }
    return days;
  }, [rangeStart, rangeEnd, selectedDate, events, viewMode]);

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

  const handleDaySelect = (date: Date) => {
    setSelectedDate(date);
    if (date.getMonth() !== currentDate.getMonth()) {
      setCurrentDate(new Date(date));
    }
  };

  const renderEventCard = (ev: CalendarEventDto) => {
    const timeStr = !ev.allDay
      ? new Date(ev.start).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
      : 'В течение дня';
    const isOverdue = ev.isOverdue;
    const typeClass = ev.type.toLowerCase();

    return (
      <div
        key={ev.id}
        onClick={() => handleEventClick(ev)}
        className={`calendar-agenda-card ${typeClass} ${isOverdue ? 'overdue' : ''}`}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flex: 1 }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.25rem',
            background: ev.type === 'MEASUREMENT'
              ? 'rgba(139, 92, 246, 0.18)'
              : (ev.type === 'INSTALLATION' ? 'rgba(34, 197, 94, 0.18)' : 'rgba(245, 158, 11, 0.18)'),
            border: ev.type === 'MEASUREMENT'
              ? '1px solid rgba(139, 92, 246, 0.35)'
              : (ev.type === 'INSTALLATION' ? '1px solid rgba(34, 197, 94, 0.35)' : '1px solid rgba(245, 158, 11, 0.35)'),
            flexShrink: 0
          }}>
            {ev.type === 'MEASUREMENT' ? '📏' : (ev.type === 'INSTALLATION' ? '🔨' : '⏰')}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '6px',
                textTransform: 'uppercase',
                background: ev.type === 'MEASUREMENT' ? 'rgba(139, 92, 246, 0.2)' : (ev.type === 'INSTALLATION' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(245, 158, 11, 0.2)'),
                color: ev.type === 'MEASUREMENT' ? '#a78bfa' : (ev.type === 'INSTALLATION' ? '#4ade80' : '#fbbf24')
              }}>
                {ev.type === 'MEASUREMENT' ? 'Замер' : (ev.type === 'INSTALLATION' ? 'Монтаж' : 'Напоминание')}
              </span>

              {ev.orderNumber && (
                <span style={{ fontSize: '0.74rem', fontWeight: 600, color: '#38bdf8', background: 'rgba(56, 189, 248, 0.12)', border: '1px solid rgba(56, 189, 248, 0.25)', padding: '1px 6px', borderRadius: '4px' }}>
                  № {ev.orderNumber}
                </span>
              )}

              <span style={{
                fontSize: '0.78rem',
                fontWeight: 600,
                color: isOverdue ? '#ef4444' : 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <Clock size={13} /> {timeStr}
                {isOverdue && <strong style={{ color: '#ef4444' }}> (просрочено)</strong>}
              </span>
            </div>

            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', marginTop: '2px', wordBreak: 'break-word' }}>
              {ev.title || ev.clientName}
            </div>

            {ev.clientName && ev.title !== ev.clientName && (
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                Клиент: {ev.clientName}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px', fontSize: '0.82rem' }}>
              {ev.clientPhone && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <a
                    href={`tel:${ev.clientPhone}`}
                    onClick={e => e.stopPropagation()}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      color: 'var(--success, #22c55e)',
                      textDecoration: 'none',
                      background: 'rgba(34, 197, 94, 0.1)',
                      border: '1px solid rgba(34, 197, 94, 0.25)',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontWeight: 600
                    }}
                  >
                    <Phone size={13} /> {ev.clientPhone}
                  </a>
                </div>
              )}

              {ev.address && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', color: 'var(--text-secondary)' }}>
                  <MapPin size={13} style={{ flexShrink: 0, marginTop: '2px', color: 'var(--accent-primary)' }} />
                  <span>{ev.address}</span>
                </div>
              )}

              {ev.assigneeName && (
                <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Ответственный: <strong>{ev.assigneeName}</strong>
                </div>
              )}
            </div>
          </div>
        </div>

        {ev.orderId && (
          <button
            type="button"
            className="btn btn-ghost"
            onClick={(e) => { e.stopPropagation(); handleEventClick(ev); }}
            style={{ fontSize: '0.8rem', padding: '6px 12px', color: 'var(--accent-primary)', flexShrink: 0, alignSelf: 'center' }}
          >
            Открыть сделку →
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="calendar-page-container animate-fade-in">
      {/* Верхний тулбар */}
      <div className="calendar-header-toolbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', width: isMobile ? '100%' : 'auto', justifyContent: isMobile ? 'space-between' : 'flex-start' }}>
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
              padding: '6px 10px',
              fontSize: '0.82rem',
              fontWeight: 600
            }}
          >
            <LayoutDashboard size={15} />
            {isMobile ? 'Канбан' : 'Канбан-доска'}
          </button>

          {/* Навигация по датам */}
          <div className="calendar-nav-controls">
            <button type="button" onClick={handlePrev} className="btn-icon" title="Назад">
              <ChevronLeft size={18} />
            </button>
            <button type="button" onClick={handleToday} className="btn btn-ghost" style={{ fontSize: '0.8rem', fontWeight: 600, padding: '4px 8px' }}>
              Сегодня
            </button>
            <button type="button" onClick={handleNext} className="btn-icon" title="Вперед">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        <div className="calendar-current-title">{formattedHeaderTitle}</div>

        {/* Фильтры и переключатель режима */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', width: isMobile ? '100%' : 'auto', justifyContent: isMobile ? 'space-between' : 'flex-end' }}>
          {/* Фильтры по типам событий */}
          <div className="calendar-filters-row">
            <div
              className={`calendar-type-pill measurement ${!filterMeasurement ? 'disabled' : ''}`}
              onClick={() => setFilterMeasurement(!filterMeasurement)}
              title="Показать / скрыть замеры"
            >
              <span>📏</span>
              <span>{isMobile ? 'Замеры' : 'Замеры'}</span>
            </div>
            <div
              className={`calendar-type-pill installation ${!filterInstallation ? 'disabled' : ''}`}
              onClick={() => setFilterInstallation(!filterInstallation)}
              title="Показать / скрыть монтажи"
            >
              <span>🔨</span>
              <span>{isMobile ? 'Монтажи' : 'Монтажи'}</span>
            </div>
            <div
              className={`calendar-type-pill reminder ${!filterReminder ? 'disabled' : ''}`}
              onClick={() => setFilterReminder(!filterReminder)}
              title="Показать / скрыть напоминания и звонки"
            >
              <span>⏰</span>
              <span>{isMobile ? 'Звонки' : 'Напоминания'}</span>
            </div>
          </div>

          {/* Выбор сотрудника */}
          {!isWorker && employees.length > 0 && !isMobile && (
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

      {/* Основная сетка Календаря: Месяц */}
      {viewMode === 'month' && (
        <div className="calendar-month-and-events-layout">
          <div className="calendar-month-grid">
            <div className="calendar-weekdays-header">
              {WEEKDAYS.map(day => (
                <div key={day} className="calendar-weekday-cell">
                  {day}
                </div>
              ))}
            </div>

            <div className="calendar-month-body">
              {monthDays.map(d => {
                const isSelected = d.isSelected;
                const hasEvents = d.events.length > 0;

                return (
                  <div
                    key={d.dateKey}
                    onClick={() => handleDaySelect(d.date)}
                    className={`calendar-day-cell ${!d.isCurrentMonth ? 'other-month' : ''} ${d.isToday ? 'today' : ''} ${isSelected ? 'selected-day' : ''}`}
                  >
                    <div className="calendar-day-header">
                      <span className="calendar-day-number">{d.dayNumber}</span>
                      {hasEvents && !isMobile && (
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                          {d.events.length}
                        </span>
                      )}
                    </div>

                    {/* На мобильных устройствах — аккуратные цветные точки событий */}
                    {isMobile ? (
                      <div className="calendar-day-dots">
                        {d.events.slice(0, 3).map((ev, i) => (
                          <span 
                            key={i} 
                            className={`calendar-event-dot ${ev.type.toLowerCase()} ${ev.isOverdue ? 'overdue' : ''}`}
                          />
                        ))}
                        {d.events.length > 3 && (
                          <span className="calendar-event-dot-more">+{d.events.length - 3}</span>
                        )}
                      </div>
                    ) : (
                      /* На десктопе — плашки с текстом */
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
                              onClick={(e) => { e.stopPropagation(); handleEventClick(ev); }}
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
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* На мобильных устройствах (или при клике на день) — подробная панель событий выбранного дня */}
          {isMobile && (
            <div className="calendar-selected-day-section glass-panel">
              <div className="calendar-selected-day-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CalendarIcon size={18} style={{ color: 'var(--accent-primary)' }} />
                  <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                    {selectedDate.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'long' })}
                  </span>
                </div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  {selectedDayEvents.length > 0 ? `${selectedDayEvents.length} событ.` : 'Нет событий'}
                </span>
              </div>

              <div className="calendar-selected-day-list">
                {selectedDayEvents.length > 0 ? (
                  selectedDayEvents.map(renderEventCard)
                ) : (
                  <div style={{ textAlign: 'center', padding: '24px 12px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    На этот день событий не запланировано.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Режим: Неделя */}
      {viewMode === 'week' && (
        <div className="calendar-month-grid" style={{ minHeight: '400px' }}>
          <div className="calendar-weekdays-header">
            {weekDays.map(d => (
              <div 
                key={d.dateKey} 
                className="calendar-weekday-cell" 
                onClick={() => handleDaySelect(d.date)}
                style={{ 
                  background: d.isSelected ? 'rgba(59, 130, 246, 0.15)' : (d.isToday ? 'rgba(59, 130, 246, 0.05)' : 'transparent'),
                  cursor: 'pointer'
                }}
              >
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
                onClick={() => handleDaySelect(d.date)}
                style={{
                  borderRight: '1px solid var(--glass-border)',
                  padding: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  background: d.isSelected ? 'rgba(59, 130, 246, 0.04)' : (d.isToday ? 'rgba(59, 130, 246, 0.02)' : 'transparent'),
                  cursor: 'pointer'
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
                      onClick={(e) => { e.stopPropagation(); handleEventClick(ev); }}
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
                  {grp.events.map(renderEventCard)}
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
