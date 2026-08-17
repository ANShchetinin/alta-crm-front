import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Search, Plus } from 'lucide-react';
import type { Material } from '../api/storage';
import { getMaterials, createMaterial, updateMaterial } from '../api/storage';
import { useAppStore } from '../store/useAppStore';
import '../styles/clients.css'; // Reusing the list/table/modal layout

export const Storage = () => {
  const { t } = useTranslation();
  const { fetchLowStockMaterials } = useAppStore();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: '', unit: '', quantityInStock: '', costPrice: '', minQuantity: '' });

  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const data = await getMaterials();
      setMaterials(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredMaterials = materials.filter(m => 
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  const openAddModal = () => {
    setEditingId(null);
    setFormData({ name: '', unit: '', quantityInStock: '', costPrice: '', minQuantity: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (material: Material) => {
    setEditingId(material.id);
    setFormData({
      name: material.name,
      unit: material.unit,
      quantityInStock: material.quantityInStock.toString(),
      costPrice: material.costPrice.toString(),
      minQuantity: material.minQuantity ? material.minQuantity.toString() : '0'
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: formData.name,
        unit: formData.unit,
        quantityInStock: parseFloat(formData.quantityInStock),
        minQuantity: parseFloat(formData.minQuantity || '0'),
        costPrice: parseFloat(formData.costPrice)
      };
      
      if (editingId) {
        await updateMaterial(editingId, payload);
      } else {
        await createMaterial(payload);
      }
      setIsModalOpen(false);
      fetchMaterials();
      fetchLowStockMaterials();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return <div className="p-8 text-white">Loading...</div>;
  }

  return (
    <div className="clients-wrapper">
      {/* Header */}
      <div className="clients-header">
        <h1>{t('storage.title')}</h1>
        
        <div className="clients-actions">
          <div className="search-input-wrapper">
            <Search className="search-icon" size={18} />
            <input 
              type="text" 
              placeholder={t('storage.search')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="search-input"
            />
          </div>
          <button onClick={openAddModal} className="btn btn-primary">
            <Plus size={18} />
            <span>{t('storage.addMaterial')}</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="clients-table-container glass-panel">
        <table className="clients-table">
          <thead>
            <tr>
              <th>{t('storage.columns.name')}</th>
              <th>{t('storage.columns.unit')}</th>
              <th>{t('storage.columns.quantity')}</th>
              <th>Мин. остаток</th>
              <th style={{textAlign: 'right'}}>{t('storage.columns.costPrice')}</th>
            </tr>
          </thead>
          <tbody>
            {filteredMaterials.length === 0 ? (
              <tr>
                <td colSpan={4} style={{textAlign: 'center', opacity: 0.5}}>
                  {t('storage.noMaterials')}
                </td>
              </tr>
            ) : (
              filteredMaterials.map(material => (
                <tr key={material.id} onClick={() => openEditModal(material)} style={{cursor: 'pointer'}}>
                  <td>
                    <div className="client-name">{material.name}</div>
                  </td>
                  <td>
                    <div className="client-phone">{material.unit}</div>
                  </td>
                  <td>
                    <div className="client-name">{material.quantityInStock}</div>
                  </td>
                  <td>
                    <div className="client-phone">{material.minQuantity || 0}</div>
                  </td>
                  <td style={{textAlign: 'right', fontWeight: 600, color: 'var(--success)'}}>
                    {material.costPrice} ₽
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Overlay */}
      {isModalOpen && createPortal(
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{editingId ? t('storage.modal.editTitle', 'Редактировать материал') : t('storage.modal.addTitle')}</h2>
              <button 
                type="button" 
                onClick={() => setIsModalOpen(false)}
                className="btn-icon"
                aria-label="Close"
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              <div className="modal-body">
                <div className="form-group">
                  <label>{t('storage.modal.name')}</label>
                  <input 
                    type="text" 
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>{t('storage.modal.unit')}</label>
                  <input 
                    type="text" 
                    required
                    placeholder="кг, шт, метры..."
                    value={formData.unit}
                    onChange={(e) => setFormData({...formData, unit: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>{t('storage.modal.quantity')}</label>
                  <input 
                    type="number" 
                    required
                    min="0"
                    step="0.001"
                    value={formData.quantityInStock}
                    onChange={(e) => setFormData({...formData, quantityInStock: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Минимальный остаток (для уведомлений)</label>
                  <input 
                    type="number" 
                    required
                    min="0"
                    step="0.001"
                    value={formData.minQuantity}
                    onChange={(e) => setFormData({...formData, minQuantity: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>{t('storage.modal.costPrice')}</label>
                  <input 
                    type="number" 
                    required
                    min="0"
                    step="0.01"
                    value={formData.costPrice}
                    onChange={(e) => setFormData({...formData, costPrice: e.target.value})}
                  />
                </div>
              </div>
              <div className="modal-actions">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="btn btn-ghost"
                >
                  {t('storage.modal.cancel')}
                </button>
                <button type="submit" className="btn btn-primary">
                  {t('storage.modal.save')}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
