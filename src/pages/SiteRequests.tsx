import React, { useState, useEffect, useCallback } from 'react';
import { 
  Globe, Search, RefreshCw, Phone, MessageSquare, 
  Trash2, Edit3, ArrowRight, Loader2, Inbox 
} from 'lucide-react';
import { 
  getSiteRequests, 
  deleteSiteRequest, 
  type SiteRequestItem, 
  type CalcDataPayload 
} from '../api/siteRequests';
import { SiteRequestModal } from '../components/siteRequests/SiteRequestModal';
import { ConvertToOrderModal } from '../components/siteRequests/ConvertToOrderModal';
import { useAppStore } from '../store/useAppStore';
import { formatTimeAgo, formatDateTime } from '../utils/dateUtils';
import { toast } from '../utils/toast';
import { confirm } from '../utils/confirm';
import '../styles/site-requests.css';

export const SiteRequests: React.FC = () => {
  const [siteRequests, setSiteRequests] = useState<SiteRequestItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Modals state
  const [selectedRequest, setSelectedRequest] = useState<SiteRequestItem | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [requestToConvert, setRequestToConvert] = useState<SiteRequestItem | null>(null);
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);

  const { setNewSiteRequestsCount } = useAppStore();

  const fetchRequests = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const data = await getSiteRequests(searchQuery);
      setSiteRequests(data);
      setNewSiteRequestsCount(data.length);
    } catch (err: any) {
      console.error('Failed to load site requests', err);
      if (!silent) toast.error('Не удалось загрузить заявки с сайта');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [searchQuery, setNewSiteRequestsCount]);

  useEffect(() => {
    fetchRequests(false);
  }, [fetchRequests]);

  // Periodic polling & focus/visibility sync for multi-device real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      fetchRequests(true);
    }, 10000);

    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        fetchRequests(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, [fetchRequests]);

  const handleDelete = async (id: number) => {
    const isConfirmed = await confirm({
      title: 'Удалить заявку?',
      message: 'Вы уверены, что хотите удалить эту заявку с сайта? Это действие нельзя отменить.',
      confirmText: 'Удалить',
      cancelText: 'Отмена',
      danger: true,
    });

    if (!isConfirmed) return;

    try {
      await deleteSiteRequest(id);
      toast.success('Заявка удалена');
      if (selectedRequest?.id === id) {
        setIsEditModalOpen(false);
        setSelectedRequest(null);
      }
      fetchRequests();
    } catch (err: any) {
      console.error('Failed to delete site request', err);
      toast.error('Ошибка при удалении заявки');
    }
  };

  const handleOpenEdit = (request: SiteRequestItem) => {
    setSelectedRequest(request);
    setIsEditModalOpen(true);
  };

  const handleOpenConvert = (request: SiteRequestItem) => {
    setRequestToConvert(request);
    setIsConvertModalOpen(true);
  };

  const parseCalc = (calcData?: string | null): CalcDataPayload | null => {
    if (!calcData) return null;
    try {
      return JSON.parse(calcData);
    } catch {
      return null;
    }
  };

  return (
    <div className="site-requests-container">
      {/* Header */}
      <div className="site-requests-header">
        <div className="site-requests-title-group">
          <Globe size={24} style={{ color: 'var(--accent-primary)' }} />
          <h1 className="site-requests-title">Заявки с сайта</h1>
          {siteRequests.length > 0 && (
            <span className="site-requests-count-badge">
              {siteRequests.length}
            </span>
          )}
        </div>

        <div className="site-requests-controls">
          <div className="site-requests-search">
            <Search size={16} className="site-requests-search-icon" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по имени, телефону, сайту..."
            />
          </div>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => fetchRequests(false)}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            title="Обновить список"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            <span className="hidden-mobile">Обновить</span>
          </button>
        </div>
      </div>

      {/* Content */}
      {loading && siteRequests.length === 0 ? (
        <div className="site-requests-empty">
          <Loader2 size={36} className="animate-spin" style={{ color: 'var(--accent-primary)', marginBottom: '12px' }} />
          <p>Загрузка входящих заявок...</p>
        </div>
      ) : siteRequests.length === 0 ? (
        <div className="site-requests-empty">
          <div className="site-requests-empty-icon">
            <Inbox size={28} />
          </div>
          <h3>Нет новых заявок с сайта</h3>
          <p style={{ margin: 0, maxWidth: '400px', fontSize: '0.9rem' }}>
            Все входящие заявки обработаны. Новые заявки с форм калькулятора и сайта будут появляться здесь.
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="site-requests-table-wrapper">
            <table className="site-requests-table">
              <thead>
                <tr>
                  <th>Поступила</th>
                  <th>Клиент</th>
                  <th>Источник</th>
                  <th>Параметры с сайта</th>
                  <th>Сумма</th>
                  <th style={{ textAlign: 'right' }}>Действия</th>
                </tr>
              </thead>
              <tbody>
                {siteRequests.map((req) => {
                  const calc = parseCalc(req.calcData);
                  const cleanPhone = req.phone ? req.phone.replace(/[^0-9]/g, '') : '';
                  return (
                    <tr 
                      key={req.id}
                      className="sr-table-row-clickable"
                      onClick={() => handleOpenEdit(req)}
                      title="Нажмите, чтобы открыть подробности заявки"
                    >
                      {/* Date */}
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                          {formatTimeAgo(req.createdAt)}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {formatDateTime(req.createdAt)}
                        </div>
                      </td>

                      {/* Client info */}
                      <td>
                        <div className="sr-client-cell">
                          <span className="sr-client-name">{req.clientName}</span>
                          <div className="sr-client-phone-row">
                            <span>{req.phone}</span>
                            {cleanPhone && (
                              <div style={{ display: 'inline-flex', gap: '4px' }} onClick={(e) => e.stopPropagation()}>
                                <a
                                  href={`tel:+${cleanPhone}`}
                                  className="sr-quick-action-btn"
                                  title="Позвонить"
                                >
                                  <Phone size={13} />
                                </a>
                                <a
                                  href={`https://wa.me/${cleanPhone}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="sr-quick-action-btn wa"
                                  title="WhatsApp"
                                >
                                  <MessageSquare size={13} />
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Source */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          {req.site && (
                            <span className="sr-badge sr-badge-site">
                              <Globe size={12} />
                              {req.site}
                            </span>
                          )}
                          {(req.formName || req.formType) && (
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                              {req.formName || req.formType}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Calc data badges & Customer Comment */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxWidth: '340px' }}>
                          {calc && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                              {calc.area && (
                                <span className="sr-badge" style={{ background: 'rgba(59,130,246,0.08)', color: 'var(--text-primary)' }}>
                                  {calc.area} м²
                                </span>
                              )}
                              {calc.texture && (
                                <span className="sr-badge" style={{ background: 'rgba(168,85,247,0.08)', color: 'var(--text-primary)' }}>
                                  {calc.texture}
                                </span>
                              )}
                              {calc.lights && (
                                <span className="sr-badge" style={{ background: 'rgba(234,179,8,0.08)', color: 'var(--text-primary)' }}>
                                  💡 {calc.lights}
                                </span>
                              )}
                              {calc.selectedPlan && (
                                <span className="sr-badge" style={{ background: 'rgba(59,130,246,0.1)', color: 'var(--accent-primary)' }}>
                                  {calc.selectedPlan}
                                </span>
                              )}
                            </div>
                          )}
                          
                          {req.comment && (
                            <div className="sr-table-comment" title={req.comment}>
                              <MessageSquare size={13} style={{ flexShrink: 0, color: 'var(--accent-primary)', marginTop: '2px' }} />
                              <span style={{ color: 'var(--text-primary)' }}>{req.comment}</span>
                            </div>
                          )}

                          {!calc && !req.comment && (
                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>—</span>
                          )}
                        </div>
                      </td>

                      {/* Price */}
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {req.calculatedPrice ? (
                          <span className="sr-badge sr-badge-price">
                            {req.calculatedPrice.toLocaleString('ru-RU')} ₽
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="sr-actions-cell">
                          <button
                            type="button"
                            className="sr-btn-convert"
                            onClick={() => handleOpenConvert(req)}
                            title="Создать заказ"
                          >
                            <span>Создать заказ</span>
                            <ArrowRight size={14} />
                          </button>

                          <button
                            type="button"
                            className="btn-icon"
                            onClick={() => handleOpenEdit(req)}
                            title="Просмотр и редактирование"
                          >
                            <Edit3 size={16} />
                          </button>

                          <button
                            type="button"
                            className="btn-icon"
                            onClick={() => handleDelete(req.id)}
                            style={{ color: 'var(--danger)' }}
                            title="Удалить заявку"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards List (< 860px) */}
          <div className="site-requests-mobile-list">
            {siteRequests.map((req) => {
              const calc = parseCalc(req.calcData);
              const cleanPhone = req.phone ? req.phone.replace(/[^0-9]/g, '') : '';
              return (
                <div 
                  key={req.id} 
                  className="site-request-card sr-card-clickable"
                  onClick={() => handleOpenEdit(req)}
                >
                  <div className="sr-card-header">
                    <div>
                      <div className="sr-client-name" style={{ fontSize: '1rem' }}>
                        {req.clientName}
                      </div>
                      <div className="sr-card-date">
                        {formatTimeAgo(req.createdAt)} • {formatDateTime(req.createdAt)}
                      </div>
                    </div>
                    {req.calculatedPrice ? (
                      <span className="sr-badge sr-badge-price">
                        {req.calculatedPrice.toLocaleString('ru-RU')} ₽
                      </span>
                    ) : null}
                  </div>

                  <div className="sr-card-body">
                    <div className="sr-client-phone-row" style={{ justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 500 }}>{req.phone}</span>
                      {cleanPhone && (
                        <div style={{ display: 'flex', gap: '6px' }} onClick={(e) => e.stopPropagation()}>
                          <a
                            href={`tel:+${cleanPhone}`}
                            className="sr-quick-action-btn"
                            title="Позвонить"
                            aria-label="Позвонить"
                          >
                            <Phone size={15} />
                          </a>
                          <a
                            href={`https://wa.me/${cleanPhone}`}
                            target="_blank"
                            rel="noreferrer"
                            className="sr-quick-action-btn wa"
                            title="WhatsApp"
                            aria-label="WhatsApp"
                          >
                            <MessageSquare size={15} />
                          </a>
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
                      {req.site && (
                        <span className="sr-badge sr-badge-site">
                          <Globe size={12} />
                          {req.site}
                        </span>
                      )}
                      {(req.formName || req.formType) && (
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                          {req.formName || req.formType}
                        </span>
                      )}
                    </div>

                    {calc && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                        {calc.area && (
                          <span className="sr-badge" style={{ background: 'rgba(59,130,246,0.08)' }}>
                            {calc.area} м²
                          </span>
                        )}
                        {calc.texture && (
                          <span className="sr-badge" style={{ background: 'rgba(168,85,247,0.08)' }}>
                            {calc.texture}
                          </span>
                        )}
                        {calc.lights && (
                          <span className="sr-badge" style={{ background: 'rgba(234,179,8,0.08)' }}>
                            💡 {calc.lights} шт.
                          </span>
                        )}
                        {calc.selectedPlan && (
                          <span className="sr-badge" style={{ background: 'rgba(59,130,246,0.1)', color: 'var(--accent-primary)' }}>
                            Тариф: {calc.selectedPlan}
                          </span>
                        )}
                      </div>
                    )}

                    {req.comment && (
                      <div className="sr-card-comment">
                        {req.comment}
                      </div>
                    )}
                  </div>

                  <div className="sr-card-footer" onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: '6px 10px', fontSize: '0.82rem' }}
                        onClick={() => handleOpenEdit(req)}
                      >
                        <Edit3 size={14} />
                        <span>Детали</span>
                      </button>

                      <button
                        type="button"
                        className="btn btn-ghost"
                        style={{ padding: '6px 8px', color: 'var(--danger)' }}
                        onClick={() => handleDelete(req.id)}
                        title="Удалить"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <button
                      type="button"
                      className="sr-btn-convert"
                      onClick={() => handleOpenConvert(req)}
                    >
                      <span>Создать заказ</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Edit / View Modal */}
      {isEditModalOpen && selectedRequest && (
        <SiteRequestModal
          siteRequest={selectedRequest}
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedRequest(null);
          }}
          onUpdated={fetchRequests}
          onDelete={handleDelete}
          onConvertToOrder={(req) => {
            setIsEditModalOpen(false);
            handleOpenConvert(req);
          }}
        />
      )}

      {/* Convert to Order Modal */}
      {isConvertModalOpen && requestToConvert && (
        <ConvertToOrderModal
          siteRequest={requestToConvert}
          isOpen={isConvertModalOpen}
          onClose={() => {
            setIsConvertModalOpen(false);
            setRequestToConvert(null);
          }}
          onSuccess={fetchRequests}
        />
      )}
    </div>
  );
};
