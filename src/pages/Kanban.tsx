import { useState, useEffect } from 'react';
import { Plus, MoreVertical } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getOrderStatuses, getOrders, moveOrder, createOrder } from '../api/kanban';
import type { OrderStatus, Order } from '../api/kanban';
import { getClients } from '../api/clients';
import type { Client } from '../api/clients';
import '../styles/kanban.css';
import '../styles/clients.css'; // Reuse modal styles

const Kanban = () => {
  const { t } = useTranslation();
  const [columns, setColumns] = useState<OrderStatus[]>([]);
  const [cards, setCards] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<Client[]>([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    clientId: '',
    address: '',
    description: '',
    totalPrice: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statuses, orders, clientsData] = await Promise.all([
          getOrderStatuses(),
          getOrders(),
          getClients()
        ]);
        setColumns(statuses.sort((a, b) => a.sortOrder - b.sortOrder));
        setCards(orders);
        setClients(clientsData);
      } catch (error) {
        console.error("Failed to fetch kanban data", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleDragStart = (e: React.DragEvent, id: number) => {
    e.dataTransfer.setData('cardId', id.toString());
  };

  const handleDrop = async (e: React.DragEvent, statusId: number) => {
    const cardId = parseInt(e.dataTransfer.getData('cardId'));
    // Optimistic UI update
    setCards(cards.map(c => c.id === cardId ? { ...c, statusId } : c));
    try {
      await moveOrder(cardId, statusId);
    } catch (err) {
      console.error("Failed to move order", err);
      // Revert if needed, ignored for simplicity
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!columns.length) return;
    
    try {
      const newOrder = await createOrder({
        clientId: parseInt(formData.clientId),
        statusId: columns[0].id, // Start in the first column
        address: formData.address,
        description: formData.description,
        totalPrice: parseFloat(formData.totalPrice)
      });
      setCards([...cards, newOrder]);
      setIsModalOpen(false);
      setFormData({ clientId: '', address: '', description: '', totalPrice: '' });
    } catch (err) {
      console.error("Failed to create order", err);
    }
  };

  if (loading) {
    return <div style={{padding: 24}}>Loading board...</div>;
  }

  return (
    <div className="kanban-wrapper">
      <div className="kanban-header">
        <h1>{t('kanban.title')}</h1>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={18} /> {t('kanban.addOrder')}
        </button>
      </div>

      <div className="kanban-board">
        {columns.map(col => (
          <div 
            key={col.id} 
            className="kanban-column glass-panel"
            onDrop={(e) => handleDrop(e, col.id)}
            onDragOver={handleDragOver}
          >
            <div className="column-header">
              <div className="column-title">
                <span className="dot" style={{ backgroundColor: col.color || '#3b82f6' }}></span>
                <h3>{col.name}</h3>
                <span className="count">{cards.filter(c => c.statusId === col.id).length}</span>
              </div>
              <button className="btn-icon"><MoreVertical size={16} /></button>
            </div>

            <div className="column-content">
              {cards.filter(c => c.statusId === col.id).map(card => (
                <div 
                  key={card.id} 
                  className="kanban-card"
                  draggable
                  onDragStart={(e) => handleDragStart(e, card.id)}
                >
                  <div className="card-client">
                    {clients.find(cl => cl.id === card.clientId)?.name || `Client #${card.clientId}`}
                  </div>
                  <div className="card-desc">{card.description}</div>
                  <div className="card-footer">
                    <span className="card-price">{card.totalPrice} ₽</span>
                    <div className="avatar-small">A</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        
        <button className="add-column-btn glass-panel">
          <Plus size={20} /> {t('kanban.addColumn')}
        </button>
      </div>

      {/* Modal Overlay */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>{t('kanban.addOrder')}</h2>
            <form onSubmit={handleCreateSubmit}>
              <div className="form-group">
                <label>{t('kanban.modal.client')}</label>
                <select 
                  required
                  value={formData.clientId}
                  onChange={(e) => setFormData({...formData, clientId: e.target.value})}
                  className="search-input"
                  style={{ width: '100%', paddingLeft: '12px' }}
                >
                  <option value="" disabled>{t('kanban.modal.selectClient')}</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id} style={{color: 'black'}}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>{t('kanban.modal.address')}</label>
                <input 
                  type="text" 
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>{t('kanban.modal.description')}</label>
                <input 
                  type="text" 
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>{t('kanban.modal.price')}</label>
                <input 
                  type="number" 
                  required
                  min="0"
                  step="0.01"
                  value={formData.totalPrice}
                  onChange={(e) => setFormData({...formData, totalPrice: e.target.value})}
                />
              </div>
              <div className="modal-actions">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="btn btn-ghost"
                >
                  {t('kanban.modal.cancel')}
                </button>
                <button type="submit" className="btn btn-primary">
                  {t('kanban.addOrder')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Kanban;
