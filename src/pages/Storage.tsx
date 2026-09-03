import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Search, Plus, Package, Wrench, Layers, Trash2, Check, Tag } from 'lucide-react';
import type { Material, MaterialType } from '../api/storage';
import { getMaterials, createMaterial, updateMaterial, deleteMaterial } from '../api/storage';
import { getEstimationServices, type EstimationService } from '../api/estimationServices';
import { useAppStore } from '../store/useAppStore';
import '../styles/clients.css';

export const Storage = () => {
  const { t } = useTranslation();
  const { fetchLowStockMaterials } = useAppStore();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [estimationServices, setEstimationServices] = useState<EstimationService[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'MATERIAL' | 'SERVICE'>('ALL');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<{
    name: string;
    type: MaterialType;
    category: string;
    unit: string;
    quantityInStock: string;
    costPrice: string;
    salePrice: string;
    minQuantity: string;
    globalServiceIds: number[];
    isDefault: boolean;
  }>({
    name: '',
    type: 'MATERIAL',
    category: 'Полотно',
    unit: 'шт',
    quantityInStock: '0',
    costPrice: '',
    salePrice: '',
    minQuantity: '0',
    globalServiceIds: [],
    isDefault: false
  });

  useEffect(() => {
    fetchMaterials();
    getEstimationServices()
      .then(setEstimationServices)
      .catch(err => console.error('Ошибка загрузки глобальных услуг:', err));
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
    const matchesSearch = m.name.toLowerCase().includes(search.toLowerCase()) || (m.category || '').toLowerCase().includes(search.toLowerCase());
    const mType = m.type || 'MATERIAL';
    const matchesType = filterType === 'ALL' || mType === filterType;
    return matchesSearch && matchesType;
  });

  const materialsCount = materials.filter(m => (m.type || 'MATERIAL') === 'MATERIAL').length;
  const servicesCount = materials.filter(m => m.type === 'SERVICE').length;

  const availableCategories = useMemo(() => {
    const fromMaterials = materials.map(m => m.category?.trim()).filter(Boolean) as string[];
    const fromSlots = estimationServices.flatMap(s => (s.slots || []).map(slot => slot.name?.trim())).filter(Boolean) as string[];
    const combined = Array.from(new Set([...fromMaterials, ...fromSlots]));
    return combined.sort((a, b) => a.localeCompare(b, 'ru'));
  }, [materials, estimationServices]);

  const openAddModal = (defaultType: MaterialType = 'MATERIAL') => {
    setEditingId(null);
    setFormData({
      name: '',
      type: defaultType,
      category: '',
      unit: defaultType === 'SERVICE' ? 'шт' : 'м²',
      quantityInStock: '0',
      costPrice: '',
      salePrice: '',
      minQuantity: '0',
      globalServiceIds: [],
      isDefault: false
    });
    setIsModalOpen(true);
  };

  const openEditModal = (material: Material) => {
    setEditingId(material.id);
    const mType = material.type || 'MATERIAL';
    setFormData({
      name: material.name,
      type: mType,
      category: material.category || (mType === 'SERVICE' ? 'Монтажные работы' : 'Полотно'),
      unit: material.unit === 'шт.' ? 'шт' : material.unit,
      quantityInStock: material.quantityInStock != null ? material.quantityInStock.toString() : '0',
      costPrice: material.costPrice != null ? material.costPrice.toString() : '0',
      salePrice: material.salePrice != null ? material.salePrice.toString() : (material.costPrice != null ? material.costPrice.toString() : '0'),
      minQuantity: material.minQuantity ? material.minQuantity.toString() : '0',
      globalServiceIds: material.globalServiceIds || [],
      isDefault: Boolean(material.isDefault)
    });
    setIsModalOpen(true);
  };

  const toggleGlobalService = (serviceId: number) => {
    setFormData(prev => {
      const exists = prev.globalServiceIds.includes(serviceId);
      const nextIds = exists
        ? prev.globalServiceIds.filter(id => id !== serviceId)
        : [...prev.globalServiceIds, serviceId];
      return { ...prev, globalServiceIds: nextIds };
    });
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
        category: formData.category.trim() || undefined,
        unit: formData.unit.trim() || (isService ? 'усл.' : 'шт'),
        quantityInStock: isService ? 0 : parseFloat(formData.quantityInStock || '0'),
        minQuantity: isService ? 0 : parseFloat(formData.minQuantity || '0'),
        costPrice: cPrice,
        salePrice: sPrice,
        globalServiceIds: formData.globalServiceIds,
        isDefault: formData.isDefault
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
            Управление материалами на складе и прайс-листом услуг для калькулятора замера
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            type="button" 
            onClick={() => openAddModal('SERVICE')}
            className="btn btn-ghost"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', border: '1px solid rgba(168, 85, 247, 0.4)', color: '#c084fc' }}
          >
            <Plus size={16} /> + Добавить услугу
          </button>
          <button 
            type="button" 
            onClick={() => openAddModal('MATERIAL')}
            className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={16} /> + Добавить материал
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', margin: '20px 0 16px 0' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setFilterType('ALL')}
            className="btn btn-ghost"
            style={{
              padding: '6px 14px',
              fontSize: '0.85rem',
              borderRadius: 'var(--radius-sm)',
              background: filterType === 'ALL' ? 'var(--accent-primary)' : 'rgba(255,255,255,0.03)',
              color: filterType === 'ALL' ? '#ffffff' : 'var(--text-secondary)',
              border: '1px solid ' + (filterType === 'ALL' ? 'var(--accent-primary)' : 'var(--glass-border)')
            }}
          >
            Все позиции ({materials.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('MATERIAL')}
            className="btn btn-ghost"
            style={{
              padding: '6px 14px',
              fontSize: '0.85rem',
              borderRadius: 'var(--radius-sm)',
              background: filterType === 'MATERIAL' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.03)',
              color: filterType === 'MATERIAL' ? '#60a5fa' : 'var(--text-secondary)',
              border: '1px solid ' + (filterType === 'MATERIAL' ? 'rgba(59, 130, 246, 0.4)' : 'var(--glass-border)'),
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Package size={15} /> Материалы ({materialsCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('SERVICE')}
            className="btn btn-ghost"
            style={{
              padding: '6px 14px',
              fontSize: '0.85rem',
              borderRadius: 'var(--radius-sm)',
              background: filterType === 'SERVICE' ? 'rgba(168, 85, 247, 0.2)' : 'rgba(255,255,255,0.03)',
              color: filterType === 'SERVICE' ? '#c084fc' : 'var(--text-secondary)',
              border: '1px solid ' + (filterType === 'SERVICE' ? 'rgba(168, 85, 247, 0.4)' : 'var(--glass-border)'),
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Wrench size={15} /> Услуги ({servicesCount})
          </button>
        </div>

        <div className="search-box" style={{ width: '280px' }}>
          <Search size={16} className="search-icon" />
          <input 
            type="text" 
            placeholder="Поиск по названию или типу..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      {/* Table */}
      <div className="table-responsive glass-panel" style={{ borderRadius: 'var(--radius-lg)', overflowX: 'auto', overflowY: 'auto', maxHeight: 'calc(100vh - 220px)', width: '100%' }}>
        <table className="clients-table" style={{ width: '100%', minWidth: '850px' }}>
          <thead>
            <tr>
              <th style={{ width: '40px' }}>#</th>
              <th>Наименование</th>
              <th>Тип / Категория</th>
              <th style={{ width: '90px' }}>Ед. изм.</th>
              <th style={{ width: '130px', textAlign: 'right' }}>Остаток на складе</th>
              <th style={{ width: '130px', textAlign: 'right' }}>Себестоимость</th>
              <th style={{ width: '140px', textAlign: 'right' }}>Цена продажи</th>
              <th style={{ width: '60px', textAlign: 'center' }}></th>
            </tr>
          </thead>
          <tbody>
            {filteredMaterials.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                  Позиции не найдены
                </td>
              </tr>
            ) : (
              filteredMaterials.map((material, idx) => {
                const isService = material.type === 'SERVICE';
                const isLow = !isService && material.quantityInStock <= (material.minQuantity || 0);
                const sPrice = material.salePrice != null ? material.salePrice : material.costPrice;

                return (
                  <tr 
                    key={material.id}
                    onClick={() => openEditModal(material)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td style={{ color: 'var(--text-secondary)' }}>{idx + 1}</td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {isService ? (
                          <span style={{ color: '#c084fc', display: 'flex', alignItems: 'center' }} title="Услуга / Монтаж">
                            <Wrench size={15} />
                          </span>
                        ) : (
                          <span style={{ color: '#60a5fa', display: 'flex', alignItems: 'center' }} title="Материал со склада">
                            <Package size={15} />
                          </span>
                        )}
                        <span>{material.name}</span>
                        {material.isDefault && (
                          <span style={{ fontSize: '0.68rem', padding: '1px 6px', borderRadius: '4px', background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80', fontWeight: 600 }}>
                            По умолчанию
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      {material.category ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '0.76rem',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid var(--glass-border)',
                          color: 'var(--text-secondary)'
                        }}>
                          <Tag size={12} style={{ opacity: 0.7 }} />
                          {material.category}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontStyle: 'italic' }}>
                          {isService ? 'Услуга' : 'Материал'}
                        </span>
                      )}
                    </td>
                    <td>
                      <span style={{ 
                        display: 'inline-block', 
                        padding: '2px 6px', 
                        borderRadius: '4px', 
                        background: 'rgba(255,255,255,0.05)', 
                        fontSize: '0.8rem' 
                      }}>
                        {material.unit}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {isService ? (
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>—</span>
                      ) : (
                        <span style={{ 
                          fontWeight: 600, 
                          color: isLow ? 'var(--danger)' : 'var(--text-primary)',
                          background: isLow ? 'rgba(239, 68, 68, 0.15)' : 'transparent',
                          padding: isLow ? '2px 6px' : '0',
                          borderRadius: '4px'
                        }}>
                          {material.quantityInStock} {material.unit}
                        </span>
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
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '560px' }}>
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
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Type Selection */}
                <div className="form-group" style={{ marginBottom: 0 }}>
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

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>{formData.type === 'SERVICE' ? 'Название услуги *' : 'Наименование материала *'}</label>
                  <input 
                    type="text" 
                    required
                    placeholder={formData.type === 'SERVICE' ? 'Установка точечного светильника' : 'Полотно MSD Premium 3.2м (Мат)'}
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>

                {/* Категория / Тип для группировки в калькуляторе */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Категория / Тип позиции в смете</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Для взаимозаменяемости в смете</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Например: Полотно, Профиль, Светильник..."
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  />
                  {availableCategories.length > 0 && (
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                      {availableCategories.map(cat => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setFormData({ ...formData, category: cat })}
                          style={{
                            fontSize: '0.74rem',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            background: formData.category === cat ? 'rgba(59, 130, 246, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                            border: '1px solid ' + (formData.category === cat ? 'var(--accent-primary)' : 'var(--glass-border)'),
                            color: formData.category === cat ? 'var(--accent-primary)' : 'var(--text-secondary)',
                            cursor: 'pointer'
                          }}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Привязка к разделу сметного калькулятора */}
                {estimationServices.length > 0 && (
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Layers size={15} style={{ color: 'var(--accent-primary)' }} />
                      Привязать к разделу сметного калькулятора
                    </label>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                      {estimationServices.map(svc => {
                        const isSelected = formData.globalServiceIds.includes(svc.id!);
                        return (
                          <button
                            key={svc.id}
                            type="button"
                            onClick={() => toggleGlobalService(svc.id!)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '6px 12px',
                              borderRadius: 'var(--radius-sm)',
                              background: isSelected ? 'linear-gradient(135deg, #3b82f6, #6366f1)' : 'rgba(255, 255, 255, 0.04)',
                              color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                              border: '1px solid ' + (isSelected ? '#3b82f6' : 'var(--glass-border)'),
                              cursor: 'pointer',
                              fontSize: '0.84rem',
                              fontWeight: isSelected ? 600 : 400
                            }}
                          >
                            {isSelected && <Check size={14} />}
                            {svc.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Чекбокс позиции по умолчанию */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-sm)' }}>
                  <input
                    type="checkbox"
                    id="isDefaultCheckbox"
                    checked={formData.isDefault}
                    onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <label htmlFor="isDefaultCheckbox" style={{ margin: 0, fontSize: '0.86rem', color: 'var(--text-primary)', cursor: 'pointer' }}>
                    Выбирать по умолчанию в смете (для своего типа при включении услуги)
                  </label>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
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
                      <option value="шт">шт</option>
                      <option value="компл.">компл.</option>
                      <option value="усл.">усл.</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
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
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>{formData.type === 'SERVICE' ? 'Себестоимость / затраты (₽)' : 'Себестоимость закупки (₽) *'}</label>
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
                    <div className="form-group" style={{ marginBottom: 0 }}>
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
                    <div className="form-group" style={{ marginBottom: 0 }}>
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
                  <div className="form-group" style={{ marginBottom: 0 }}>
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
              <div className="modal-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
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
