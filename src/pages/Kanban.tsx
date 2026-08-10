import { useState, useEffect } from 'react';
import { Plus, MoreVertical, Trash2, ChevronDown, Paperclip, Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getOrderStatuses, getOrders, moveOrder, createOrder, updateOrder, uploadAttachment, getAttachmentUrl, deleteOrder } from '../api/kanban';
import type { OrderStatus, Order, OrderMaterial, OrderAttachment } from '../api/kanban';
import { getClients } from '../api/clients';
import type { Client } from '../api/clients';
import { getMaterials } from '../api/storage';
import type { Material } from '../api/storage';
import '../styles/kanban.css';
import '../styles/clients.css'; 

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
    materials: [] as OrderMaterial[],
    attachments: [] as OrderAttachment[]
  });

  const [orderProfit, setOrderProfit] = useState<number | null>(null);
  const [orderMargin, setOrderMargin] = useState<number | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);

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
      materials: [],
      attachments: []
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
      materials: order.materials ? [...order.materials] : [],
      attachments: order.attachments ? [...order.attachments] : []
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
      fetchData(); 
    } catch (err) {
      console.error("Failed to save order", err);
    }
  };

  const handleDeleteOrder = async () => {
    if (!editingOrderId) return;
    if (window.confirm("Are you sure you want to delete this order?")) {
      try {
        await deleteOrder(editingOrderId);
        setIsModalOpen(false);
        fetchData();
      } catch (err) {
        console.error("Failed to delete order", err);
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingOrderId) return;

    setUploadingFile(true);
    try {
      const newAttachment = await uploadAttachment(editingOrderId, file);
      setFormData(prev => ({
        ...prev,
        attachments: [...prev.attachments, newAttachment]
      }));
      // Optional: refresh cards immediately so the board state matches
      fetchData();
    } catch (err) {
      console.error("Failed to upload file", err);
    } finally {
      setUploadingFile(false);
      // Reset input
      e.target.value = '';
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
                    <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
                      {card.attachments && card.attachments.length > 0 && (
                        <div style={{display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--text-secondary)'}}>
                          <Paperclip size={12} /> {card.attachments.length}
                        </div>
                      )}
                      {card.profitMargin != null && card.profitMargin > 0 && (
                        <span style={{fontSize: '0.75rem', color: 'var(--success)'}}>+{card.profitMargin.toFixed(1)}%</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{maxWidth: '650px', maxHeight: '90vh', overflowY: 'auto'}}>
            <h2>{editingOrderId ? 'Edit Order' : t('kanban.addOrder')}</h2>
            <form onSubmit={handleCreateSubmit}>
              
              <div className="form-group">
                <label>{t('kanban.modal.client')}</label>
                <div className="custom-select-wrapper">
                  <select 
                    required
                    value={formData.clientId}
                    onChange={(e) => setFormData({...formData, clientId: e.target.value})}
                    className="custom-select"
                  >
                    <option value="" disabled>{t('kanban.modal.selectClient')}</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="custom-select-icon" size={16} />
                </div>
              </div>

              <div className="form-group">
                <label>{t('kanban.modal.address')}</label>
                <input 
                  type="text" 
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  className="search-input"
                  style={{width: '100%', paddingLeft: '12px'}}
                />
              </div>

              <div className="form-group">
                <label>{t('kanban.modal.description')}</label>
                <input 
                  type="text" 
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="search-input"
                  style={{width: '100%', paddingLeft: '12px'}}
                />
              </div>

              <hr style={{margin: '24px 0', border: 'none', borderTop: '1px solid var(--glass-border)'}} />
              
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px'}}>
                <h3 style={{margin: 0, fontSize: '1.1rem'}}>{t('kanban.modal.materials')}</h3>
                <button type="button" onClick={addMaterialRow} className="btn btn-ghost" style={{padding: '6px 12px', fontSize: '0.85rem'}}>
                  <Plus size={14} style={{marginRight: '4px'}} /> {t('kanban.modal.addMaterial')}
                </button>
              </div>

              {formData.materials.map((mat, index) => (
                <div key={index} style={{display: 'flex', gap: '12px', marginBottom: '12px', alignItems: 'center'}}>
                  <div className="custom-select-wrapper" style={{flex: 2}}>
                    <select 
                      value={mat.materialId} 
                      onChange={(e) => updateMaterialRow(index, 'materialId', e.target.value)}
                      className="custom-select"
                    >
                      {allMaterials.map(m => (
                        <option key={m.id} value={m.id}>{m.name} ({m.costPrice}₽)</option>
                      ))}
                    </select>
                    <ChevronDown className="custom-select-icon" size={16} />
                  </div>
                  <input 
                    type="number" 
                    step="0.01" 
                    min="0"
                    value={mat.quantity} 
                    onChange={(e) => updateMaterialRow(index, 'quantity', e.target.value)}
                    style={{flex: 1}}
                    placeholder="Qty"
                    className="custom-number-input"
                  />
                  <button type="button" onClick={() => removeMaterialRow(index)} style={{background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '8px'}}>
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}

              <hr style={{margin: '24px 0', border: 'none', borderTop: '1px solid var(--glass-border)'}} />

              {/* Attachments Section - Only available when editing an existing order */}
              {editingOrderId && (
                <div style={{marginBottom: '24px'}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px'}}>
                    <h3 style={{margin: 0, fontSize: '1.1rem'}}>{t('kanban.modal.attachments')}</h3>
                    <label className="file-upload-btn">
                      <Paperclip size={14} />
                      {uploadingFile ? t('kanban.modal.uploading') : t('kanban.modal.attachFile')}
                      <input type="file" onChange={handleFileUpload} disabled={uploadingFile} />
                    </label>
                  </div>
                  
                  {formData.attachments.length > 0 ? (
                    <div className="attachments-list">
                      {formData.attachments.map(att => (
                        <div key={att.id} className="attachment-item">
                          <span style={{fontSize: '0.9rem'}}>{att.fileName}</span>
                          <a href={getAttachmentUrl(att.id)} target="_blank" rel="noreferrer" download style={{display: 'flex', alignItems: 'center', gap: '4px'}}>
                            <Download size={14} /> {t('kanban.modal.download')}
                          </a>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic'}}>
                      {t('kanban.modal.noAttachments')}
                    </div>
                  )}
                  <hr style={{margin: '24px 0', border: 'none', borderTop: '1px solid var(--glass-border)'}} />
                </div>
              )}

              <div style={{display: 'flex', gap: '16px'}}>
                <div className="form-group" style={{flex: 1}}>
                  <label>{t('kanban.modal.installationPrice')}</label>
                  <input 
                    type="number" 
                    required
                    min="0"
                    step="0.01"
                    value={formData.installationPrice}
                    onChange={(e) => setFormData({...formData, installationPrice: e.target.value})}
                    className="custom-number-input"
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
                    className="custom-number-input"
                  />
                </div>
              </div>

              {editingOrderId && orderProfit !== null && (
                <div style={{display: 'flex', gap: '16px', marginTop: '12px', marginBottom: '24px', padding: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-lg)'}}>
                  <div style={{flex: 1}}>
                    <div style={{fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px'}}>{t('kanban.modal.profit')}</div>
                    <div style={{fontWeight: 600, fontSize: '1.2rem', color: orderProfit >= 0 ? 'var(--success)' : 'var(--danger)'}}>
                      {orderProfit} ₽
                    </div>
                  </div>
                  <div style={{flex: 1}}>
                    <div style={{fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px'}}>{t('kanban.modal.margin')}</div>
                    <div style={{fontWeight: 600, fontSize: '1.2rem', color: (orderMargin || 0) >= 0 ? 'var(--success)' : 'var(--danger)'}}>
                      {orderMargin}%
                    </div>
                  </div>
                </div>
              )}

              <div className="modal-actions" style={{marginTop: '32px', display: 'flex', justifyContent: 'space-between'}}>
                {editingOrderId ? (
                  <button 
                    type="button" 
                    onClick={handleDeleteOrder}
                    className="btn btn-ghost"
                    style={{color: 'var(--danger)'}}
                  >
                    <Trash2 size={16} style={{marginRight: '6px'}} /> {t('kanban.modal.delete')}
                  </button>
                ) : <div></div>}
                <div style={{display: 'flex', gap: '12px'}}>
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
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Kanban;
