import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  CheckCircle2, 
  Trash2, 
  CalendarClock, 
  RotateCcw, 
  ChevronDown, 
  ChevronUp, 
  Plus, 
  AlertCircle 
} from 'lucide-react';
import { 
  type OrderReminderDto, 
  getOrderReminders, 
  createReminder, 
  completeReminder, 
  snoozeReminder, 
  deleteReminder 
} from '../api/reminders';
import type { Employee } from '../api/employees';

interface OrderRemindersSectionProps {
  orderId: number;
  employees: Employee[];
  currentUserId?: number;
  onReminderCountChanged?: () => void;
}

const QUICK_COMMENTS = [
  'Уточнить решение по смете',
  'Согласовать время замера',
  'Напомнить о заключении договора',
  'Уточнить детали заказа',
  'Контроль качества после монтажа'
];

export const OrderRemindersSection: React.FC<OrderRemindersSectionProps> = ({
  orderId,
  employees,
  currentUserId,
  onReminderCountChanged
}) => {
  const [reminders, setReminders] = useState<OrderReminderDto[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Form State
  const [customDateTime, setCustomDateTime] = useState('');
  const [comment, setComment] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<number | undefined>(currentUserId);
  const [notifyBeforeMinutes, setNotifyBeforeMinutes] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);

  const fetchReminders = async () => {
    if (!orderId) return;
    try {
      const data = await getOrderReminders(orderId);
      setReminders(data);
    } catch (err) {
      console.error('Failed to fetch reminders', err);
    }
  };

  useEffect(() => {
    fetchReminders();
  }, [orderId]);

  // Quick Preset Helper
  const setPresetTime = (type: '1h' | '3h' | 'tomorrow10' | '3d' | '1w') => {
    const now = new Date();
    let target = new Date();

    if (type === '1h') {
      target = new Date(now.getTime() + 60 * 60 * 1000);
    } else if (type === '3h') {
      target = new Date(now.getTime() + 3 * 60 * 60 * 1000);
    } else if (type === 'tomorrow10') {
      target.setDate(target.getDate() + 1);
      target.setHours(10, 0, 0, 0);
    } else if (type === '3d') {
      target.setDate(target.getDate() + 3);
      target.setHours(11, 0, 0, 0);
    } else if (type === '1w') {
      target.setDate(target.getDate() + 7);
      target.setHours(11, 0, 0, 0);
    }

    // Format to YYYY-MM-DDTHH:mm for datetime-local input
    const year = target.getFullYear();
    const month = String(target.getMonth() + 1).padStart(2, '0');
    const day = String(target.getDate()).padStart(2, '0');
    const hours = String(target.getHours()).padStart(2, '0');
    const minutes = String(target.getMinutes()).padStart(2, '0');
    
    setCustomDateTime(`${year}-${month}-${day}T${hours}:${minutes}`);
  };

  const handleCreateReminder = async (e?: React.SyntheticEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!customDateTime) {
      alert('Пожалуйста, выберите дату и время напоминания');
      return;
    }

    try {
      setSubmitting(true);
      await createReminder(orderId, {
        remindAt: customDateTime,
        comment: comment.trim() || undefined,
        userId: selectedUserId,
        notifyBeforeMinutes: notifyBeforeMinutes
      });
      setComment('');
      setCustomDateTime('');
      setNotifyBeforeMinutes(0);
      await fetchReminders();
      if (onReminderCountChanged) onReminderCountChanged();
    } catch (err: any) {
      console.error('Failed to create reminder', err);
      const errMsg = err?.response?.data?.message || err?.message || 'Ошибка при создании напоминания';
      alert(`Ошибка при создании напоминания: ${errMsg}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleComplete = async (id: number) => {
    try {
      await completeReminder(id);
      await fetchReminders();
      if (onReminderCountChanged) onReminderCountChanged();
    } catch (err) {
      console.error('Failed to complete reminder', err);
    }
  };

  const handleSnooze = async (id: number, hours: number) => {
    try {
      await snoozeReminder(id, { hours });
      await fetchReminders();
      if (onReminderCountChanged) onReminderCountChanged();
    } catch (err) {
      console.error('Failed to snooze reminder', err);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Удалить это напоминание?')) {
      try {
        await deleteReminder(id);
        await fetchReminders();
        if (onReminderCountChanged) onReminderCountChanged();
      } catch (err) {
        console.error('Failed to delete reminder', err);
      }
    }
  };

  const pendingReminders = reminders.filter(r => r.status === 'PENDING');
  const completedReminders = reminders.filter(r => r.status === 'COMPLETED');

  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.02)',
      border: '1px solid var(--glass-border)',
      borderRadius: 'var(--radius-md)',
      padding: '16px',
      marginBottom: '16px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CalendarClock size={18} style={{ color: 'var(--accent-primary)' }} />
          Следующий контакт и напоминания
          {pendingReminders.length > 0 && (
            <span style={{
              background: pendingReminders.some(r => r.isOverdue) ? '#ef4444' : 'var(--accent-primary)',
              color: '#fff',
              fontSize: '0.72rem',
              fontWeight: 700,
              padding: '1px 6px',
              borderRadius: '10px'
            }}>
              {pendingReminders.length}
            </span>
          )}
        </h4>
      </div>

      {/* Быстрые пресеты */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 500 }}>
          Быстрый выбор времени:
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setPresetTime('1h')}
            className="btn btn-ghost"
            style={{ fontSize: '0.78rem', padding: '4px 10px', background: 'rgba(255, 255, 255, 0.04)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-sm)' }}
          >
            +1 час
          </button>
          <button
            type="button"
            onClick={() => setPresetTime('3h')}
            className="btn btn-ghost"
            style={{ fontSize: '0.78rem', padding: '4px 10px', background: 'rgba(255, 255, 255, 0.04)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-sm)' }}
          >
            +3 часа
          </button>
          <button
            type="button"
            onClick={() => setPresetTime('tomorrow10')}
            className="btn btn-ghost"
            style={{ fontSize: '0.78rem', padding: '4px 10px', background: 'rgba(255, 255, 255, 0.04)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-sm)' }}
          >
            Завтра в 10:00
          </button>
          <button
            type="button"
            onClick={() => setPresetTime('3d')}
            className="btn btn-ghost"
            style={{ fontSize: '0.78rem', padding: '4px 10px', background: 'rgba(255, 255, 255, 0.04)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-sm)' }}
          >
            Через 3 дня
          </button>
          <button
            type="button"
            onClick={() => setPresetTime('1w')}
            className="btn btn-ghost"
            style={{ fontSize: '0.78rem', padding: '4px 10px', background: 'rgba(255, 255, 255, 0.04)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-sm)' }}
          >
            Через неделю
          </button>
        </div>
      </div>

      {/* Форма добавления напоминания */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '10px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: '0.78rem', marginBottom: '4px' }}>Дата и время звонка *</label>
            <input
              type="datetime-local"
              required
              value={customDateTime}
              onChange={e => setCustomDateTime(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.stopPropagation();
                  handleCreateReminder(e);
                }
              }}
              className="custom-date-input"
              style={{ width: '100%', fontSize: '0.85rem' }}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: '0.78rem', marginBottom: '4px' }}>Уведомить заранее</label>
            <select
              value={notifyBeforeMinutes}
              onChange={e => setNotifyBeforeMinutes(parseInt(e.target.value))}
              className="search-input"
              style={{ width: '100%', height: '38px', fontSize: '0.85rem' }}
            >
              <option value={0}>В момент события</option>
              <option value={15}>За 15 минут</option>
              <option value={30}>За 30 минут</option>
              <option value={60}>За 1 час</option>
              <option value={120}>За 2 часа</option>
              <option value={1440}>За 1 день (24 ч)</option>
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: '0.78rem', marginBottom: '4px' }}>Ответственный</label>
            <select
              value={selectedUserId || ''}
              onChange={e => setSelectedUserId(e.target.value ? parseInt(e.target.value) : undefined)}
              className="search-input"
              style={{ width: '100%', height: '38px', fontSize: '0.85rem' }}
            >
              <option value="">Текущий пользователь (Я)</option>
              {employees.filter(emp => emp.userId).map(emp => (
                <option key={emp.id} value={emp.userId}>
                  {emp.name} {emp.position ? `(${emp.position})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Быстрые подсказки комментариев */}
        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
            Быстрая цель контакта:
          </div>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {QUICK_COMMENTS.map((qc, idx) => (
              <span
                key={idx}
                onClick={() => setComment(qc)}
                style={{
                  fontSize: '0.72rem',
                  padding: '2px 8px',
                  background: comment === qc ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                  border: comment === qc ? '1px solid var(--accent-primary)' : '1px solid rgba(255, 255, 255, 0.06)',
                  color: comment === qc ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  userSelect: 'none'
                }}
              >
                {qc}
              </span>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            placeholder="Комментарий или цель звонка (напр. спросить по замеру)..."
            value={comment}
            onChange={e => setComment(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                handleCreateReminder(e);
              }
            }}
            className="search-input"
            style={{ flex: 1, fontSize: '0.85rem', paddingLeft: '10px' }}
          />
          <button
            type="button"
            onClick={handleCreateReminder}
            disabled={submitting || !customDateTime}
            className="btn btn-primary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0 16px',
              whiteSpace: 'nowrap',
              fontSize: '0.85rem'
            }}
          >
            <Plus size={15} />
            Поставить
          </button>
        </div>
      </div>

      {/* Список активных напоминаний */}
      {pendingReminders.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Активные напоминания ({pendingReminders.length}):
          </div>
          {pendingReminders.map(rem => {
            const dateObj = new Date(rem.remindAt);
            const dateStr = dateObj.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
            const timeStr = dateObj.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

            return (
              <div
                key={rem.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  background: rem.isOverdue ? 'rgba(239, 68, 68, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                  border: rem.isOverdue ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid var(--glass-border)',
                  borderRadius: 'var(--radius-sm)',
                  gap: '8px',
                  flexWrap: 'wrap'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '200px', flexWrap: 'wrap' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: rem.isOverdue ? '#ef4444' : '#f59e0b',
                    background: rem.isOverdue ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.12)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    whiteSpace: 'nowrap'
                  }}>
                    {rem.isOverdue ? <AlertCircle size={13} /> : <Clock size={13} />}
                    {dateStr}, {timeStr}
                    {rem.isOverdue && <span style={{ fontSize: '0.7rem', fontWeight: 600 }}> (просрочено)</span>}
                  </div>
                  {rem.notifyBeforeMinutes && rem.notifyBeforeMinutes > 0 ? (
                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        color: '#60a5fa',
                        background: 'rgba(59, 130, 246, 0.12)',
                        border: '1px solid rgba(59, 130, 246, 0.25)',
                        padding: '1px 5px',
                        borderRadius: '4px'
                      }}
                      title={`Пуш-уведомление придет за ${rem.notifyBeforeMinutes} мин`}
                    >
                      🔔 за {rem.notifyBeforeMinutes >= 1440 ? `${rem.notifyBeforeMinutes / 1440}д` : (rem.notifyBeforeMinutes >= 60 ? `${rem.notifyBeforeMinutes / 60}ч` : `${rem.notifyBeforeMinutes}м`)}
                    </span>
                  ) : null}
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', wordBreak: 'break-word' }}>
                    {rem.comment || 'Связаться с клиентом'}
                  </div>
                  {rem.userName && (
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.05)', padding: '1px 5px', borderRadius: '4px' }}>
                      👤 {rem.userName}
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => handleComplete(rem.id)}
                    className="btn btn-primary"
                    style={{
                      padding: '4px 10px',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      cursor: 'pointer',
                      borderRadius: 'var(--radius-sm)'
                    }}
                    title="Завершить контакт и перенести в историю"
                  >
                    <CheckCircle2 size={13} />
                    Завершить
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSnooze(rem.id, 1)}
                    className="btn btn-ghost"
                    style={{ padding: '4px 6px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}
                    title="Отложить на 1 час"
                  >
                    <RotateCcw size={12} style={{ marginRight: '2px' }} /> +1ч
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSnooze(rem.id, 24)}
                    className="btn btn-ghost"
                    style={{ padding: '4px 6px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}
                    title="Отложить на завтра"
                  >
                    +1д
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(rem.id)}
                    style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                    title="Удалить"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic', marginBottom: '8px' }}>
          Нет активных напоминаний по данной сделке.
        </div>
      )}

      {/* История завершенных напоминаний */}
      {completedReminders.length > 0 && (
        <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--glass-border)' }}>
          <button
            type="button"
            onClick={() => setShowHistory(!showHistory)}
            className="btn btn-ghost"
            style={{
              padding: 0,
              fontSize: '0.78rem',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            {showHistory ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            История завершенных контактов ({completedReminders.length})
          </button>

          {showHistory && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
              {completedReminders.map(rem => (
                <div
                  key={rem.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '4px 8px',
                    fontSize: '0.75rem',
                    color: 'var(--text-secondary)',
                    background: 'rgba(255,255,255,0.01)',
                    borderRadius: '4px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCircle2 size={12} style={{ color: '#4ade80' }} />
                    <span style={{ textDecoration: 'line-through' }}>{rem.comment || 'Звонок клиенту'}</span>
                  </div>
                  <span>
                    {rem.completedAt ? new Date(rem.completedAt).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
