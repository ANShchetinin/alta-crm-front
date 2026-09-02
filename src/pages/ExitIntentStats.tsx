import React, { useEffect, useState, useCallback } from 'react';
import {
  Eye,
  Calculator,
  FileText,
  Image as ImageIcon,
  TrendingUp,
  RefreshCw,
  Search,
  Trash2,
  Calendar,
  Smartphone,
  Monitor,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Info,
  X,
  Layers,
  Sparkles,
  MapPin
} from 'lucide-react';
import {
  getExitIntentSummary,
  getExitIntentSessions,
  deleteExitIntentSession,
  type ExitIntentSummary,
  type ExitIntentSessionItem,
  type ExitIntentCalcData
} from '../api/exitIntentAnalytics';
import '../styles/dashboard.css';

type DateFilterType = 'today' | 'yesterday' | '7days' | '30days' | 'all' | 'custom';

export const ExitIntentStats: React.FC = () => {
  const [filterType, setFilterType] = useState<DateFilterType>('7days');
  const [customFrom, setCustomFrom] = useState<string>('');
  const [customTo, setCustomTo] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [summary, setSummary] = useState<ExitIntentSummary | null>(null);
  const [sessions, setSessions] = useState<ExitIntentSessionItem[]>([]);
  const [totalSessions, setTotalSessions] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [page, setPage] = useState<number>(0);
  const pageSize = 15;

  const [isLoadingSummary, setIsLoadingSummary] = useState<boolean>(false);
  const [isLoadingSessions, setIsLoadingSessions] = useState<boolean>(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Modal for viewing detailed calc data
  const [selectedCalcData, setSelectedCalcData] = useState<{
    session: ExitIntentSessionItem;
    calc: ExitIntentCalcData;
  } | null>(null);

  const getDateRange = useCallback((): { from?: string; to?: string } => {
    const today = new Date();
    const formatDate = (d: Date) => d.toISOString().split('T')[0];

    if (filterType === 'today') {
      const todayStr = formatDate(today);
      return { from: todayStr, to: todayStr };
    }
    if (filterType === 'yesterday') {
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      const yStr = formatDate(yesterday);
      return { from: yStr, to: yStr };
    }
    if (filterType === '7days') {
      const past = new Date(today);
      past.setDate(today.getDate() - 6);
      return { from: formatDate(past), to: formatDate(today) };
    }
    if (filterType === '30days') {
      const past = new Date(today);
      past.setDate(today.getDate() - 29);
      return { from: formatDate(past), to: formatDate(today) };
    }
    if (filterType === 'custom') {
      return {
        from: customFrom || undefined,
        to: customTo || undefined
      };
    }
    return {}; // 'all'
  }, [filterType, customFrom, customTo]);

  const loadSummary = useCallback(async () => {
    setIsLoadingSummary(true);
    try {
      const dateRange = getDateRange();
      const data = await getExitIntentSummary(dateRange);
      setSummary(data);
    } catch (err) {
      console.error('Failed to load exit-intent summary', err);
    } finally {
      setIsLoadingSummary(false);
    }
  }, [getDateRange]);

  const loadSessions = useCallback(async (targetPage = page) => {
    setIsLoadingSessions(true);
    try {
      const dateRange = getDateRange();
      const data = await getExitIntentSessions({
        ...dateRange,
        search: searchQuery.trim() || undefined,
        page: targetPage,
        size: pageSize
      });
      setSessions(data.content || []);
      setTotalSessions(data.totalElements || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error('Failed to load exit-intent sessions', err);
    } finally {
      setIsLoadingSessions(false);
    }
  }, [getDateRange, searchQuery, page]);

  useEffect(() => {
    setPage(0);
    loadSummary();
    loadSessions(0);
  }, [filterType, customFrom, customTo, loadSummary, loadSessions]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    loadSessions(0);
  };

  const handleDeleteSession = async (id: number) => {
    if (!window.confirm('Вы уверены, что хотите удалить эту запись аналитики?')) {
      return;
    }
    setDeletingId(id);
    try {
      await deleteExitIntentSession(id);
      // Reload sessions and summary
      await Promise.all([loadSummary(), loadSessions(page)]);
    } catch (err) {
      console.error('Failed to delete session', err);
      alert('Ошибка при удалении записи');
    } finally {
      setDeletingId(null);
    }
  };

  const parseCalcData = (jsonStr?: string): ExitIntentCalcData | null => {
    if (!jsonStr) return null;
    try {
      return JSON.parse(jsonStr);
    } catch {
      return null;
    }
  };

  const getCanvasTitle = (type?: string) => {
    switch (type) {
      case 'matte': return 'Матовое';
      case 'glossy': return 'Глянцевое';
      case 'satin': return 'Сатиновое';
      case 'fabric': return 'Тканевое (Descor/Clipso)';
      default: return type || 'Не указано';
    }
  };

  const getProfileTitle = (type?: string) => {
    switch (type) {
      case 'aluminum': return 'Алюминиевый';
      case 'shadow': return 'Теневой (EuroKraab)';
      case 'with_insert': return 'Со вставкой (заглушкой)';
      default: return type || 'Не указано';
    }
  };

  return (
    <div className="exit-intent-stats-page" style={{ padding: '8px 4px 40px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: '12px',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#10b981'
            }}>
              <TrendingUp size={20} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>
                Аналитика сайта
              </h1>
              <p style={{ margin: '2px 0 0', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                Показатели Exit-Intent попапа, конверсий калькулятора и скачиваний смет (PDF / PNG)
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => { loadSummary(); loadSessions(page); }}
          className="btn btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', borderRadius: '10px' }}
          disabled={isLoadingSummary || isLoadingSessions}
        >
          <RefreshCw size={16} className={(isLoadingSummary || isLoadingSessions) ? 'animate-spin' : ''} />
          <span>Обновить</span>
        </button>
      </div>

      {/* Date Range Selector */}
      <div className="glass-panel" style={{ padding: '14px 18px', borderRadius: '16px', marginBottom: '24px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginRight: '6px' }}>
          <Calendar size={16} />
          <span>Период:</span>
        </div>

        {(['today', 'yesterday', '7days', '30days', 'all'] as DateFilterType[]).map(type => {
          const labels: Record<DateFilterType, string> = {
            today: 'Сегодня',
            yesterday: 'Вчера',
            '7days': '7 дней',
            '30days': '30 дней',
            all: 'Все время',
            custom: 'Кастом'
          };
          const isActive = filterType === type;
          return (
            <button
              key={type}
              type="button"
              onClick={() => setFilterType(type)}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                border: isActive ? '1px solid var(--accent-primary)' : '1px solid var(--glass-border)',
                background: isActive ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.04)',
                color: isActive ? '#fff' : 'var(--text-primary)'
              }}
            >
              {labels[type]}
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => setFilterType('custom')}
          style={{
            padding: '6px 12px',
            borderRadius: '8px',
            fontSize: '0.82rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            border: filterType === 'custom' ? '1px solid var(--accent-primary)' : '1px solid var(--glass-border)',
            background: filterType === 'custom' ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.04)',
            color: filterType === 'custom' ? '#fff' : 'var(--text-primary)'
          }}
        >
          Кастомный период
        </button>

        {filterType === 'custom' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '6px' }}>
            <input
              type="date"
              value={customFrom}
              onChange={e => setCustomFrom(e.target.value)}
              className="form-control"
              style={{ padding: '4px 8px', fontSize: '0.82rem', width: 'auto' }}
            />
            <span style={{ color: 'var(--text-secondary)' }}>—</span>
            <input
              type="date"
              value={customTo}
              onChange={e => setCustomTo(e.target.value)}
              className="form-control"
              style={{ padding: '4px 8px', fontSize: '0.82rem', width: 'auto' }}
            />
          </div>
        )}
      </div>

      {/* KPI Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {/* Card 1: Visits & Shows */}
        <div className="glass-panel" style={{ padding: '20px', borderRadius: '18px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)' }}>
              Визиты / Показы
            </span>
            <div style={{ width: 34, height: 34, borderRadius: '10px', background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Eye size={18} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1.1 }}>
              {summary ? summary.totalSessions.toLocaleString('ru-RU') : '—'}
            </div>
            {summary && summary.totalSessions > 0 && (
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#3b82f6', background: 'rgba(59, 130, 246, 0.12)', padding: '2px 6px', borderRadius: '6px' }}>
                CR показа: {summary.conversionToShowRate}%
              </span>
            )}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
            {summary ? `${summary.totalShows} показов попапа уходящим` : 'Загрузка...'}
          </div>
        </div>

        {/* Card 2: Calculator Opens */}
        <div className="glass-panel" style={{ padding: '20px', borderRadius: '18px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)' }}>
              Переходы в калькулятор
            </span>
            <div style={{ width: 34, height: 34, borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Calculator size={18} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: '#10b981', lineHeight: 1.1 }}>
              {summary ? summary.totalCalculatorOpens.toLocaleString('ru-RU') : '—'}
            </div>
            {summary && (
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#10b981', background: 'rgba(16, 185, 129, 0.12)', padding: '2px 6px', borderRadius: '6px' }}>
                CR: {summary.conversionToCalcRate}%
              </span>
            )}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
            Нажатий «Рассчитать стоимость»
          </div>
        </div>

        {/* Card 3: PDF Downloads */}
        <div className="glass-panel" style={{ padding: '20px', borderRadius: '18px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)' }}>
              Скачиваний PDF
            </span>
            <div style={{ width: 34, height: 34, borderRadius: '10px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={18} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: '#ef4444', lineHeight: 1.1 }}>
              {summary ? summary.totalPdfDownloads.toLocaleString('ru-RU') : '—'}
            </div>
            {summary && (
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ef4444', background: 'rgba(239, 68, 68, 0.12)', padding: '2px 6px', borderRadius: '6px' }}>
                CR: {summary.conversionToPdfRate}%
              </span>
            )}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
            Сформированных PDF-смет
          </div>
        </div>

        {/* Card 4: PNG Downloads */}
        <div className="glass-panel" style={{ padding: '20px', borderRadius: '18px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)' }}>
              Скачиваний картинок PNG
            </span>
            <div style={{ width: 34, height: 34, borderRadius: '10px', background: 'rgba(168, 85, 247, 0.15)', color: '#a855f7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ImageIcon size={18} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: '#a855f7', lineHeight: 1.1 }}>
              {summary ? summary.totalImageDownloads.toLocaleString('ru-RU') : '—'}
            </div>
            {summary && (
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#a855f7', background: 'rgba(168, 85, 247, 0.12)', padding: '2px 6px', borderRadius: '6px' }}>
                CR: {summary.conversionToImageRate}%
              </span>
            )}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
            Смет в виде изображений
          </div>
        </div>
      </div>

      {/* Conversion Funnel, OS Distribution & Geography Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        {/* Funnel Card */}
        <div className="glass-panel" style={{ padding: '22px', borderRadius: '20px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={18} style={{ color: 'var(--accent-primary)' }} />
            <span>Воронка сайта и Exit-Intent</span>
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Step 1: Total Visits */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', fontWeight: 600, marginBottom: '6px' }}>
                <span>1. Визиты на сайт (Всего)</span>
                <span>{summary?.totalSessions || 0} (100%)</span>
              </div>
              <div style={{ height: '8px', width: '100%', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: '100%', background: '#3b82f6', borderRadius: '4px' }} />
              </div>
            </div>

            {/* Step 2: Shows */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', fontWeight: 600, marginBottom: '6px' }}>
                <span>2. Показ Exit-Intent попапа</span>
                <span style={{ color: '#6366f1' }}>{summary?.totalShows || 0} ({summary?.conversionToShowRate || 0}%)</span>
              </div>
              <div style={{ height: '8px', width: '100%', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.min(100, summary?.conversionToShowRate || 0)}%`, background: '#6366f1', borderRadius: '4px' }} />
              </div>
            </div>

            {/* Step 3: Calculator Opens */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', fontWeight: 600, marginBottom: '6px' }}>
                <span>3. Клик в калькулятор</span>
                <span style={{ color: '#10b981' }}>{summary?.totalCalculatorOpens || 0} ({summary?.conversionToCalcRate || 0}%)</span>
              </div>
              <div style={{ height: '8px', width: '100%', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.min(100, summary?.conversionToCalcRate || 0)}%`, background: '#10b981', borderRadius: '4px' }} />
              </div>
            </div>

            {/* Step 4: Any Download */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', fontWeight: 600, marginBottom: '6px' }}>
                <span>4. Скачивание сметы (PDF/PNG)</span>
                <span style={{ color: '#ef4444' }}>
                  {(summary?.totalPdfDownloads || 0) + (summary?.totalImageDownloads || 0)} ({summary?.conversionTotalDownloadsRate || 0}%)
                </span>
              </div>
              <div style={{ height: '8px', width: '100%', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.min(100, summary?.conversionTotalDownloadsRate || 0)}%`, background: '#ef4444', borderRadius: '4px' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Geography / Top Cities Card */}
        <div className="glass-panel" style={{ padding: '22px', borderRadius: '20px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MapPin size={18} style={{ color: '#ec4899' }} />
            <span>География посетителей (Топ городов)</span>
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {summary?.byCity && Object.keys(summary.byCity).length > 0 ? (
              Object.entries(summary.byCity)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 6)
                .map(([cityName, count]) => {
                  const total = summary.totalSessions || 1;
                  const pct = Math.round((count / total) * 100);
                  return (
                    <div key={cityName} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.84rem', fontWeight: 600 }}>
                        <MapPin size={14} style={{ color: '#ec4899', flexShrink: 0 }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '160px' }}>{cityName}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem' }}>
                        <span style={{ fontWeight: 700 }}>{count}</span>
                        <span style={{ color: 'var(--text-secondary)', width: '38px', textAlign: 'right' }}>{pct}%</span>
                      </div>
                    </div>
                  );
                })
            ) : (
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', textAlign: 'center', padding: '16px' }}>
                Нет данных по городам
              </div>
            )}
          </div>
        </div>

        {/* OS & Device Distribution */}
        <div className="glass-panel" style={{ padding: '22px', borderRadius: '20px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Monitor size={18} style={{ color: 'var(--accent-primary)' }} />
            <span>Операционные системы</span>
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {summary?.byOs && Object.keys(summary.byOs).length > 0 ? (
              Object.entries(summary.byOs).map(([osName, count]) => {
                const total = summary.totalSessions || 1;
                const pct = Math.round((count / total) * 100);
                return (
                  <div key={osName} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.84rem', fontWeight: 600 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-primary)' }} />
                      <span>{osName}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem' }}>
                      <span style={{ fontWeight: 700 }}>{count}</span>
                      <span style={{ color: 'var(--text-secondary)', width: '38px', textAlign: 'right' }}>{pct}%</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', textAlign: 'center', padding: '16px' }}>
                Нет данных за выбранный период
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sessions Table Container */}
      <div className="glass-panel" style={{ borderRadius: '22px', overflow: 'hidden', padding: '20px' }}>
        {/* Table Header Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '18px' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={20} style={{ color: 'var(--accent-primary)' }} />
              <span>Список визитов и сессий</span>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', background: 'rgba(255, 255, 255, 0.06)', padding: '2px 8px', borderRadius: '12px' }}>
                Всего: {totalSessions}
              </span>
            </h2>
          </div>

          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input
                type="text"
                placeholder="Поиск по IP, городу или ОС..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="form-control"
                style={{ paddingLeft: '32px', fontSize: '0.84rem', width: '240px', borderRadius: '10px' }}
              />
            </div>
            <button type="submit" className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.84rem', borderRadius: '10px' }}>
              Найти
            </button>
          </form>
        </div>

        {/* Table Content */}
        <div style={{ overflowX: 'auto' }}>
          <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-secondary)', textAlign: 'left' }}>
                <th style={{ padding: '12px 10px', fontWeight: 700 }}>Дата / Время</th>
                <th style={{ padding: '12px 10px', fontWeight: 700 }}>IP-адрес / Город</th>
                <th style={{ padding: '12px 10px', fontWeight: 700 }}>ОС / Браузер</th>
                <th style={{ padding: '12px 10px', fontWeight: 700 }}>Устройство</th>
                <th style={{ padding: '12px 10px', fontWeight: 700, textAlign: 'center' }}>Показов</th>
                <th style={{ padding: '12px 10px', fontWeight: 700, textAlign: 'center' }}>Калькулятор</th>
                <th style={{ padding: '12px 10px', fontWeight: 700, textAlign: 'center' }}>Скачано</th>
                <th style={{ padding: '12px 10px', fontWeight: 700 }}>Параметры сметы</th>
                <th style={{ padding: '12px 10px', fontWeight: 700, textAlign: 'right' }}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {isLoadingSessions ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-secondary)' }}>
                    <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 8px', display: 'block' }} />
                    Загрузка данных...
                  </td>
                </tr>
              ) : sessions.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-secondary)' }}>
                    Записей не найдено
                  </td>
                </tr>
              ) : (
                sessions.map(s => {
                  const calc = parseCalcData(s.calcData);
                  const isDeleting = deletingId === s.id;
                  const dateStr = new Date(s.createdAt).toLocaleString('ru-RU', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  });

                  return (
                    <tr key={s.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', transition: 'background 0.15s ease' }}>
                      {/* Date */}
                      <td style={{ padding: '12px 10px', whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 600 }}>{dateStr}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                          {s.sessionId.substring(0, 8)}...
                        </div>
                      </td>

                      {/* IP & City */}
                      <td style={{ padding: '12px 10px' }}>
                        <div style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {s.ipAddress || '—'}
                        </div>
                        {s.city ? (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.74rem', color: '#ec4899', fontWeight: 600, marginTop: '2px' }}>
                            <MapPin size={11} />
                            <span>{s.city}{s.region ? `, ${s.region}` : ''}</span>
                          </div>
                        ) : (
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                            Локальный / Не определен
                          </div>
                        )}
                      </td>

                      {/* OS / Browser */}
                      <td style={{ padding: '12px 10px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {s.os || 'Не определена'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {s.browser || '—'}
                        </div>
                      </td>

                      {/* Device */}
                      <td style={{ padding: '12px 10px' }}>
                        {s.deviceType === 'MOBILE' ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#f59e0b', fontSize: '0.78rem', fontWeight: 600 }}>
                            <Smartphone size={14} /> Мобильный
                          </span>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#3b82f6', fontSize: '0.78rem', fontWeight: 600 }}>
                            <Monitor size={14} /> Десктоп
                          </span>
                        )}
                      </td>

                      {/* Shows count */}
                      <td style={{ padding: '12px 10px', textAlign: 'center', fontWeight: 700 }}>
                        {s.shownCount > 0 ? (
                          <span style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', padding: '2px 8px', borderRadius: '8px', fontSize: '0.8rem' }}>
                            {s.shownCount}
                          </span>
                        ) : (
                          <span style={{ background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-secondary)', padding: '2px 8px', borderRadius: '8px', fontSize: '0.76rem' }}>
                            0 (Визит)
                          </span>
                        )}
                      </td>

                      {/* Calc Opened */}
                      <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                        {s.openedCalculator ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#10b981', fontWeight: 700, fontSize: '0.8rem', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: '8px' }}>
                            <CheckCircle2 size={14} /> Да
                          </span>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                            <XCircle size={14} /> Нет
                          </span>
                        )}
                      </td>

                      {/* Downloads (PDF / PNG) */}
                      <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          {s.pdfDownloadsCount > 0 && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', padding: '2px 6px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }}>
                              <FileText size={12} /> {s.pdfDownloadsCount} PDF
                            </span>
                          )}
                          {s.imageDownloadsCount > 0 && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: 'rgba(168, 85, 247, 0.15)', color: '#a855f7', padding: '2px 6px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }}>
                              <ImageIcon size={12} /> {s.imageDownloadsCount} PNG
                            </span>
                          )}
                          {s.pdfDownloadsCount === 0 && s.imageDownloadsCount === 0 && (
                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>—</span>
                          )}
                        </div>
                      </td>

                      {/* Calc Data & Price */}
                      <td style={{ padding: '12px 10px' }}>
                        {calc ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {s.totalPrice !== undefined && s.totalPrice !== null && (
                              <span style={{ fontWeight: 800, color: '#10b981', fontSize: '0.9rem' }}>
                                {Number(s.totalPrice).toLocaleString('ru-RU')} ₽
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => setSelectedCalcData({ session: s, calc })}
                              className="btn btn-ghost"
                              style={{ padding: '2px 8px', fontSize: '0.74rem', color: 'var(--accent-primary)', display: 'inline-flex', alignItems: 'center', gap: '4px', borderRadius: '6px' }}
                              title="Посмотреть параметры расчета"
                            >
                              <Info size={13} />
                              <span>Детали ({calc.area || '—'} м²)</span>
                            </button>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>Не рассчитывал</span>
                        )}
                      </td>

                      {/* Row Delete Action */}
                      <td style={{ padding: '12px 10px', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => handleDeleteSession(s.id)}
                          disabled={isDeleting}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: isDeleting ? 'var(--text-secondary)' : '#ef4444',
                            cursor: isDeleting ? 'not-allowed' : 'pointer',
                            padding: '6px',
                            borderRadius: '8px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'background 0.15s ease'
                          }}
                          className="hover:bg-red-500/10"
                          title="Удалить запись"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '18px', paddingTop: '14px', borderTop: '1px solid var(--glass-border)' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Страница {page + 1} из {totalPages}
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                onClick={() => { const p = Math.max(0, page - 1); setPage(p); loadSessions(p); }}
                disabled={page === 0 || isLoadingSessions}
                className="btn btn-secondary"
                style={{ padding: '4px 10px', fontSize: '0.8rem', borderRadius: '8px' }}
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={() => { const p = Math.min(totalPages - 1, page + 1); setPage(p); loadSessions(p); }}
                disabled={page >= totalPages - 1 || isLoadingSessions}
                className="btn btn-secondary"
                style={{ padding: '4px 10px', fontSize: '0.8rem', borderRadius: '8px' }}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Detailed Calculator Parameters */}
      {selectedCalcData && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px'
        }}>
          <div className="glass-panel" style={{
            background: 'var(--bg-secondary, #1e293b)',
            border: '1px solid var(--glass-border)',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '540px',
            padding: '24px',
            position: 'relative',
            boxShadow: '0 20px 40px rgba(0,0,0,0.4)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calculator size={20} style={{ color: 'var(--accent-primary)' }} />
                <span>Параметры сметы клиента</span>
              </h3>
              <button
                type="button"
                onClick={() => setSelectedCalcData(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '18px' }}>
              <div style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: '12px' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Площадь</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {selectedCalcData.calc.area ?? '—'} м²
                </div>
              </div>

              <div style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: '12px' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Периметр</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {selectedCalcData.calc.perimeter ?? '—'} м.п.
                </div>
              </div>

              <div style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: '12px' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Фактура</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {getCanvasTitle(selectedCalcData.calc.canvasType)}
                </div>
              </div>

              <div style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: '12px' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Профиль</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {getProfileTitle(selectedCalcData.calc.profileType)}
                </div>
              </div>

              <div style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: '12px' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Светильники (споты)</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700 }}>
                  {selectedCalcData.calc.lights ?? 0} шт.
                </div>
              </div>

              <div style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: '12px' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Люстры</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700 }}>
                  {selectedCalcData.calc.chandeliers ?? 0} шт.
                </div>
              </div>

              <div style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: '12px' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Световые линии</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700 }}>
                  {selectedCalcData.calc.lightLines ?? 0} м
                </div>
              </div>

              <div style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: '12px' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Трековые системы</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700 }}>
                  {selectedCalcData.calc.trackSystems ?? 0} м
                </div>
              </div>

              <div style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: '12px', gridColumn: 'span 2' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Карнизы / Скрытые ниши</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700 }}>
                  {selectedCalcData.calc.curtains ?? 0} м
                </div>
              </div>
            </div>

            {/* Total Price Banner */}
            <div style={{ padding: '14px 18px', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Итоговая стоимость</div>
                {selectedCalcData.calc.isMinOrderApplied && (
                  <div style={{ fontSize: '0.7rem', color: '#10b981' }}>Учтен минимальный заказ</div>
                )}
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#10b981' }}>
                {(selectedCalcData.calc.totalPrice || selectedCalcData.session.totalPrice || 0).toLocaleString('ru-RU')} ₽
              </div>
            </div>

            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setSelectedCalcData(null)}
                className="btn btn-secondary"
                style={{ padding: '8px 18px', borderRadius: '10px' }}
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExitIntentStats;
