import React, { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  Save,
  Layers,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Tag,
  CheckCircle2,
  Sliders,
  RefreshCw
} from 'lucide-react';
import type { Material } from '../api/storage';
import {
  getEstimationServices,
  createEstimationService,
  updateEstimationService,
  deleteEstimationService,
  initDefaultEstimationServices,
  type EstimationService,
  type EstimationServiceSlot,
  type EstimationServiceSaveRequest,
  type SlotType,
  type CalculationBasis
} from '../api/estimationServices';
import { SearchSelect } from './SearchSelect';

interface Props {
  materials: Material[];
}

export const EstimationServiceBuilder: React.FC<Props> = ({ materials }) => {
  const [services, setServices] = useState<EstimationService[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [expandedServiceId, setExpandedServiceId] = useState<number | null>(null);

  // Модалка создания/редактирования услуги
  const [editingService, setEditingService] = useState<EstimationService | null>(null);

  const loadServices = async () => {
    setLoading(true);
    try {
      const data = await getEstimationServices();
      setServices(data);
      if (data.length > 0 && expandedServiceId === null) {
        setExpandedServiceId(data[0].id || null);
      }
    } catch (err) {
      console.error('Ошибка загрузки сметных услуг:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServices();
  }, []);

  const handleInitDefaults = async () => {
    if (!confirm('Инициализировать стандартный набор сметных услуг (Потолки, Освещение, Карнизы)?')) return;
    setLoading(true);
    try {
      const res = await initDefaultEstimationServices();
      setServices(res);
      if (res.length > 0) setExpandedServiceId(res[0].id || null);
    } catch (e) {
      console.error(e);
      alert('Ошибка при инициализации шаблонов');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNewService = () => {
    const newSvc: EstimationService = {
      name: 'Новая услуга',
      description: 'Описание услуги',
      icon: 'Layers',
      sortOrder: services.length + 1,
      isActive: true,
      slots: [
        {
          name: 'Основной материал',
          slotType: 'DROPDOWN',
          calculationBasis: 'AREA',
          wasteCoefficient: 1.0,
          isRequired: true,
          materials: []
        }
      ]
    };
    setEditingService(newSvc);
  };

  const handleEditService = (s: EstimationService) => {
    setEditingService(JSON.parse(JSON.stringify(s)));
  };

  const handleDeleteService = async (id?: number) => {
    if (!id) return;
    if (!confirm('Вы уверены, что хотите удалить эту услугу и все ее слоты?')) return;
    try {
      await deleteEstimationService(id);
      setServices(prev => prev.filter(s => s.id !== id));
      if (expandedServiceId === id) setExpandedServiceId(null);
    } catch (e) {
      console.error(e);
      alert('Ошибка при удалении услуги');
    }
  };

  const handleSaveEditingService = async () => {
    if (!editingService) return;
    if (!editingService.name.trim()) {
      alert('Укажите название услуги');
      return;
    }

    setSaving(true);
    try {
      const req: EstimationServiceSaveRequest = {
        name: editingService.name,
        description: editingService.description,
        icon: editingService.icon || 'Layers',
        sortOrder: editingService.sortOrder || 0,
        isActive: editingService.isActive,
        slots: editingService.slots.map((sl, sIdx) => ({
          id: sl.id,
          name: sl.name,
          slotType: sl.slotType,
          calculationBasis: sl.calculationBasis,
          wasteCoefficient: sl.wasteCoefficient || 1.0,
          sortOrder: sIdx,
          isRequired: sl.isRequired,
          materials: sl.materials.map((m, mIdx) => ({
            materialId: m.materialId,
            isDefault: m.isDefault || false,
            sortOrder: mIdx
          }))
        }))
      };

      if (editingService.id) {
        await updateEstimationService(editingService.id, req);
      } else {
        await createEstimationService(req);
      }

      await loadServices();
      setEditingService(null);
    } catch (err: any) {
      console.error('Ошибка сохранения услуги:', err);
      alert('Ошибка при сохранении: ' + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  // Хелперы редактирования слотов внутри editingService
  const addSlotToEditing = () => {
    if (!editingService) return;
    const newSlot: EstimationServiceSlot = {
      name: `Группа ${editingService.slots.length + 1}`,
      slotType: 'DROPDOWN',
      calculationBasis: 'AREA',
      wasteCoefficient: 1.0,
      isRequired: true,
      materials: []
    };
    setEditingService({
      ...editingService,
      slots: [...editingService.slots, newSlot]
    });
  };

  const updateSlot = (slotIdx: number, patch: Partial<EstimationServiceSlot>) => {
    if (!editingService) return;
    const slots = [...editingService.slots];
    slots[slotIdx] = { ...slots[slotIdx], ...patch };
    setEditingService({ ...editingService, slots });
  };

  const removeSlot = (slotIdx: number) => {
    if (!editingService) return;
    setEditingService({
      ...editingService,
      slots: editingService.slots.filter((_, i) => i !== slotIdx)
    });
  };

  const addMaterialToSlot = (slotIdx: number, matId: number) => {
    if (!editingService || !matId) return;
    const mat = materials.find(m => m.id === matId);
    if (!mat) return;

    const slots = [...editingService.slots];
    const slot = { ...slots[slotIdx] };
    if (slot.materials.some(m => m.materialId === matId)) return;

    slot.materials = [
      ...slot.materials,
      {
        materialId: mat.id,
        materialName: mat.name,
        unit: mat.unit,
        type: mat.type || 'MATERIAL',
        costPrice: mat.costPrice || 0,
        salePrice: mat.salePrice || 0,
        quantityInStock: mat.quantityInStock || 0,
        isDefault: slot.materials.length === 0,
        sortOrder: slot.materials.length
      }
    ];
    slots[slotIdx] = slot;
    setEditingService({ ...editingService, slots });
  };

  const removeMaterialFromSlot = (slotIdx: number, matId: number) => {
    if (!editingService) return;
    const slots = [...editingService.slots];
    const slot = { ...slots[slotIdx] };
    slot.materials = slot.materials.filter(m => m.materialId !== matId);
    slots[slotIdx] = slot;
    setEditingService({ ...editingService, slots });
  };

  const setDefaultMaterialInSlot = (slotIdx: number, matId: number) => {
    if (!editingService) return;
    const slots = [...editingService.slots];
    const slot = { ...slots[slotIdx] };
    slot.materials = slot.materials.map(m => ({
      ...m,
      isDefault: m.materialId === matId
    }));
    slots[slotIdx] = slot;
    setEditingService({ ...editingService, slots });
  };

  const materialOptions = materials.map(m => ({
    value: m.id,
    label: m.name,
    price: m.salePrice,
    unit: m.unit,
    stock: m.quantityInStock,
    subLabel: m.type === 'SERVICE' ? 'Услуга' : 'Товар'
  }));

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Загрузка конфигуратора сметных услуг...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Шапка раздела */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
        background: 'var(--card-bg, rgba(255, 255, 255, 0.02))',
        padding: '16px 20px',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--glass-border)'
      }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sliders size={20} style={{ color: 'var(--accent-primary)' }} />
            Конструктор пакетов работ и правил расчета сметы
          </h3>
          <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Настройте пакеты работ, группы выбора материалов и привяжите номенклатуру склада. 0% хардкода.
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {services.length === 0 && (
            <button
              type="button"
              onClick={handleInitDefaults}
              className="btn btn-ghost"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.84rem' }}
            >
              <RefreshCw size={14} /> Заполнить базовые пакеты
            </button>
          )}
          <button
            type="button"
            onClick={handleCreateNewService}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, fontSize: '0.88rem' }}
          >
            <Plus size={16} /> + Добавить пакет работ
          </button>
        </div>
      </div>

      {/* Список пакетов работ */}
      {services.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '48px 20px',
          background: 'var(--card-bg, rgba(255, 255, 255, 0.02))',
          borderRadius: 'var(--radius-lg)',
          border: '1px dashed var(--glass-border)',
          color: 'var(--text-secondary)'
        }}>
          <Layers size={40} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
          <div style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Пакеты работ еще не созданы
          </div>
          <div style={{ fontSize: '0.86rem', marginTop: '6px', maxWidth: '500px', margin: '6px auto 16px' }}>
            Нажмите кнопку «Заполнить базовые пакеты» для быстрой загрузки стандартных наборов монтажа или создайте свои уникальные пакеты.
          </div>
          <button
            type="button"
            onClick={handleInitDefaults}
            className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Sparkles size={16} /> Заполнить стандартный набор
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {services.map(svc => {
            const isExpanded = expandedServiceId === svc.id;
            return (
              <div
                key={svc.id}
                style={{
                  background: 'var(--card-bg, rgba(255, 255, 255, 0.025))',
                  border: '1px solid ' + (isExpanded ? 'var(--accent-primary)' : 'var(--glass-border)'),
                  borderRadius: 'var(--radius-md)',
                  overflow: 'hidden',
                  transition: 'all 0.15s ease',
                  boxShadow: 'var(--glass-shadow)'
                }}
              >
                {/* Карточка-заголовок услуги */}
                <div
                  style={{
                    padding: '14px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    background: isExpanded ? 'rgba(59, 130, 246, 0.08)' : 'transparent',
                    userSelect: 'none'
                  }}
                  onClick={() => setExpandedServiceId(isExpanded ? null : (svc.id || null))}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      background: 'rgba(59, 130, 246, 0.15)',
                      color: 'var(--accent-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Layers size={18} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.98rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>{svc.name}</span>
                        {!svc.isActive && (
                          <span style={{ fontSize: '0.7rem', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', padding: '2px 6px', borderRadius: '4px' }}>
                            Отключена
                          </span>
                        )}
                      </div>
                      {svc.description && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {svc.description}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }} onClick={e => e.stopPropagation()}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', background: 'var(--chip-bg, rgba(255, 255, 255, 0.05))', padding: '4px 8px', borderRadius: '6px' }}>
                      Позиций в смете: {svc.slots.length}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleEditService(svc)}
                      className="btn btn-ghost"
                      style={{ padding: '6px 12px', fontSize: '0.82rem', fontWeight: 500 }}
                    >
                      Настроить
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteService(svc.id)}
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '6px', opacity: 0.8 }}
                      title="Удалить услугу"
                    >
                      <Trash2 size={16} />
                    </button>

                    <div style={{ color: 'var(--text-secondary)', cursor: 'pointer' }} onClick={() => setExpandedServiceId(isExpanded ? null : (svc.id || null))}>
                      {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </div>
                  </div>
                </div>

                {/* Раскрытый список групп/слотов */}
                {isExpanded && (
                  <div style={{ padding: '16px 18px', borderTop: '1px solid var(--glass-border)', background: 'var(--row-hover-bg, rgba(0, 0, 0, 0.05))' }}>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
                      Материал / Услуга, добавляемые в смету автоматически:
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                      {svc.slots.map((slot, sIdx) => (
                        <div
                          key={slot.id || sIdx}
                          style={{
                            background: 'var(--card-bg, rgba(255, 255, 255, 0.03))',
                            border: '1px solid var(--glass-border)',
                            borderRadius: '8px',
                            padding: '12px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                              {slot.name}
                            </span>
                            <span style={{ fontSize: '0.72rem', color: 'var(--accent-primary)', background: 'rgba(59, 130, 246, 0.12)', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                              Единица расчета: {slot.calculationBasis} {slot.wasteCoefficient > 1 ? `(×${slot.wasteCoefficient})` : ''}
                            </span>
                          </div>

                          <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                            Тип: {slot.slotType === 'DROPDOWN' ? 'Выбор из списка' : slot.slotType === 'AUTO_INCLUDE' ? 'Авто-включение' : 'Опционально'}
                          </div>

                          {/* Теги привязанных материалов */}
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                            {slot.materials.length === 0 ? (
                              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                                Нет привязанных материалов со склада
                              </span>
                            ) : (
                              slot.materials.map(m => (
                                <span
                                  key={m.materialId}
                                  style={{
                                    fontSize: '0.76rem',
                                    padding: '3px 8px',
                                    borderRadius: '6px',
                                    background: m.isDefault ? 'rgba(34, 197, 94, 0.15)' : 'var(--chip-bg, rgba(255, 255, 255, 0.06))',
                                    border: m.isDefault ? '1px solid rgba(34, 197, 94, 0.4)' : '1px solid var(--glass-border)',
                                    color: m.isDefault ? '#16a34a' : 'var(--text-primary)',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontWeight: m.isDefault ? 600 : 400
                                  }}
                                >
                                  {m.isDefault && <CheckCircle2 size={11} />}
                                  {m.materialName} ({m.salePrice} ₽/{m.unit})
                                </span>
                              ))
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Модальное окно редактирования/создания глобальной услуги */}
      {editingService && (
        <div
          className="modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            zIndex: 10010
          }}
        >
          <div
            style={{
              background: 'var(--modal-bg, var(--card-bg, #1e293b))',
              border: '1px solid var(--glass-border)',
              borderRadius: 'var(--radius-lg)',
              maxWidth: '850px',
              width: '100%',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
              overflow: 'hidden'
            }}
          >
            {/* Header */}
            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers size={20} style={{ color: 'var(--accent-primary)' }} />
                {editingService.id ? `Редактирование пакета: ${editingService.name}` : 'Создание нового пакета работ'}
              </h3>
              <button
                type="button"
                onClick={() => setEditingService(null)}
                className="btn-icon"
                style={{ fontSize: '1.2rem', padding: '4px' }}
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Основные параметры услуги */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Название пакета работ</label>
                  <input
                    type="text"
                    value={editingService.name}
                    onChange={e => setEditingService({ ...editingService, name: e.target.value })}
                    placeholder="Например: Монтаж натяжного потолка"
                    style={{
                      width: '100%',
                      height: '38px',
                      background: 'var(--input-bg)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-primary)',
                      padding: '0 12px',
                      fontSize: '0.9rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Статус активности</label>
                  <select
                    value={editingService.isActive ? 'true' : 'false'}
                    onChange={e => setEditingService({ ...editingService, isActive: e.target.value === 'true' })}
                    style={{
                      width: '100%',
                      height: '38px',
                      background: 'var(--input-bg)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-primary)',
                      padding: '0 12px',
                      fontSize: '0.88rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="true" style={{ background: 'var(--dropdown-bg, #1e293b)', color: 'var(--text-primary)' }}>Активна (отображать в замере)</option>
                    <option value="false" style={{ background: 'var(--dropdown-bg, #1e293b)', color: 'var(--text-primary)' }}>Отключена</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Краткое описание / назначение</label>
                <input
                  type="text"
                  value={editingService.description || ''}
                  onChange={e => setEditingService({ ...editingService, description: e.target.value })}
                  placeholder="Например: Основной конструктив полотна, багета и монтажных работ"
                  style={{
                    width: '100%',
                    height: '38px',
                    background: 'var(--input-bg)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                    padding: '0 12px',
                    fontSize: '0.88rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Блок слотов / позиций сметы */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Tag size={16} style={{ color: 'var(--accent-primary)' }} />
                    Материал / Услуга, добавляемые в смету автоматически:
                  </div>
                  <button
                    type="button"
                    onClick={addSlotToEditing}
                    className="btn btn-ghost"
                    style={{ fontSize: '0.82rem', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px', border: '1px dashed var(--glass-border)' }}
                  >
                    <Plus size={14} /> + Добавить материал
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {editingService.slots.map((slot, sIdx) => (
                    <div
                      key={sIdx}
                      style={{
                        background: 'var(--card-bg, rgba(255, 255, 255, 0.03))',
                        border: '1px solid var(--glass-border)',
                        borderRadius: 'var(--radius-md)',
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                        <input
                          type="text"
                          value={slot.name}
                          onChange={e => updateSlot(sIdx, { name: e.target.value })}
                          placeholder="Название материала / услуги (например: Полотно, Стеновой багет, Монтаж)"
                          style={{
                            flex: 1,
                            height: '34px',
                            background: 'var(--input-bg)',
                            border: '1px solid var(--glass-border)',
                            borderRadius: '4px',
                            color: 'var(--text-primary)',
                            fontWeight: 600,
                            padding: '0 10px',
                            fontSize: '0.88rem'
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => removeSlot(sIdx)}
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                          title="Удалить эту позицию"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      {/* Настройки формулы расчета слота */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
                        <div>
                          <label style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Единица расчета</label>
                          <select
                            value={slot.calculationBasis}
                            onChange={e => updateSlot(sIdx, { calculationBasis: e.target.value as CalculationBasis })}
                            style={{ width: '100%', height: '32px', background: 'var(--input-bg)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', fontSize: '0.82rem', borderRadius: '4px', padding: '0 6px' }}
                          >
                            <option value="AREA" style={{ background: 'var(--dropdown-bg, #1e293b)', color: 'var(--text-primary)' }}>Площадь S (м²)</option>
                            <option value="PERIMETER" style={{ background: 'var(--dropdown-bg, #1e293b)', color: 'var(--text-primary)' }}>Периметр P (м.пог)</option>
                            <option value="COUNT" style={{ background: 'var(--dropdown-bg, #1e293b)', color: 'var(--text-primary)' }}>Штуки (шт)</option>
                            <option value="LENGTH" style={{ background: 'var(--dropdown-bg, #1e293b)', color: 'var(--text-primary)' }}>Длина (м.пог)</option>
                            <option value="FIXED" style={{ background: 'var(--dropdown-bg, #1e293b)', color: 'var(--text-primary)' }}>Фиксировано (1 шт)</option>
                          </select>
                        </div>

                        <div>
                          <label style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Тип выбора в замере</label>
                          <select
                            value={slot.slotType}
                            onChange={e => updateSlot(sIdx, { slotType: e.target.value as SlotType })}
                            style={{ width: '100%', height: '32px', background: 'var(--input-bg)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', fontSize: '0.82rem', borderRadius: '4px', padding: '0 6px' }}
                          >
                            <option value="DROPDOWN" style={{ background: 'var(--dropdown-bg, #1e293b)', color: 'var(--text-primary)' }}>Выбор одного варианта (Dropdown)</option>
                            <option value="AUTO_INCLUDE" style={{ background: 'var(--dropdown-bg, #1e293b)', color: 'var(--text-primary)' }}>Авто-включение (без выбора)</option>
                            <option value="OPTIONAL" style={{ background: 'var(--dropdown-bg, #1e293b)', color: 'var(--text-primary)' }}>Опционально (можно пропустить)</option>
                          </select>
                        </div>

                        <div>
                          <label style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Коэфф. расхода / усадки</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0.5"
                            value={slot.wasteCoefficient || 1.0}
                            onChange={e => updateSlot(sIdx, { wasteCoefficient: parseFloat(e.target.value) || 1.0 })}
                            style={{ width: '100%', height: '32px', background: 'var(--input-bg)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', fontSize: '0.84rem', borderRadius: '4px', padding: '0 8px' }}
                          />
                        </div>
                      </div>

                      {/* Привязка взаимозаменяемых материалов склада */}
                      <div style={{ marginTop: '6px' }}>
                        <label style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                          Добавить взаимозаменяемые материалы со склада:
                        </label>
                        <div style={{ maxWidth: '400px', marginBottom: '8px' }}>
                          <SearchSelect
                            options={materialOptions}
                            placeholder="+ Начните вводить название товара/услуги..."
                            onChange={val => {
                              if (val) addMaterialToSlot(sIdx, Number(val));
                            }}
                          />
                        </div>

                        {/* Теги материалов */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {slot.materials.map(m => (
                            <span
                              key={m.materialId}
                              style={{
                                fontSize: '0.78rem',
                                padding: '4px 10px',
                                borderRadius: '6px',
                                background: m.isDefault ? 'rgba(34, 197, 94, 0.15)' : 'var(--chip-bg, rgba(255, 255, 255, 0.06))',
                                border: m.isDefault ? '1px solid rgba(34, 197, 94, 0.4)' : '1px solid var(--glass-border)',
                                color: m.isDefault ? '#16a34a' : 'var(--text-primary)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontWeight: m.isDefault ? 600 : 400
                              }}
                            >
                              <button
                                type="button"
                                onClick={() => setDefaultMaterialInSlot(sIdx, m.materialId)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: m.isDefault ? '#16a34a' : 'var(--text-secondary)',
                                  cursor: 'pointer',
                                  padding: 0,
                                  fontSize: '0.72rem',
                                  fontWeight: 600
                                }}
                                title={m.isDefault ? 'По умолчанию' : 'Сделать по умолчанию'}
                              >
                                {m.isDefault ? '★ По умолчанию' : '☆ Выбрать'}
                              </button>
                              <span>{m.materialName} ({m.salePrice} ₽/{m.unit})</span>
                              <button
                                type="button"
                                onClick={() => removeMaterialFromSlot(sIdx, m.materialId)}
                                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 0, fontSize: '0.9rem' }}
                              >
                                ✕
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'flex-end', gap: '12px', background: 'var(--row-hover-bg, rgba(0,0,0,0.05))' }}>
              <button
                type="button"
                onClick={() => setEditingService(null)}
                className="btn btn-ghost"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleSaveEditingService}
                disabled={saving}
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 20px', fontWeight: 600 }}
              >
                <Save size={16} /> {saving ? 'Сохранение...' : 'Сохранить услугу'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
