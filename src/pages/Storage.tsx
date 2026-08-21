import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Search, Plus, Package, Wrench, Layers, Trash2 } from 'lucide-react';
import type { Material, MaterialType } from '../api/storage';
import { getMaterials, createMaterial, updateMaterial, deleteMaterial } from '../api/storage';
import { useAppStore } from '../store/useAppStore';
import '../styles/clients.css';

export const UNIT_OPTIONS = ['м²', 'м.пог', 'шт.'] as const;

export const Storage = () => {
  const { t } = useTranslation();
  const { fetchLowStockMaterials } = useAppStore();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'MATERIAL' | 'SERVICE'>('ALL');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<{
    name: string;
    type: MaterialType;
    unit: string;
    quantityInStock: string;
    costPrice: string;
    salePrice: string;
    minQuantity: string;
  }>({
    name: '',
    type: 'MATERIAL',
    unit: 'шт',
    quantityInStock: '0',
    costPrice: '',
    salePrice: '',
    minQuantity: '0'
  });

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

  const filteredMaterials = materials.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(search.toLowerCase());
    const mType = m.type || 'MATERIAL';
    const matchesType = filterType === 'ALL' || mType === filterType;
    return matchesSearch && matchesType;
  });

  const materialsCount = materials.filter(m => (m.type || 'MATERIAL') === 'MATERIAL').length;
  const servicesCount = materials.filter(m => m.type === 'SERVICE').length;

  const openAddModal = (defaultType: MaterialType = 'MATERIAL') => {
    setEditingId(null);
    setFormData({
      name: '',
      type: defaultType,
      unit: defaultType === 'SERVICE' ? 'шт.' : 'м²',
      quantityInStock: '0',
      costPrice: '',
      salePrice: '',
      minQuantity: '0'
    });
    setIsModalOpen(true);
  };

  const openEditModal = (material: Material) => {
    setEditingId(material.id);
    const mType = material.type || 'MATERIAL';
    setFormData({
      name: material.name,
      type: mType,
      unit: material.unit,
      quantityInStock: material.quantityInStock != null ? material.quantityInStock.toString() : '0',
      costPrice: material.costPrice != null ? material.costPrice.toString() : '0',
      salePrice: material.salePrice != null ? material.salePrice.toString() : (material.costPrice != null ? material.costPrice.toString() : '0'),
      minQuantity: material.minQuantity ? material.minQuantity.toString() : '0'
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const isService = formData.type === 'SERVICE';
      const cPrice = parseFloat(formData.costPrice || '0');
      const sPrice = parseFloat(formData.salePrice || formData.costPrice || '0');

      const payload = {
        name: formData.name.trim(),
        type: formData.type,
        unit: formData.unit.trim() || (isService ? 'усл.' : 'шт'),
        quantityInStock: isService ? 0 : parseFloat(formData.quantityInStock || '0'),
        minQuantity: isService ? 0 : parseFloat(formData.minQuantity || '0'),
        costPrice: cPrice,
        salePrice: sPrice
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

  const handleDeleteMaterial = async (id: number, name: string) => {
    if (!window.confirm(`Вы уверены, что хотите удалить позицию «${name}»?`)) return;
    try {
      await deleteMaterial(id);
      setMaterials(prev => prev.filter(m => m.id !== id));
      if (editingId === id) {
        setIsModalOpen(false);
      }
      fetchLowStockMaterials();
    } catch (err) {
      console.error(err);
      alert('Не удалось удалить позицию.');
    }
  };

  if (loading) {
    return <div className="p-8 text-white">Загрузка каталога...</div>;
  }

  return (
    <div className="clients-wrapper">
      {/* Header */}
      <div className="clients-header">
        <div>
          <h1 style={{ margin: 0, fontSize: '1.4rem' }}>{t('storage.title')}</h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Складской учет материалов, себестоимость, цены продажи клиенту и каталог услуг
          </p>
        </div>
        
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
          <button onClick={() => openAddModal('MATERIAL')} className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={18} />
            <span>Добавить позицию</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '16px',
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
        <button
          type="button"
          onClick={() => setFilterType('ALL')}
          className={`btn ${filterType === 'ALL' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ padding: '6px 14px', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <Layers size={15} />
          Все ({materials.length})
        </button>
        <button
          type="button"
          onClick={() => setFilterType('MATERIAL')}
          className={`btn ${filterType === 'MATERIAL' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ padding: '6px 14px', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <Package size={15} />
          Материалы ({materialsCount})
        </button>
        <button
          type="button"
          onClick={() => setFilterType('SERVICE')}
          className={`btn ${filterType === 'SERVICE' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ padding: '6px 14px', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <Wrench size={15} />
          Услуги и работы ({servicesCount})
        </button>
      </div>

      {/* Table */}
      <div className="clients-table-container glass-panel">
        <table className="clients-table">
          <thead>
            <tr>
              <th style={{ width: '110px' }}>Тип</th>
              <th>{t('storage.columns.name')}</th>
              <th style={{ width: '90px' }}>{t('storage.columns.unit')}</th>
              <th style={{ width: '100px' }}>В наличии</th>
              <th style={{ width: '100px' }}>Мин. остаток</th>
              <th style={{ textAlign: 'right', width: '130px' }}>Себестоимость</th>
              <th style={{ textAlign: 'right', width: '140px', color: 'var(--accent-primary)' }}>Цена продажи</th>
              <th style={{ width: '50px', textAlign: 'center' }}></th>
            </tr>
          </thead>
          <tbody>
            {filteredMaterials.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', opacity: 0.6, padding: '32px' }}>
                  {t('storage.noMaterials')}
                </td>
              </tr>
            ) : (
              filteredMaterials.map(material => {
                const isService = material.type === 'SERVICE';
                const isLowStock = !isService && material.quantityInStock <= (material.minQuantity || 0);
                const sPrice = material.salePrice != null && material.salePrice > 0 ? material.salePrice : material.costPrice;

                return (
                  <tr key={material.id} onClick={() => openEditModal(material)} style={{ cursor: 'pointer' }}>
                    <td>
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        padding: '3px 8px',
                        borderRadius: '6px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        background: isService ? 'rgba(168, 85, 247, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                        color: isService ? '#c084fc' : '#93c5fd',
                        border: isService ? '1px solid rgba(168, 85, 247, 0.3)' : '1px solid rgba(59, 130, 246, 0.3)'
                      }}>
                        {isService ? <Wrench size={12} /> : <Package size={12} />}
                        {isService ? 'Услуга' : 'Материал'}
                      </span>
                    </td>
                    <td>
                      <div className="client-name" style={{ fontWeight: 600 }}>{material.name}</div>
                    </td>
                    <td>
                      <div className="client-phone">{material.unit}</div>
                    </td>
                    <td>
                      {isService ? (
                        <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: '0.85rem' }}>— (услуга)</span>
                      ) : (
                        <span style={{
                          fontWeight: 600,
                          color: isLowStock ? '#f87171' : 'var(--text-primary)'
                        }}>
                          {material.quantityInStock}
                        </span>
                      )}
                    </td>
                    <td>
                      {isService ? (
                        <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: '0.85rem' }}>—</span>
                      ) : (
                        <div className="client-phone">{material.minQuantity || 0}</div>
                      )}
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>
                      {(material.costPrice || 0).toLocaleString('ru-RU')} ₽
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#4ade80' }}>
                      {(sPrice || 0).toLocaleString('ru-RU')} ₽
                    </td>
                    <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => handleDeleteMaterial(material.id, material.name)}
                        className="btn-icon"
                        style={{ color: 'var(--danger)', opacity: 0.75, padding: '6px' }}
                        title="Удалить позицию"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Overlay */}
      {isModalOpen && createPortal(
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '540px' }}>
            <div className="modal-header">
              <h2>{editingId ? 'Редактировать позицию' : 'Добавить материал или услугу'}</h2>
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
                {/* Type Selection */}
                <div className="form-group">
                  <label>Тип позиции *</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '4px' }}>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, type: 'MATERIAL' })}
                      style={{
                        padding: '10px',
                        borderRadius: 'var(--radius-sm)',
                        border: formData.type === 'MATERIAL' ? '2px solid var(--accent-primary)' : '1px solid var(--glass-border)',
                        background: formData.type === 'MATERIAL' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                        color: formData.type === 'MATERIAL' ? 'var(--text-primary)' : 'var(--text-secondary)',
                        fontWeight: formData.type === 'MATERIAL' ? 600 : 400,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      <Package size={16} />
                      Материал (склад)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, type: 'SERVICE' })}
                      style={{
                        padding: '10px',
                        borderRadius: 'var(--radius-sm)',
                        border: formData.type === 'SERVICE' ? '2px solid #a855f7' : '1px solid var(--glass-border)',
                        background: formData.type === 'SERVICE' ? 'rgba(168, 85, 247, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                        color: formData.type === 'SERVICE' ? 'var(--text-primary)' : 'var(--text-secondary)',
                        fontWeight: formData.type === 'SERVICE' ? 600 : 400,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      <Wrench size={16} />
                      Услуга (монтаж / работы)
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label>{formData.type === 'SERVICE' ? 'Название услуги (например: Установка светильников) *' : 'Наименование материала *'}</label>
                  <input 
                    type="text" 
                    required
                    placeholder={formData.type === 'SERVICE' ? 'Установка точечных светильников' : 'Полотно MSD Premium 3.2м'}
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label>Единица измерения *</label>
                    <select 
                      required
                      value={formData.unit || 'м²'}
                      onChange={(e) => setFormData({...formData, unit: e.target.value})}
                      className="search-input"
                      style={{ width: '100%', height: '42px', cursor: 'pointer', appearance: 'auto', padding: '0 10px' }}
                    >
                      <option value="м²">м²</option>
                      <option value="м.пог">м.пог</option>
                      <option value="шт.">шт.</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label style={{ color: '#4ade80', fontWeight: 600 }}>Цена продажи клиенту (₽) *</label>
                    <input 
                      type="number" 
                      required
                      min="0"
                      step="0.01"
                      placeholder="850"
                      value={formData.salePrice}
                      onChange={(e) => setFormData({...formData, salePrice: e.target.value})}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label>{formData.type === 'SERVICE' ? 'Себестоимость / прямые затраты (₽)' : 'Себестоимость закупки (₽) *'}</label>
                    <input 
                      type="number" 
                      required={formData.type === 'MATERIAL'}
                      min="0"
                      step="0.01"
                      placeholder="350"
                      value={formData.costPrice}
                      onChange={(e) => setFormData({...formData, costPrice: e.target.value})}
                    />
                  </div>
                  {formData.type === 'MATERIAL' ? (
                    <div className="form-group">
                      <label>Количество на складе</label>
                      <input 
                        type="number" 
                        min="0"
                        step="0.001"
                        value={formData.quantityInStock}
                        onChange={(e) => setFormData({...formData, quantityInStock: e.target.value})}
                      />
                    </div>
                  ) : (
                    <div className="form-group">
                      <label style={{ opacity: 0.5 }}>Складской учет</label>
                      <input 
                        type="text" 
                        disabled 
                        value="Не требуется для услуг" 
                        style={{ opacity: 0.5, cursor: 'not-allowed' }} 
                      />
                    </div>
                  )}
                </div>

                {formData.type === 'MATERIAL' && (
                  <div className="form-group">
                    <label>Мин. остаток (для оповещений о закупке)</label>
                    <input 
                      type="number" 
                      min="0"
                      step="0.001"
                      value={formData.minQuantity}
                      onChange={(e) => setFormData({...formData, minQuantity: e.target.value})}
                    />
                  </div>
                )}
              </div>
              <div className="modal-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {editingId ? (
                  <button 
                    type="button" 
                    onClick={() => handleDeleteMaterial(editingId, formData.name)}
                    className="btn btn-ghost"
                    style={{ color: 'var(--danger)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Trash2 size={16} /> Удалить позицию
                  </button>
                ) : <div />}
                <div className="modal-action-btns">
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
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
