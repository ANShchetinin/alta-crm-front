import { useState, useEffect } from 'react';
import { Plus, MoreVertical, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getOrderStatuses, getOrders, moveOrder, createOrder, updateOrder } from '../api/kanban';
import type { OrderStatus, Order, OrderMaterial } from '../api/kanban';
import { getClients } from '../api/clients';
import type { Client } from '../api/clients';
import { getMaterials } from '../api/storage';
import type { Material } from '../api/storage';
import '../styles/kanban.css';
import '../styles/clients.css'; // Reuse modal styles

const Kanban = () => {
  const { t } = useTranslation();
  const [columns, setColumns] = useState<OrderStatus[]>([]);
  const [cards, setCards] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<Client[]>([]);
  const [allMaterials, setAllMaterials] = useState<Material[]>([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    clientId: '',
    address: '',
    description: '',
    totalPrice: '',
    installationPrice: '',
    materials: [] as OrderMaterial[]
  });

  // State for read-only calculated values from backend when editing
  const [orderProfit, setOrderProfit] = useState<number | null>(null);
  const [orderMargin, setOrderMargin] = useState<number | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statuses, orders, clientsData, materialsData] = await Promise.all([
        getOrderStatuses(),
        getOrders(),
        getClients(),
        getMaterials()
      ]);
      setColumns(statuses.sort((a, b) => a.sortOrder - b.sortOrder));
      setCards(orders);
      setClients(clientsData);
      setAllMaterials(materialsData);
    } catch (error) {
      console.error("Failed to fetch kanban data", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, id: number) => {
    e.dataTransfer.setData('cardId', id.toString());
  };

  const handleDrop = async (e: React.DragEvent, statusId: number) => {
    const cardId = parseInt(e.dataTransfer.getData('cardId'));
    setCards(cards.map(c => c.id === cardId ? { ...c, statusId } : c));
    try {
      await moveOrder(cardId, statusId);
    } catch (err) {
      console.error("Failed to move order", err);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const openCreateModal = () => {
    setEditingOrderId(null);
    setFormData({
      clientId: '',
      address: '',
      description: '',
      totalPrice: '',
      installationPrice: '',
      materials: []
    });
    setOrderProfit(null);
    setOrderMargin(null);
    setIsModalOpen(true);
  };

  const openEditModal = (order: Order) => {
    setEditingOrderId(order.id);
    setFormData({
      clientId: order.clientId.toString(),
      address: order.address,
      description: order.description,
      totalPrice: order.totalPrice.toString(),
      installationPrice: order.installationPrice ? order.installationPrice.toString() : '0',
      materials: order.materials ? [...order.materials] : []
    });
    setOrderProfit(order.profit ?? null);
    setOrderMargin(order.profitMargin ?? null);
    setIsModalOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!columns.length) return;
    
    const payload = {
      clientId: parseInt(formData.clientId),
      statusId: editingOrderId ? cards.find(c => c.id === editingOrderId)?.statusId || columns[0].id : columns[0].id,
      address: formData.address,
      description: formData.description,
      totalPrice: parseFloat(formData.totalPrice || '0'),
      installationPrice: parseFloat(formData.installationPrice || '0'),
      materials: formData.materials.map(m => ({
        materialId: m.materialId,
        quantity: typeof m.quantity === 'string' ? parseFloat(m.quantity) : m.quantity
      }))
    };

    try {
      if (editingOrderId) {
        await updateOrder(editingOrderId, payload);
      } else {
        await createOrder(payload);
      }
      setIsModalOpen(false);
      fetchData(); // reload board to get new profit/margin calc
    } catch (err) {
      console.error("Failed to save order", err);
    }
  };

  const addMaterialRow = () => {
    if (allMaterials.length === 0) return;
    setFormData({
      ...formData,
      materials: [
        ...formData.materials, 
        { materialId: allMaterials[0].id, quantity: 1 }
      ]
    });
  };

  const updateMaterialRow = (index: number, field: string, value: string) => {
    const updated = [...formData.materials];
    if (field === 'materialId') updated[index].materialId = parseInt(value);
    if (field === 'quantity') updated[index].quantity = parseFloat(value) || 0;
    setFormData({ ...formData, materials: updated });
  };

  const removeMaterialRow = (index: number) => {
    const updated = formData.materials.filter((_, i) => i !== index);
    setFormData({ ...formData, materials: updated });
  };

  if (loading) {
    return <div style={{padding: 24}}>Loading board...</div>;
  }

  return (
    <div className="kanban-wrapper">
      <div className="kanban-header">
        <h1>{t('kanban.title')}</h1>
        <button className="btn btn-primary" onClick={openCreateModal}>
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
                  onClick={() => openEditModal(card)}
                >
                  <div className="card-client">
                    {clients.find(cl => cl.id === card.clientId)?.name || `Client #${card.clientId}`}
                  </div>
                  <div className="card-desc">{card.description}</div>
                  <div className="card-footer">
                    <span className="card-price">{card.totalPrice} ₽</span>
                    {card.profitMargin != null && card.profitMargin > 0 && (
                      <span style={{fontSize: '0.75rem', color: 'var(--success)'}}>+{card.profitMargin.toFixed(1)}%</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Modal Overlay */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto'}}>
            <h2>{editingOrderId ? 'Edit Order' : t('kanban.addOrder')}</h2>
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

              <hr style={{margin: '20px 0', border: 'none', borderTop: '1px solid var(--glass-border)'}} />
              
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px'}}>
                <h3 style={{margin: 0}}>{t('kanban.modal.materials')}</h3>
                <button type="button" onClick={addMaterialRow} className="btn btn-ghost" style={{padding: '4px 8px', fontSize: '0.85rem'}}>
                  <Plus size={14} /> {t('kanban.modal.addMaterial')}
                </button>
              </div>

              {formData.materials.map((mat, index) => (
                <div key={index} style={{display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'center'}}>
                  <select 
                    value={mat.materialId} 
                    onChange={(e) => updateMaterialRow(index, 'materialId', e.target.value)}
                    className="search-input"
                    style={{flex: 2, paddingLeft: '8px'}}
                  >
                    {allMaterials.map(m => (
                      <option key={m.id} value={m.id} style={{color: 'black'}}>{m.name} ({m.costPrice}₽)</option>
                    ))}
                  </select>
                  <input 
                    type="number" 
                    step="0.01" 
                    min="0"
                    value={mat.quantity} 
                    onChange={(e) => updateMaterialRow(index, 'quantity', e.target.value)}
                    style={{flex: 1}}
                    placeholder="Qty"
                  />
                  <button type="button" onClick={() => removeMaterialRow(index)} style={{background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer'}}>
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}

              <hr style={{margin: '20px 0', border: 'none', borderTop: '1px solid var(--glass-border)'}} />

              <div style={{display: 'flex', gap: '15px'}}>
                <div className="form-group" style={{flex: 1}}>
                  <label>{t('kanban.modal.installationPrice')}</label>
                  <input 
                    type="number" 
                    required
                    min="0"
                    step="0.01"
                    value={formData.installationPrice}
                    onChange={(e) => setFormData({...formData, installationPrice: e.target.value})}
                  />
                </div>
                <div className="form-group" style={{flex: 1}}>
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
              </div>

              {editingOrderId && orderProfit !== null && (
                <div style={{display: 'flex', gap: '15px', marginBottom: '20px', padding: '15px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px'}}>
                  <div style={{flex: 1}}>
                    <div style={{fontSize: '0.8rem', color: 'var(--text-secondary)'}}>{t('kanban.modal.profit')}</div>
                    <div style={{fontWeight: 600, color: orderProfit >= 0 ? 'var(--success)' : 'var(--danger)'}}>
                      {orderProfit} ₽
                    </div>
                  </div>
                  <div style={{flex: 1}}>
                    <div style={{fontSize: '0.8rem', color: 'var(--text-secondary)'}}>{t('kanban.modal.margin')}</div>
                    <div style={{fontWeight: 600, color: (orderMargin || 0) >= 0 ? 'var(--success)' : 'var(--danger)'}}>
                      {orderMargin}%
                    </div>
                  </div>
                </div>
              )}

              <div className="modal-actions" style={{marginTop: '20px'}}>
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="btn btn-ghost"
                >
                  {t('kanban.modal.cancel')}
                </button>
                <button type="submit" className="btn btn-primary">
                  {t('kanban.modal.save')}
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
