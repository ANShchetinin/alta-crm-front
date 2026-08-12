import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Plus, Edit2, Trash2, FileText, ArrowRight } from 'lucide-react';
import type { Client } from '../api/clients';
import { getClients, createClient, updateClient, deleteClient } from '../api/clients';
import type { Order } from '../api/kanban';
import { getOrdersByClient } from '../api/kanban';
import { useNavigate } from 'react-router-dom';
import '../styles/clients.css';

export const Clients = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
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
      const data = await getClients();
      setClients(data);
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
                    <div className="client-phone">{client.phone}</div>
                  </td>
                  <td>
                    <div className="client-date">
                      {new Date(client.createdAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td>
                    <div className="client-actions">
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
          <div className="modal-content">
            <h2>{editingClient ? t('clients.modal.editTitle') : t('clients.modal.addTitle')}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>{t('clients.modal.name')}</label>
                <input 
                  type="text" 
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>{t('clients.modal.phone')}</label>
                <input 
                  type="text" 
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                />
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
            <h2>История заявок: {historyClient.name}</h2>
            {loadingHistory ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>Загрузка истории...</div>
            ) : (
              <div className="clients-table-container glass-panel" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                <table className="clients-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Адрес</th>
                      <th>Стоимость</th>
                      <th>Дата</th>
                      <th style={{textAlign: 'right'}}>Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientHistory.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', opacity: 0.5 }}>У клиента нет заявок.</td>
                      </tr>
                    ) : (
                      clientHistory.map(order => (
                        <tr key={order.id}>
                          <td>#{order.id}</td>
                          <td>{order.address}</td>
                          <td>{order.totalPrice} ₽</td>
                          <td>{order.createdAt ? new Date(order.createdAt).toLocaleDateString() : ''}</td>
                          <td style={{textAlign: 'right'}}>
                            <button 
                              className="btn btn-ghost" 
                              style={{padding: '4px 8px', fontSize: '0.85rem'}}
                              onClick={() => {
                                setIsHistoryModalOpen(false);
                                navigate(`/kanban?orderId=${order.id}`);
                              }}
                            >
                              Подробнее <ArrowRight size={14} style={{marginLeft: '4px'}} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
            <div className="modal-actions" style={{ marginTop: '1rem' }}>
              <button 
                type="button" 
                onClick={() => setIsHistoryModalOpen(false)}
                className="btn btn-ghost"
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
