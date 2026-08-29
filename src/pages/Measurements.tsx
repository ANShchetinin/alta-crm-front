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
import { formatDateOnly } from '../utils/dateUtils';

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
      const d = new Date(order.measurementDate);
      return d.toDateString() === new Date().toDateString();
    } else if (filterMode === 'upcoming') {
      if (!order.measurementDate) return true;
      const d = new Date(order.measurementDate);
      return d.getTime() >= Date.now();
    }

    return true;
  });

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Шапка раздела */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '14px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'rgba(59, 130, 246, 0.15)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent-primary)'
          }}>
            <Ruler size={22} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--text-primary)' }}>
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
          className="btn btn-primary"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            fontWeight: 600,
            fontSize: '0.92rem'
          }}
        >
          <Calculator size={18} /> Быстрый экспресс-расчет
        </button>
      </div>

      {/* Панель фильтров и поиска */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '18px',
        gap: '12px',
        flexWrap: 'wrap'
      }}>
        {/* Табы фильтра */}
        <div style={{
          display: 'flex',
          background: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid var(--glass-border)',
          borderRadius: 'var(--radius-md)',
          padding: '3px'
        }}>
          <button
            type="button"
            onClick={() => setFilterMode('today')}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: 'none',
              background: filterMode === 'today' ? 'var(--accent-primary)' : 'transparent',
              color: filterMode === 'today' ? '#ffffff' : 'var(--text-secondary)',
              fontWeight: filterMode === 'today' ? 600 : 400,
              fontSize: '0.86rem',
              cursor: 'pointer'
            }}
          >
            Сегодня
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('upcoming')}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: 'none',
              background: filterMode === 'upcoming' ? 'var(--accent-primary)' : 'transparent',
              color: filterMode === 'upcoming' ? '#ffffff' : 'var(--text-secondary)',
              fontWeight: filterMode === 'upcoming' ? 600 : 400,
              fontSize: '0.86rem',
              cursor: 'pointer'
            }}
          >
            Предстоящие
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: 'none',
              background: filterMode === 'all' ? 'var(--accent-primary)' : 'transparent',
              color: filterMode === 'all' ? '#ffffff' : 'var(--text-secondary)',
              fontWeight: filterMode === 'all' ? 600 : 400,
              fontSize: '0.86rem',
              cursor: 'pointer'
            }}
          >
            Все заявки
          </button>
        </div>

        {/* Поиск */}
        <div style={{ position: 'relative', minWidth: '260px', flex: 1, maxWidth: '400px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input
            type="text"
            placeholder="Поиск по клиенту, адресу, телефону..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="search-input"
            style={{ width: '100%', paddingLeft: '36px' }}
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
          background: 'rgba(255, 255, 255, 0.02)',
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
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
          gap: '16px'
        }}>
          {filteredOrders.map(order => {
            return (
              <div
                key={order.id}
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '18px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  transition: 'transform 0.15s ease, border-color 0.15s ease'
                }}
              >
                {/* Шапка карточки */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                      Заявка #{order.id} {order.orderNumber ? `• ${order.orderNumber}` : ''}
                    </div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                      {order.clientName || 'Клиент без имени'}
                    </div>
                  </div>

                  {order.measurementDate && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      background: 'rgba(59, 130, 246, 0.12)',
                      border: '1px solid rgba(59, 130, 246, 0.25)',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      color: '#60a5fa',
                      fontSize: '0.78rem',
                      fontWeight: 600
                    }}>
                      <Clock size={12} />
                      {formatDateOnly(order.measurementDate)}
                    </div>
                  )}
                </div>

                {/* Адрес и навигация */}
                {order.address && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                      <MapPin size={15} style={{ flexShrink: 0, marginTop: '2px', color: 'var(--accent-primary)' }} />
                      <span>{order.address}</span>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', marginLeft: '20px' }}>
                      <a
                        href={getYandexMapsUrl(order.address, order.entrance, order.floor)}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          fontSize: '0.75rem',
                          color: '#fc3f1d',
                          background: 'rgba(252, 63, 29, 0.1)',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          textDecoration: 'none',
                          fontWeight: 600
                        }}
                      >
                        Яндекс.Навигатор
                      </a>
                      <a
                        href={get2GisUrl(order.address, order.entrance, order.floor)}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          fontSize: '0.75rem',
                          color: '#22c55e',
                          background: 'rgba(34, 197, 94, 0.1)',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          textDecoration: 'none',
                          fontWeight: 600
                        }}
                      >
                        2ГИС
                      </a>
                    </div>
                  </div>
                )}

                {/* Контакты клиента */}
                {order.clientPhone && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px' }}>
                    <a
                      href={`tel:${order.clientPhone.replace(/[^\d+]/g, '')}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        color: '#22c55e',
                        textDecoration: 'none',
                        fontSize: '0.9rem',
                        fontWeight: 600
                      }}
                    >
                      <Phone size={14} /> {order.clientPhone}
                    </a>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      {order.clientPhone && (
                        <button
                          type="button"
                          onClick={() => window.open(getWhatsAppLink(order.clientPhone!), '_blank')}
                          className="contact-btn whatsapp-btn"
                          style={{ width: '28px', height: '28px' }}
                          title="WhatsApp"
                        >
                          <MessageCircle size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Кнопка запуска замера */}
                <button
                  type="button"
                  onClick={() => setActiveOrderId(order.id)}
                  className="btn btn-primary"
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '10px',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    marginTop: 'auto'
                  }}
                >
                  <Ruler size={16} /> Открыть мастер замера
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Модальное окно Мастера замера для конкретного заказа */}
      {activeOrderId && createPortal(
        <div
          className="modal-overlay"
          onClick={() => setActiveOrderId(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '32px 16px',
            zIndex: 100000,
            overflowY: 'auto'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--card-bg, #1a1f2c)',
              border: '1px solid var(--glass-border)',
              borderRadius: 'var(--radius-lg)',
              maxWidth: '900px',
              width: '100%',
              maxHeight: 'calc(100vh - 64px)',
              overflowY: 'auto',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              margin: 'auto',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-primary)' }}>
                  📐 Замер по заявке #{activeOrderId}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setActiveOrderId(null)}
                className="btn-icon"
                style={{ fontSize: '1.2rem', padding: '4px' }}
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
          className="modal-overlay"
          onClick={() => setIsExpressCalcOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '32px 16px',
            zIndex: 100000,
            overflowY: 'auto'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--card-bg, #1a1f2c)',
              border: '1px solid var(--glass-border)',
              borderRadius: 'var(--radius-lg)',
              maxWidth: '900px',
              width: '100%',
              maxHeight: 'calc(100vh - 64px)',
              overflowY: 'auto',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              margin: 'auto',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
                className="btn-icon"
                style={{ fontSize: '1.2rem', padding: '4px' }}
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
