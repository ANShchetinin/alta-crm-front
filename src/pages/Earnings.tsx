import React, { useState, useEffect, useMemo } from 'react';
import { 
  Wallet, 
  CheckCircle2, 
  TrendingUp, 
  Calendar, 
  MapPin, 
  Phone, 
  Search, 
  FileText, 
  User, 
  RefreshCw,
  Clock
} from 'lucide-react';
import { getMyEarnings } from '../api/earnings';
import type { WorkerEarnings } from '../api/earnings';

type PeriodFilter = 'THIS_MONTH' | 'PREV_MONTH' | 'ALL_TIME' | 'CUSTOM';

export const Earnings: React.FC = () => {
  const [data, setData] = useState<WorkerEarnings | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodFilter>('THIS_MONTH');
  const [searchQuery, setSearchQuery] = useState('');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const fetchEarnings = async () => {
    setLoading(true);
    try {
      const result = await getMyEarnings();
      setData(result);
    } catch (err) {
      console.error('Failed to fetch earnings', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEarnings();
  }, []);

  const getYandexMapsUrl = (address: string) => {
    return `https://yandex.ru/maps/?text=${encodeURIComponent(address)}`;
  };

  const get2GisUrl = (address: string) => {
    return `https://2gis.ru/search/${encodeURIComponent(address)}`;
  };

  // Filter items by period and search query
  const filteredItems = useMemo(() => {
    if (!data?.items) return [];

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed

    return data.items.filter((item) => {
      // Date filtering
      const itemDateStr = item.installedAt || item.installationDate || item.createdAt;
      if (itemDateStr) {
        const itemDate = new Date(itemDateStr);
        if (period === 'THIS_MONTH') {
          if (itemDate.getFullYear() !== currentYear || itemDate.getMonth() !== currentMonth) {
            return false;
          }
        } else if (period === 'PREV_MONTH') {
          const prevMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
          const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
          if (itemDate.getFullYear() !== prevMonthYear || itemDate.getMonth() !== prevMonth) {
            return false;
          }
        } else if (period === 'CUSTOM') {
          if (customStartDate && new Date(itemDateStr) < new Date(customStartDate)) {
            return false;
          }
          if (customEndDate && new Date(itemDateStr) > new Date(customEndDate + 'T23:59:59')) {
            return false;
          }
        }
      }

      // Search query filtering
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesAddress = item.address?.toLowerCase().includes(q);
        const matchesClient = item.clientName?.toLowerCase().includes(q);
        const matchesPhone = item.clientPhone?.toLowerCase().includes(q);
        const matchesOrderNum = item.orderNumber?.toLowerCase().includes(q);
        const matchesDesc = item.description?.toLowerCase().includes(q);
        const matchesId = item.orderId.toString().includes(q);

        if (!matchesAddress && !matchesClient && !matchesPhone && !matchesOrderNum && !matchesDesc && !matchesId) {
          return false;
        }
      }

      return true;
    });
  }, [data, period, searchQuery, customStartDate, customEndDate]);

  // Recalculate stats for the filtered list
  const periodTotal = useMemo(() => {
    return filteredItems.reduce((sum, item) => sum + (item.installationPrice || 0), 0);
  }, [filteredItems]);

  const periodAvg = useMemo(() => {
    if (filteredItems.length === 0) return 0;
    return Math.round(periodTotal / filteredItems.length);
  }, [filteredItems, periodTotal]);

  return (
    <div className="page-container" style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '24px', 
        flexWrap: 'wrap', 
        gap: '16px' 
      }}>
        <div>
          <h1 style={{ 
            fontSize: '1.75rem', 
            fontWeight: 700, 
            margin: '0 0 4px 0', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '10px' 
          }}>
            <Wallet size={28} style={{ color: 'var(--accent-primary)' }} />
            Мой заработок
          </h1>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Начисления за выполненные монтажи по завершенным заявкам
          </p>
        </div>

        <button 
          onClick={fetchEarnings}
          className="btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px' }}
          title="Обновить данные"
        >
          <RefreshCw size={16} className={loading ? 'spin' : ''} />
          Обновить
        </button>
      </div>

      {/* Summary Stat Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
        gap: '16px', 
        marginBottom: '24px' 
      }}>
        <div className="glass-panel" style={{ 
          padding: '20px', 
          borderRadius: 'var(--radius-md)', 
          background: 'rgba(34, 197, 94, 0.08)',
          border: '1px solid rgba(34, 197, 94, 0.2)' 
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 500 }}>
              Заработано за период
            </span>
            <div style={{ 
              width: '36px', 
              height: '36px', 
              borderRadius: '8px', 
              background: 'rgba(34, 197, 94, 0.15)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: '#4ade80'
            }}>
              <Wallet size={20} />
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#4ade80' }}>
            {periodTotal.toLocaleString('ru-RU')} ₽
          </div>
        </div>

        <div className="glass-panel" style={{ 
          padding: '20px', 
          borderRadius: 'var(--radius-md)', 
          background: 'rgba(59, 130, 246, 0.08)',
          border: '1px solid rgba(59, 130, 246, 0.2)' 
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 500 }}>
              Выполнено монтажей
            </span>
            <div style={{ 
              width: '36px', 
              height: '36px', 
              borderRadius: '8px', 
              background: 'rgba(59, 130, 246, 0.15)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: '#60a5fa'
            }}>
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#60a5fa' }}>
            {filteredItems.length}
          </div>
        </div>

        <div className="glass-panel" style={{ 
          padding: '20px', 
          borderRadius: 'var(--radius-md)', 
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid var(--glass-border)' 
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 500 }}>
              Средний чек за объект
            </span>
            <div style={{ 
              width: '36px', 
              height: '36px', 
              borderRadius: '8px', 
              background: 'rgba(255, 255, 255, 0.06)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: 'var(--text-primary)'
            }}>
              <TrendingUp size={20} />
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {periodAvg.toLocaleString('ru-RU')} ₽
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="glass-panel" style={{ 
        padding: '16px', 
        borderRadius: 'var(--radius-md)', 
        marginBottom: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px'
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          flexWrap: 'wrap', 
          gap: '12px' 
        }}>
          {/* Period Tabs */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setPeriod('THIS_MONTH')}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-sm)',
                border: period === 'THIS_MONTH' ? '1px solid var(--accent-primary)' : '1px solid var(--glass-border)',
                background: period === 'THIS_MONTH' ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.03)',
                color: period === 'THIS_MONTH' ? '#fff' : 'var(--text-secondary)',
                fontSize: '0.85rem',
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              Этот месяц
            </button>
            <button
              onClick={() => setPeriod('PREV_MONTH')}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-sm)',
                border: period === 'PREV_MONTH' ? '1px solid var(--accent-primary)' : '1px solid var(--glass-border)',
                background: period === 'PREV_MONTH' ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.03)',
                color: period === 'PREV_MONTH' ? '#fff' : 'var(--text-secondary)',
                fontSize: '0.85rem',
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              Прошлый месяц
            </button>
            <button
              onClick={() => setPeriod('ALL_TIME')}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-sm)',
                border: period === 'ALL_TIME' ? '1px solid var(--accent-primary)' : '1px solid var(--glass-border)',
                background: period === 'ALL_TIME' ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.03)',
                color: period === 'ALL_TIME' ? '#fff' : 'var(--text-secondary)',
                fontSize: '0.85rem',
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              За всё время
            </button>
            <button
              onClick={() => setPeriod('CUSTOM')}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-sm)',
                border: period === 'CUSTOM' ? '1px solid var(--accent-primary)' : '1px solid var(--glass-border)',
                background: period === 'CUSTOM' ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.03)',
                color: period === 'CUSTOM' ? '#fff' : 'var(--text-secondary)',
                fontSize: '0.85rem',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <Calendar size={14} /> Период...
            </button>
          </div>

          {/* Search Box */}
          <div style={{ position: 'relative', minWidth: '240px', flex: '1', maxWidth: '360px' }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input 
              type="text"
              placeholder="Поиск по адресу, клиенту, номеру..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
              style={{ width: '100%', paddingLeft: '32px', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        {/* Custom date range picker if CUSTOM selected */}
        {period === 'CUSTOM' && (
          <div style={{ 
            display: 'flex', 
            gap: '12px', 
            alignItems: 'center', 
            flexWrap: 'wrap',
            paddingTop: '10px',
            borderTop: '1px solid var(--glass-border)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>С:</span>
              <input 
                type="date" 
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="custom-date-input"
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>По:</span>
              <input 
                type="date" 
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="custom-date-input"
              />
            </div>
          </div>
        )}
      </div>

      {/* Items List / Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-secondary)' }}>
          <RefreshCw size={24} className="spin" style={{ margin: '0 auto 12px auto' }} />
          <div>Загрузка данных о заработке...</div>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="glass-panel" style={{ 
          textAlign: 'center', 
          padding: '48px 20px', 
          borderRadius: 'var(--radius-md)',
          color: 'var(--text-secondary)' 
        }}>
          <CheckCircle2 size={48} style={{ opacity: 0.3, margin: '0 auto 16px auto', color: 'var(--accent-primary)' }} />
          <h3 style={{ margin: '0 0 6px 0', color: 'var(--text-primary)' }}>Нет выполненных монтажей за выбранный период</h3>
          <p style={{ margin: 0, fontSize: '0.9rem' }}>
            После того, как вы завершите монтаж по заявке, начисленная стоимость монтажа появится здесь
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredItems.map((item) => (
            <div 
              key={item.orderId}
              className="glass-panel"
              style={{
                padding: '16px 20px',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '16px',
                border: '1px solid var(--glass-border)',
                transition: 'transform 0.15s ease, border-color 0.15s ease'
              }}
            >
              {/* Left Column: Details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: '1', minWidth: '280px' }}>
                {/* Header: ID, Order Number, Status */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ 
                    fontSize: '0.75rem', 
                    fontWeight: 700, 
                    color: 'var(--text-secondary)', 
                    background: 'rgba(255, 255, 255, 0.06)', 
                    padding: '2px 6px', 
                    borderRadius: '4px' 
                  }}>
                    #{item.orderId}
                  </span>

                  {item.orderNumber && (
                    <span style={{
                      fontSize: '0.75rem',
                      fontFamily: 'monospace',
                      fontWeight: 700,
                      background: 'rgba(34, 197, 94, 0.15)',
                      color: '#4ade80',
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid rgba(34, 197, 94, 0.3)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <FileText size={11} />
                      № {item.orderNumber}
                    </span>
                  )}

                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(34, 197, 94, 0.15)',
                    color: '#4ade80',
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <CheckCircle2 size={12} /> {item.statusName || 'Завершено'}
                  </span>
                </div>

                {/* Address & Navigation */}
                {item.address && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                      <MapPin size={15} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                      <span>{item.address}</span>
                    </div>

                    <div style={{ display: 'flex', gap: '4px' }}>
                      <a
                        href={getYandexMapsUrl(item.address)}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          color: '#ff3333',
                          background: 'rgba(255, 51, 51, 0.1)',
                          border: '1px solid rgba(255, 51, 51, 0.2)',
                          borderRadius: '4px',
                          padding: '1px 5px',
                          textDecoration: 'none'
                        }}
                      >
                        Яндекс
                      </a>
                      <a
                        href={get2GisUrl(item.address)}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          color: '#22c55e',
                          background: 'rgba(34, 197, 94, 0.1)',
                          border: '1px solid rgba(34, 197, 94, 0.2)',
                          borderRadius: '4px',
                          padding: '1px 5px',
                          textDecoration: 'none'
                        }}
                      >
                        2ГИС
                      </a>
                    </div>
                  </div>
                )}

                {/* Client info & Description */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {item.clientName && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <User size={13} />
                      <span>{item.clientName}</span>
                    </div>
                  )}

                  {item.clientPhone && (
                    <a
                      href={`tel:${item.clientPhone}`}
                      style={{
                        color: 'var(--success)',
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontWeight: 500
                      }}
                    >
                      <Phone size={13} /> {item.clientPhone}
                    </a>
                  )}

                  {item.installedAt ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#4ade80' }}>
                      <CheckCircle2 size={13} />
                      <span>Выполнен: {new Date(item.installedAt).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  ) : item.installationDate ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={13} />
                      <span>Монтаж: {new Date(item.installationDate).toLocaleDateString('ru-RU')}</span>
                    </div>
                  ) : null}
                </div>

                {item.description && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                    «{item.description}»
                  </div>
                )}
              </div>

              {/* Right Column: Earnings Amount Badge */}
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'flex-end', 
                justifyContent: 'center',
                flexShrink: 0 
              }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Начислено за монтаж:
                </span>
                <div style={{
                  fontSize: '1.35rem',
                  fontWeight: 700,
                  color: '#4ade80',
                  background: 'rgba(34, 197, 94, 0.12)',
                  border: '1px solid rgba(34, 197, 94, 0.25)',
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-sm)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  + {(item.installationPrice || 0).toLocaleString('ru-RU')} ₽
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
