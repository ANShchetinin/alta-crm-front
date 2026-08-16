import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Plus, Edit2, Trash2, FileText, ArrowRight, Phone, X } from 'lucide-react';
import type { Client } from '../api/clients';
import { getClients, createClient, updateClient, deleteClient } from '../api/clients';
import type { Order, OrderStatus } from '../api/kanban';
import { getOrdersByClient, getOrderStatuses, moveOrder } from '../api/kanban';
import { useNavigate } from 'react-router-dom';
import '../styles/clients.css';

export const Clients = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [statuses, setStatuses] = useState<OrderStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyClient, setHistoryClient] = useState<Client | null>(null);
  const [clientHistory, setClientHistory] = useState<Order[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  const [formData, setFormData] = useState({ name: '', phone: '' });

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const [data, statusesData] = await Promise.all([
        getClients(),
        getOrderStatuses()
      ]);
      setClients(data);
      setStatuses(statusesData.sort((a, b) => a.sortOrder - b.sortOrder));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.phone.includes(search)
  );

  const openAddModal = () => {
    setEditingClient(null);
    setFormData({ name: '', phone: '+7' });
    setIsModalOpen(true);
  };

  const openEditModal = (client: Client) => {
    setEditingClient(client);
    setFormData({ name: client.name, phone: client.phone });
    setIsModalOpen(true);
  };

  const openHistoryModal = async (client: Client) => {
    setHistoryClient(client);
    setClientHistory([]);
    setIsHistoryModalOpen(true);
    setLoadingHistory(true);
    try {
      const orders = await getOrdersByClient(client.id);
      setClientHistory(orders);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingClient) {
        await updateClient(editingClient.id, formData);
      } else {
        await createClient(formData);
      }
      setIsModalOpen(false);
      fetchClients();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure?')) {
      try {
        await deleteClient(id);
        fetchClients();
      } catch (err) {
        console.error(err);
      }
    }
  };

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="clients-wrapper">
      {/* Header */}
      <div className="clients-header">
        <h1>{t('clients.title')}</h1>
        
        <div className="clients-actions">
          <div className="search-input-wrapper">
            <Search className="search-icon" size={18} />
            <input 
              type="text" 
              placeholder={t('clients.search')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="search-input"
            />
          </div>
          <button onClick={openAddModal} className="btn btn-primary">
            <Plus size={18} />
            <span>{t('clients.addClient')}</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="clients-table-container glass-panel">
        <table className="clients-table">
          <thead>
            <tr>
              <th>{t('clients.columns.name')}</th>
              <th>{t('clients.columns.phone')}</th>
              <th>{t('clients.columns.createdAt')}</th>
              <th style={{textAlign: 'right'}}>{t('clients.columns.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {filteredClients.length === 0 ? (
              <tr>
                <td colSpan={4} style={{textAlign: 'center', opacity: 0.5}}>
                  No clients found.
                </td>
              </tr>
            ) : (
              filteredClients.map(client => (
                <tr key={client.id}>
                  <td>
                    <div className="client-name">{client.name}</div>
                  </td>
                  <td>
                    <div className="client-phone">
                      {client.phone ? (
                        <a 
                          href={`tel:${client.phone}`} 
                          title="Позвонить"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            color: 'var(--text-primary)',
                            textDecoration: 'none',
                            padding: '4px 8px',
                            borderRadius: 'var(--radius-sm)',
                            background: 'rgba(34, 197, 94, 0.1)',
                            border: '1px solid rgba(34, 197, 94, 0.2)',
                            fontWeight: 500
                          }}
                        >
                          <Phone size={13} style={{ color: 'var(--success)' }} />
                          <span>{client.phone}</span>
                        </a>
                      ) : '-'}
                    </div>
                  </td>
                  <td>
                    <div className="client-date">
                      {new Date(client.createdAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td>
                    <div className="client-actions">
                      {client.phone && (
                        <a 
                          href={`tel:${client.phone}`}
                          className="action-btn"
                          style={{ color: 'var(--success)' }}
                          title="Позвонить клиенту"
                        >
                          <Phone size={16} />
                        </a>
                      )}
                      <button 
                        onClick={() => openHistoryModal(client)}
                        className="action-btn"
                        title="История заявок"
                      >
                        <FileText size={16} />
                      </button>
                      <button 
                        onClick={() => openEditModal(client)}
                        className="action-btn"
                        title={t('clients.modal.editTitle')}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(client.id)}
                        className="action-btn delete"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Overlay */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h2>{editingClient ? t('clients.modal.editTitle') : t('clients.modal.addTitle')}</h2>
              <button 
                type="button" 
                onClick={() => setIsModalOpen(false)}
                className="btn-icon"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              <div className="modal-body">
                <div className="form-group">
                  <label>{t('clients.modal.name')}</label>
                  <input 
                    type="text" 
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="search-input"
                    style={{ width: '100%', paddingLeft: '12px' }}
                  />
                </div>
                <div className="form-group">
                  <label>{t('clients.modal.phone')}</label>
                  <input 
                    type="text" 
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="search-input"
                    style={{ width: '100%', paddingLeft: '12px' }}
                  />
                </div>
              </div>
              <div className="modal-actions">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="btn btn-ghost"
                >
                  {t('clients.modal.cancel')}
                </button>
                <button type="submit" className="btn btn-primary">
                  {t('clients.modal.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Modal Overlay */}
      {isHistoryModalOpen && historyClient && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '800px', width: '90%' }}>
            <div className="modal-header">
              <h2>История заявок: {historyClient.name}</h2>
              <button 
                type="button" 
                onClick={() => setIsHistoryModalOpen(false)}
                className="btn-icon"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              {loadingHistory ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>Загрузка истории...</div>
              ) : (
                <div className="clients-table-container glass-panel" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  <table className="clients-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Статус</th>
                        <th>Адрес</th>
                        <th>Стоимость</th>
                        <th>Дата</th>
                        <th style={{textAlign: 'right'}}>Действия</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clientHistory.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ textAlign: 'center', opacity: 0.5 }}>У клиента нет заявок.</td>
                        </tr>
                      ) : (
                        clientHistory.map(order => {
                          const currentStatus = statuses.find(s => s.id === order.statusId);
                          return (
                            <tr key={order.id}>
                              <td>#{order.id}</td>
                              <td>
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                  <span 
                                    style={{ 
                                      width: '8px', 
                                      height: '8px', 
                                      borderRadius: '50%', 
                                      backgroundColor: currentStatus?.color || '#3b82f6',
                                      flexShrink: 0
                                    }} 
                                  />
                                  <select
                                    value={order.statusId}
                                    onChange={async (e) => {
                                      const newStatusId = Number(e.target.value);
                                      try {
                                        await moveOrder(order.id, newStatusId);
                                        setClientHistory(prev => prev.map(o => o.id === order.id ? { ...o, statusId: newStatusId } : o));
                                      } catch (err) {
                                        console.error(err);
                                      }
                                    }}
                                    style={{
                                      background: 'rgba(255, 255, 255, 0.05)',
                                      border: '1px solid rgba(255, 255, 255, 0.1)',
                                      color: 'var(--text-primary)',
                                      borderRadius: '4px',
                                      padding: '3px 6px',
                                      fontSize: '0.8rem',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    {statuses.map(s => (
                                      <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                  </select>
                                </div>
                              </td>
                              <td>{order.address || '-'}</td>
                              <td>
                                <div>{(order.totalPrice || 0).toLocaleString('ru-RU')} ₽</div>
                                {(order.prepayment != null || order.remainder != null) && (
                                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                    Ав: {(order.prepayment || 0).toLocaleString('ru-RU')} • Ост: {(order.remainder != null ? order.remainder : order.totalPrice).toLocaleString('ru-RU')}
                                  </div>
                                )}
                              </td>
                              <td>{order.createdAt ? new Date(order.createdAt).toLocaleDateString() : '-'}</td>
                              <td style={{textAlign: 'right'}}>
                                <button 
                                  onClick={() => {
                                    setIsHistoryModalOpen(false);
                                    navigate(`/?orderId=${order.id}`);
                                  }}
                                  className="action-btn"
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', fontSize: '0.8rem' }}
                                >
                                  Перейти <ArrowRight size={14} />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="modal-actions">
              <button 
                type="button" 
                onClick={() => setIsHistoryModalOpen(false)}
                className="btn btn-primary"
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
