import { useState, useEffect } from 'react';
import { Plus, MoreVertical } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getOrderStatuses, getOrders, moveOrder } from '../api/kanban';
import type { OrderStatus, Order } from '../api/kanban';
import '../styles/kanban.css';

const Kanban = () => {
  const { t } = useTranslation();
  const [columns, setColumns] = useState<OrderStatus[]>([]);
  const [cards, setCards] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statuses, orders] = await Promise.all([
          getOrderStatuses(),
          getOrders()
        ]);
        setColumns(statuses.sort((a, b) => a.sortOrder - b.sortOrder));
        setCards(orders);
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

  if (loading) {
    return <div style={{padding: 24}}>Loading board...</div>;
  }

  return (
    <div className="kanban-wrapper">
      <div className="kanban-header">
        <h1>{t('kanban.title')}</h1>
        <button className="btn btn-primary">
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
                  <div className="card-client">Client #{card.clientId}</div>
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
    </div>
  );
};

export default Kanban;
