import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Ruler,
  MapPin,
  Phone,
  Search,
  Clock,
  Calculator,
  MessageCircle
} from 'lucide-react';
import { getOrders, type Order } from '../api/kanban';
import { getMaterials, type Material } from '../api/storage';
import { useAuthStore } from '../store/useAuthStore';
import { MeasurementWizard } from '../components/MeasurementWizard';
import { getYandexMapsUrl, get2GisUrl } from '../utils/navigation';
import { getWhatsAppLink } from '../utils/messengerUtils';
import { formatDateTime, parseLocalDateTime } from '../utils/dateUtils';
import '../styles/measurements.css';

export const Measurements: React.FC = () => {
  const userId = useAuthStore(state => state.userId);
  const role = useAuthStore(state => state.role);
  const isWorker = role === 'WORKER';

  const [orders, setOrders] = useState<Order[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterMode, setFilterMode] = useState<'today' | 'upcoming' | 'all'>('today');

  // Модалка мастера замера
  const [activeOrderId, setActiveOrderId] = useState<number | null>(null);
  const [isExpressCalcOpen, setIsExpressCalcOpen] = useState<boolean>(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [ordersData, materialsData] = await Promise.all([
        getOrders(),
        getMaterials()
      ]);
      setOrders(ordersData);
      setMaterials(materialsData);
    } catch (e) {
      console.error('Ошибка загрузки данных замерщика:', e);
    } finally {
      setLoading(false);
    }
  };

  // Фильтрация заявок для замера
  const filteredOrders = orders.filter(order => {
    // Если WORKER, показываем только назначенные ему замеры или заявки
    if (isWorker && userId) {
      const isMyMeasurement = order.measurerId === userId || order.assigneeId === userId;
      if (!isMyMeasurement) return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchClient = order.clientName?.toLowerCase().includes(q) || false;
      const matchPhone = order.clientPhone?.includes(q) || false;
      const matchAddress = order.address?.toLowerCase().includes(q) || false;
      const matchNum = order.orderNumber?.toLowerCase().includes(q) || false;
      if (!matchClient && !matchPhone && !matchAddress && !matchNum) {
        return false;
      }
    }

    if (filterMode === 'today') {
      if (!order.measurementDate) return true; // Без даты тоже показываем
      const d = parseLocalDateTime(order.measurementDate);
      return d ? d.toDateString() === new Date().toDateString() : true;
    } else if (filterMode === 'upcoming') {
      if (!order.measurementDate) return true;
      const d = parseLocalDateTime(order.measurementDate);
      return d ? d.getTime() >= Date.now() : true;
    }

    return true;
  });

  return (
    <div className="measurements-container">
      {/* Шапка раздела */}
      <div className="measurements-header">
        <div className="measurements-title-box">
          <div className="measurements-title-icon">
            <Ruler size={22} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.35rem', color: 'var(--text-primary)' }}>
              Выезды и калькулятор замера
            </h1>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Мастер расчета натяжных потолков по помещениям и геометрии
            </p>
          </div>
        </div>

        {/* Кнопка Экспресс-калькулятора */}
        <button
          type="button"
          onClick={() => setIsExpressCalcOpen(true)}
          className="btn btn-primary measurements-header-btn"
        >
          <Calculator size={18} /> <span>Быстрый экспресс-расчет</span>
        </button>
      </div>

      {/* Панель фильтров и поиска */}
      <div className="measurements-filter-bar">
        {/* Табы фильтра */}
        <div className="measurements-filter-tabs">
          <button
            type="button"
            onClick={() => setFilterMode('today')}
            className={`measurements-tab-btn ${filterMode === 'today' ? 'active' : ''}`}
          >
            Сегодня
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('upcoming')}
            className={`measurements-tab-btn ${filterMode === 'upcoming' ? 'active' : ''}`}
          >
            Предстоящие
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={`measurements-tab-btn ${filterMode === 'all' ? 'active' : ''}`}
          >
            Все заявки
          </button>
        </div>

        {/* Поиск */}
        <div className="measurements-search-box">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Поиск по клиенту, адресу, телефону..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="measurements-search-input"
          />
        </div>
      </div>

      {/* Список выездов на замер */}
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          Загрузка списка замеров...
        </div>
      ) : filteredOrders.length === 0 ? (
        <div style={{
          padding: '48px 20px',
          textAlign: 'center',
          background: 'var(--card-bg, rgba(255, 255, 255, 0.02))',
          border: '1px solid var(--glass-border)',
          borderRadius: 'var(--radius-lg)',
          color: 'var(--text-secondary)'
        }}>
          <Ruler size={36} style={{ opacity: 0.4, marginBottom: '12px' }} />
          <div style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
            Нет заявок на замер
          </div>
          <p style={{ fontSize: '0.86rem', margin: 0 }}>
            {filterMode === 'today' ? 'На сегодня выездов не назначено' : 'По выбранному фильтру ничего не найдено'}
          </p>
        </div>
      ) : (
        <div className="measurements-grid">
          {filteredOrders.map(order => {
            return (
              <div
                key={order.id}
                className="measurement-order-card"
              >
                {/* Шапка карточки */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                      Заказ #{order.id} {order.orderNumber ? `• ${order.orderNumber}` : ''}
                    </div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                      {order.clientName || 'Клиент без имени'}
                    </div>
                  </div>

                  {order.measurementDate && (
                    <div className="measurement-date-badge">
                      <Clock size={12} />
                      {formatDateTime(order.measurementDate)}
                    </div>
                  )}
                </div>

                {/* Адрес и навигация */}
                {order.address && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                      <MapPin size={15} style={{ flexShrink: 0, marginTop: '2px', color: 'var(--accent-primary)' }} />
                      <span style={{ color: 'var(--text-primary)' }}>{order.address}</span>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', paddingLeft: '20px', flexWrap: 'wrap' }}>
                      <a
                        href={getYandexMapsUrl(order.address, order.entrance, order.floor)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="measurement-nav-link yandex"
                      >
                        Яндекс.Навигатор
                      </a>
                      <a
                        href={get2GisUrl(order.address, order.entrance, order.floor)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="measurement-nav-link gis"
                      >
                        2ГИС
                      </a>
                    </div>
                  </div>
                )}

                {/* Контакты клиента */}
                {order.clientPhone && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--glass-border)', paddingTop: '10px' }}>
                    <a
                      href={`tel:${order.clientPhone.replace(/[^\d+]/g, '')}`}
                      className="measurement-phone-btn"
                    >
                      <Phone size={14} /> <span>{order.clientPhone}</span>
                    </a>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          const waUrl = getWhatsAppLink(order.clientPhone!, `Здравствуйте, ${order.clientName || ''}! Напоминаем о замере.`);
                          window.open(waUrl, '_blank');
                        }}
                        className="measurement-wa-btn"
                        title="Написать в WhatsApp"
                      >
                        <MessageCircle size={13} /> WA
                      </button>
                    </div>
                  </div>
                )}

                {/* Кнопка запуска Мастера замера */}
                <div style={{ marginTop: 'auto', paddingTop: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setActiveOrderId(order.id)}
                    className="measurement-start-btn"
                  >
                    <Ruler size={16} /> <span>Начать замер и смету</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Модальное окно Мастера замера для выбранной заявки */}
      {activeOrderId && createPortal(
        <div
          className="wizard-modal-overlay"
          onClick={() => setActiveOrderId(null)}
        >
          <div
            className="wizard-modal-box"
            onClick={e => e.stopPropagation()}
          >
            <div className="wizard-modal-header">
              <div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-primary)' }}>
                  📐 Замер по заявке #{activeOrderId}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setActiveOrderId(null)}
                className="wizard-modal-close-btn"
                aria-label="Закрыть"
              >
                ✕
              </button>
            </div>

            <MeasurementWizard
              orderId={activeOrderId}
              materials={materials}
              canViewFinances={role === 'OWNER' || role === 'SUPERADMIN' || role === 'MANAGER'}
              onSaved={() => {
                loadData();
                setActiveOrderId(null);
              }}
            />
          </div>
        </div>,
        document.body
      )}

      {/* Модальное окно Экспресс-калькулятора (без заказа) */}
      {isExpressCalcOpen && createPortal(
        <div
          className="wizard-modal-overlay"
          onClick={() => setIsExpressCalcOpen(false)}
        >
          <div
            className="wizard-modal-box"
            onClick={e => e.stopPropagation()}
          >
            <div className="wizard-modal-header">
              <div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-primary)' }}>
                  ⚡ Экспресс-калькулятор натяжных потолков
                </h2>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Быстрый расчет предварительной сметы для клиента
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsExpressCalcOpen(false)}
                className="wizard-modal-close-btn"
                aria-label="Закрыть"
              >
                ✕
              </button>
            </div>

            <MeasurementWizard
              materials={materials}
              canViewFinances={role === 'OWNER' || role === 'SUPERADMIN' || role === 'MANAGER'}
            />
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

