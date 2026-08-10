import { useState } from 'react';
import { Plus, MoreVertical } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import '../styles/kanban.css';

const getColumns = (t: any) => [
  { id: 1, title: t('kanban.col.new'), color: '#3b82f6' },
  { id: 2, title: t('kanban.col.progress'), color: '#f59e0b' },
  { id: 3, title: t('kanban.col.completed'), color: '#10b981' }
];

const MOCK_CARDS = [
  { id: 101, statusId: 1, client: 'ООО Ромашка', price: '150 000 ₽', desc: 'Установка 10 окон' },
  { id: 102, statusId: 1, client: 'Иван Петров', price: '25 000 ₽', desc: 'Остекление балкона' },
  { id: 103, statusId: 2, client: 'ЖК Светлый', price: '450 000 ₽', desc: 'Фасадные работы' },
];

const Kanban = () => {
  const { t } = useTranslation();
  const [cards, setCards] = useState(MOCK_CARDS);

  // Very basic mock drag and drop
  const handleDragStart = (e: React.DragEvent, id: number) => {
    e.dataTransfer.setData('cardId', id.toString());
  };

  const handleDrop = (e: React.DragEvent, statusId: number) => {
    const cardId = parseInt(e.dataTransfer.getData('cardId'));
    setCards(cards.map(c => c.id === cardId ? { ...c, statusId } : c));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div className="kanban-wrapper">
      <div className="kanban-header">
        <h1>{t('kanban.title')}</h1>
        <button className="btn btn-primary">
          <Plus size={18} /> {t('kanban.addOrder')}
        </button>
      </div>

      <div className="kanban-board">
        {getColumns(t).map(col => (
          <div 
            key={col.id} 
            className="kanban-column glass-panel"
            onDrop={(e) => handleDrop(e, col.id)}
            onDragOver={handleDragOver}
          >
            <div className="column-header">
              <div className="column-title">
                <span className="dot" style={{ backgroundColor: col.color }}></span>
                <h3>{col.title}</h3>
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
                  <div className="card-client">{card.client}</div>
                  <div className="card-desc">{card.desc}</div>
                  <div className="card-footer">
                    <span className="card-price">{card.price}</span>
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
