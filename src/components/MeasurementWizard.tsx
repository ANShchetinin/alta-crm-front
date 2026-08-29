import React, { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  Save,
  FileDown,
  ChevronDown,
  ChevronUp,
  Ruler,
  Minus,
  Box,
  Layers,
  Check
} from 'lucide-react';
import type { Material } from '../api/storage';
import {
  getMeasurementByOrderId,
  saveOrderMeasurement,
  type MeasurementDto,
  type MeasurementRoomDto,
  type MeasurementCalculationItemDto,
  type MeasurementCalculateResponse
} from '../api/measurements';
import { getActiveEstimationServices, type EstimationService, type EstimationServiceSlot } from '../api/estimationServices';
import { SearchSelect, type SearchSelectOption } from './SearchSelect';

interface MeasurementWizardProps {
  orderId?: number;
  materials: Material[];
  canViewFinances: boolean;
  onSaved?: (savedMeasurement: MeasurementDto, calculated: MeasurementCalculateResponse) => void;
  onDownloadDocx?: () => void;
}

const PRESET_ROOMS = [
  'Гостиная',
  'Спальня',
  'Кухня',
  'Прихожая',
  'Ванная',
  'Санузел',
  'Детская',
  'Коридор',
  'Балкон'
];

export const MeasurementWizard: React.FC<MeasurementWizardProps> = ({
  orderId,
  materials,
  canViewFinances,
  onSaved,
  onDownloadDocx
}) => {
  const [rooms, setRooms] = useState<MeasurementRoomDto[]>([]);
  const [notes, setNotes] = useState<string>('');
  const [activeRoomIdx, setActiveRoomIdx] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [showSpecDetails, setShowSpecDetails] = useState<boolean>(true);

  // Динамические глобальные услуги со слотами
  const [estimationServices, setEstimationServices] = useState<EstimationService[]>([]);

  // Интерактивные строки сметы
  const [customItems, setCustomItems] = useState<MeasurementCalculationItemDto[]>([]);
  const [isManualEditMode, setIsManualEditMode] = useState<boolean>(false);
  const [isAddMaterialModalOpen, setIsAddMaterialModalOpen] = useState<boolean>(false);
  const [selectedAddMaterialId, setSelectedAddMaterialId] = useState<number | ''>('');

  // Загрузка услуг и сохраненной сметы
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    Promise.all([
      getActiveEstimationServices().catch(() => [] as EstimationService[]),
      orderId ? getMeasurementByOrderId(orderId).catch(() => null) : Promise.resolve(null)
    ]).then(async ([loadedServices, dto]) => {
      if (!isMounted) return;
      setEstimationServices(loadedServices);

      const targetRooms = (dto && dto.rooms && dto.rooms.length > 0)
        ? dto.rooms
        : [createDefaultRoom('Гостиная')];

      setRooms(targetRooms);
      setNotes(dto?.notes || '');

      // Если у замера уже сохранены точные позиции сметы, восстанавливаем их.
      // Изначально для новой заявки/замера смета пустая, пока пользователь не нажмет на чипсу услуги.
      let calculatedItems: MeasurementCalculationItemDto[] = [];
      if (dto && dto.items && dto.items.length > 0) {
        calculatedItems = dto.items;
      }

      if (isMounted) {
        setCustomItems(calculatedItems);
        setLoading(false);
      }
    }).catch(err => {
      console.error('Ошибка инициализации замера:', err);
      if (isMounted) {
        setRooms([createDefaultRoom('Гостиная')]);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [orderId, materials]);

  function createDefaultRoom(name: string): MeasurementRoomDto {
    return {
      roomName: name,
      area: 15,
      perimeter: 16,
      height: 2.7,
      baseCorners: 4,
      extraCorners: 0,
      lightsCount: 0,
      chandeliersCount: 0,
      tracksLength: 0,
      corniceLength: 0,
      pipesCount: 0,
      tileLength: 0,
      slotSelections: []
    };
  }

  const currentRoom = rooms[activeRoomIdx] || rooms[0];

  // Проверка активности глобальной услуги для текущей комнаты
  const isServiceActiveInRoom = (service: EstimationService): boolean => {
    const currentRoomName = currentRoom?.roomName || 'Гостиная';
    const slotIds = (service.slots || []).map(s => s.id);
    return customItems.some(it => 
      (it.roomName === currentRoomName || !it.roomName) && 
      it.slotId != null && 
      slotIds.includes(it.slotId)
    );
  };

  // Переключение чипсы глобальной услуги (Включить / Выключить в смету комнаты)
  const toggleGlobalServiceInRoom = (service: EstimationService) => {
    if (!currentRoom) return;
    setIsManualEditMode(true);
    const currentRoomName = currentRoom.roomName || 'Гостиная';
    const slotIds = (service.slots || []).map(s => s.id);
    const isActive = isServiceActiveInRoom(service);

    if (isActive) {
      // Отключаем услугу: удаляем ее строки из сметы для текущей комнаты
      setCustomItems(prev => prev.filter(it => 
        !(it.roomName === currentRoomName && it.slotId != null && slotIds.includes(it.slotId))
      ));
    } else {
      // Включаем услугу: добавляем позиции по умолчанию для каждого слота услуги
      const newItemsToAdd: MeasurementCalculationItemDto[] = [];

      (service.slots || []).forEach(slot => {
        if (!slot.materials || slot.materials.length === 0) return;

        // Ищем материал по умолчанию или берем первый
        const defaultMat = slot.materials.find(m => m.isDefault) || slot.materials[0];
        const fullMat = materials.find(m => m.id === defaultMat.materialId);

        // Рассчитываем начальный объем на базе calculationBasis
        let quantity = 1;
        const waste = slot.wasteCoefficient || 1.0;

        if (slot.calculationBasis === 'AREA') {
          quantity = Math.round((currentRoom.area || 15) * waste * 100) / 100;
        } else if (slot.calculationBasis === 'PERIMETER') {
          quantity = Math.round((currentRoom.perimeter || 16) * waste * 100) / 100;
        } else if (slot.calculationBasis === 'COUNT' || slot.calculationBasis === 'LENGTH') {
          quantity = 1;
        }

        const salePrice = defaultMat.salePrice != null ? defaultMat.salePrice : (fullMat?.salePrice || 0);
        const costPrice = defaultMat.costPrice != null ? defaultMat.costPrice : (fullMat?.costPrice || 0);

        newItemsToAdd.push({
          materialId: defaultMat.materialId,
          slotId: slot.id,
          name: fullMat?.name || defaultMat.materialName || 'Позиция',
          type: fullMat?.type || defaultMat.type || 'MATERIAL',
          quantity: quantity,
          unit: fullMat?.unit || defaultMat.unit || 'шт',
          unitSalePrice: salePrice,
          unitCostPrice: costPrice,
          totalSalePrice: Math.round(quantity * salePrice * 100) / 100,
          totalCostPrice: Math.round(quantity * costPrice * 100) / 100,
          roomName: currentRoomName
        });
      });

      setCustomItems(prev => [...prev, ...newItemsToAdd]);
    }
  };

  // Автоматический пересчет объемов по площади/периметру при изменении размеров комнаты
  const updateRoom = (idx: number, patch: Partial<MeasurementRoomDto>) => {
    setRooms(prev => {
      const next = [...prev];
      const oldRoom = next[idx];
      const updated = { ...oldRoom, ...patch };
      next[idx] = updated;

      // Если изменились area или perimeter, синхронизируем зависимые строки сметы
      if ((patch.area !== undefined && patch.area !== oldRoom.area) || 
          (patch.perimeter !== undefined && patch.perimeter !== oldRoom.perimeter)) {
        setCustomItems(currentItems => currentItems.map(it => {
          if (it.roomName !== updated.roomName && it.roomName !== oldRoom.roomName) return it;
          if (!it.slotId) return it;

          // Ищем слот
          let targetSlot: EstimationServiceSlot | undefined;
          for (const s of estimationServices) {
            targetSlot = (s.slots || []).find(slot => slot.id === it.slotId);
            if (targetSlot) break;
          }

          if (!targetSlot) return it;

          let newQ = it.quantity;
          const waste = targetSlot.wasteCoefficient || 1.0;
          if (targetSlot.calculationBasis === 'AREA' && patch.area !== undefined) {
            newQ = Math.round(patch.area * waste * 100) / 100;
          } else if (targetSlot.calculationBasis === 'PERIMETER' && patch.perimeter !== undefined) {
            newQ = Math.round(patch.perimeter * waste * 100) / 100;
          }

          const saleP = it.unitSalePrice || 0;
          const costP = it.unitCostPrice || 0;
          return {
            ...it,
            roomName: updated.roomName,
            quantity: newQ,
            totalSalePrice: Math.round(newQ * saleP * 100) / 100,
            totalCostPrice: Math.round(newQ * costP * 100) / 100
          };
        }));
      }

      return next;
    });
  };

  // Смена материала в строке сметы (выбор альтернативного из этого же слота/категории)
  const switchRowMaterial = (rowIndex: number, newMaterialId: number) => {
    setIsManualEditMode(true);
    const item = customItems[rowIndex];
    const newMat = materials.find(m => m.id === newMaterialId);
    if (!newMat) return;

    let targetSlotId = item.slotId;
    if (!targetSlotId) {
      for (const svc of estimationServices) {
        const found = (svc.slots || []).find(s => (s.materials || []).some(m => m.materialId === newMaterialId || m.materialId === item.materialId));
        if (found) {
          targetSlotId = found.id;
          break;
        }
      }
    }

    setCustomItems(prev => {
      const next = [...prev];
      const q = item.quantity || 1;
      const sPrice = newMat.salePrice != null ? newMat.salePrice : (newMat.costPrice || 0);
      const cPrice = newMat.costPrice || 0;

      next[rowIndex] = {
        ...item,
        materialId: newMat.id,
        slotId: targetSlotId,
        name: newMat.name,
        unit: newMat.unit || item.unit,
        unitSalePrice: sPrice,
        unitCostPrice: cPrice,
        totalSalePrice: Math.round(q * sPrice * 100) / 100,
        totalCostPrice: Math.round(q * cPrice * 100) / 100
      };
      return next;
    });
  };

  const addRoom = (presetName?: string) => {
    let newName = presetName || `Помещение ${rooms.length + 1}`;
    if (presetName) {
      const existingCount = rooms.filter(r => r.roomName === presetName || r.roomName.startsWith(`${presetName} `)).length;
      if (existingCount > 0) {
        newName = `${presetName} ${existingCount + 1}`;
      }
    }
    const newRoom = createDefaultRoom(newName);
    setRooms(prev => [...prev, newRoom]);
    setActiveRoomIdx(rooms.length);
  };

  const removeRoom = (idx: number) => {
    if (rooms.length <= 1) return;
    const roomToRemove = rooms[idx];
    setRooms(prev => prev.filter((_, i) => i !== idx));
    setCustomItems(prev => prev.filter(it => it.roomName !== roomToRemove.roomName));
    if (activeRoomIdx >= idx && activeRoomIdx > 0) {
      setActiveRoomIdx(activeRoomIdx - 1);
    }
  };

  // Ручное редактирование строк сметы
  const updateSpecItem = (index: number, patch: Partial<MeasurementCalculationItemDto>) => {
    setIsManualEditMode(true);
    setCustomItems(prev => {
      const next = [...prev];
      const current = { ...next[index], ...patch };
      const q = typeof current.quantity === 'number' ? current.quantity : parseFloat(current.quantity as any) || 0;
      const p = typeof current.unitSalePrice === 'number' ? current.unitSalePrice : parseFloat(current.unitSalePrice as any) || 0;
      const cp = typeof current.unitCostPrice === 'number' ? current.unitCostPrice : parseFloat(current.unitCostPrice as any) || 0;

      current.quantity = q;
      current.unitSalePrice = p;
      current.unitCostPrice = cp;
      current.totalSalePrice = Math.round(q * p * 100) / 100;
      current.totalCostPrice = Math.round(q * cp * 100) / 100;

      next[index] = current;
      return next;
    });
  };

  const removeSpecItem = (index: number) => {
    setIsManualEditMode(true);
    setCustomItems(prev => prev.filter((_, i) => i !== index));
  };

  const addCustomEmptyItem = () => {
    setIsManualEditMode(true);
    const currentRoomName = currentRoom?.roomName || 'Помещение 1';
    const newItem: MeasurementCalculationItemDto = {
      name: 'Дополнительная позиция / работа',
      type: 'SERVICE',
      quantity: 1,
      unit: 'шт',
      unitSalePrice: 0,
      unitCostPrice: 0,
      totalSalePrice: 0,
      totalCostPrice: 0,
      roomName: currentRoomName
    };
    setCustomItems(prev => [...prev, newItem]);
  };

  const addMaterialFromWarehouse = (matId: number) => {
    const mat = materials.find(m => m.id === matId);
    if (!mat) return;

    setIsManualEditMode(true);
    const currentRoomName = currentRoom?.roomName || 'Помещение 1';
    const newItem: MeasurementCalculationItemDto = {
      materialId: mat.id,
      name: mat.name,
      type: mat.type || 'MATERIAL',
      quantity: 1,
      unit: mat.unit || 'шт',
      unitSalePrice: mat.salePrice || 0,
      unitCostPrice: mat.costPrice || 0,
      totalSalePrice: mat.salePrice || 0,
      totalCostPrice: mat.costPrice || 0,
      roomName: currentRoomName
    };
    setCustomItems(prev => [...prev, newItem]);
    setIsAddMaterialModalOpen(false);
    setSelectedAddMaterialId('');
  };

  // Вычисляем итоговые суммы
  const effectiveTotalSalePrice = customItems.reduce((sum, it) => sum + (it.totalSalePrice || 0), 0);
  const effectiveTotalCostPrice = customItems.reduce((sum, it) => sum + (it.totalCostPrice || 0), 0);
  const effectiveProfit = effectiveTotalSalePrice - effectiveTotalCostPrice;
  const effectiveMarginPercent = effectiveTotalSalePrice > 0
    ? Math.round((effectiveProfit / effectiveTotalSalePrice) * 100)
    : 0;

  const totalArea = rooms.reduce((sum, r) => sum + (r.area || 0), 0);
  const totalPerimeter = rooms.reduce((sum, r) => sum + (r.perimeter || 0), 0);

  const handleSave = async () => {
    if (!orderId) return;
    setSaving(true);
    try {
      const dto: MeasurementDto = {
        orderId,
        notes,
        rooms,
        items: customItems,
        totalPrice: effectiveTotalSalePrice,
        totalCostPrice: effectiveTotalCostPrice
      };
      const saved = await saveOrderMeasurement(orderId, dto);

      const effectiveResponse: MeasurementCalculateResponse = {
        totalSalePrice: effectiveTotalSalePrice,
        totalCostPrice: effectiveTotalCostPrice,
        expectedProfit: effectiveProfit,
        profitMarginPercent: effectiveMarginPercent,
        totalArea: totalArea,
        totalPerimeter: totalPerimeter,
        totalRoomsCount: rooms.length,
        totalLightsCount: customItems.filter(it => it.name.toLowerCase().includes('светильник')).reduce((s, it) => s + (it.quantity || 0), 0),
        totalPipesCount: customItems.filter(it => it.name.toLowerCase().includes('труб')).reduce((s, it) => s + (it.quantity || 0), 0),
        totalCorniceLength: customItems.filter(it => it.name.toLowerCase().includes('карниз') || it.name.toLowerCase().includes('ниша')).reduce((s, it) => s + (it.quantity || 0), 0),
        items: customItems
      };

      if (onSaved) {
        onSaved(saved, effectiveResponse);
      }
    } catch (e: any) {
      console.error('Не удалось сохранить замер', e);
      alert('Ошибка при сохранении замера: ' + (e.response?.data?.message || e.message));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Загрузка параметров замера...
      </div>
    );
  }

  const darkInputStyle: React.CSSProperties = {
    width: '100%',
    height: '38px',
    background: 'var(--input-bg, rgba(255, 255, 255, 0.05))',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-primary)',
    padding: '0 12px',
    fontSize: '0.9rem',
    outline: 'none',
    boxSizing: 'border-box'
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '0.78rem',
    color: 'var(--text-secondary)',
    display: 'block',
    marginBottom: '6px',
    fontWeight: 500
  };

  const sectionHeaderStyle: React.CSSProperties = {
    fontSize: '0.84rem',
    fontWeight: 600,
    color: 'var(--text-secondary)',
    marginBottom: '10px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  };

  const allWarehouseOptions: SearchSelectOption[] = materials.map(m => ({
    value: m.id,
    label: m.name,
    price: m.salePrice,
    unit: m.unit,
    stock: m.quantityInStock,
    subLabel: m.category || (m.type === 'SERVICE' ? 'Услуга' : 'Материал')
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* 1. Навигация по комнатам (Табы) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        overflowX: 'auto',
        paddingBottom: '4px',
        scrollbarWidth: 'none'
      }}>
        {rooms.map((room, idx) => {
          const isActive = idx === activeRoomIdx;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => setActiveRoomIdx(idx)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 14px',
                borderRadius: 'var(--radius-md)',
                background: isActive ? 'linear-gradient(135deg, var(--accent-primary), var(--accent-hover))' : 'var(--chip-bg, rgba(255, 255, 255, 0.04))',
                color: isActive ? '#ffffff' : 'var(--text-primary)',
                border: '1px solid ' + (isActive ? 'var(--accent-primary)' : 'var(--glass-border)'),
                fontWeight: isActive ? 600 : 500,
                fontSize: '0.88rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
                boxShadow: isActive ? '0 4px 12px var(--accent-glow)' : 'none'
              }}
            >
              <span>{room.roomName || `Помещение ${idx + 1}`}</span>
              <span style={{
                fontSize: '0.74rem',
                opacity: 0.9,
                background: isActive ? 'rgba(0, 0, 0, 0.25)' : 'var(--wizard-stat-bg, rgba(255, 255, 255, 0.08))',
                color: isActive ? '#ffffff' : 'var(--text-primary)',
                padding: '2px 7px',
                borderRadius: '10px',
                fontWeight: 600
              }}>
                {room.area || 0} м²
              </span>
            </button>
          );
        })}

        {/* Быстрое добавление комнат */}
        <button
          type="button"
          onClick={() => addRoom()}
          style={{
            padding: '8px 14px',
            borderRadius: 'var(--radius-md)',
            background: 'transparent',
            border: '1px dashed var(--accent-primary, rgba(59, 130, 246, 0.5))',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.85rem',
            color: 'var(--accent-primary)',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            fontWeight: 500
          }}
        >
          <Plus size={15} /> Добавить
        </button>
      </div>

      {/* Быстрые пресеты для добавления комнат */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Шаблоны:</span>
        {PRESET_ROOMS.map(preset => (
          <button
            key={preset}
            type="button"
            onClick={() => addRoom(preset)}
            style={{
              fontSize: '0.76rem',
              padding: '3px 9px',
              borderRadius: '6px',
              background: 'var(--chip-bg, rgba(255, 255, 255, 0.04))',
              border: '1px solid var(--glass-border)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            + {preset}
          </button>
        ))}
      </div>

      {currentRoom && (
        <div style={{
          background: 'var(--card-bg, rgba(255, 255, 255, 0.02))',
          border: '1px solid var(--glass-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '18px',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px'
        }}>
          {/* Название помещения и кнопка удаления */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
            <div style={{ flex: 1, maxWidth: '320px' }}>
              <input
                type="text"
                value={currentRoom.roomName}
                onChange={e => updateRoom(activeRoomIdx, { roomName: e.target.value })}
                placeholder="Название помещения"
                style={{
                  ...darkInputStyle,
                  fontSize: '1.05rem',
                  fontWeight: 600,
                  height: '42px',
                  background: 'var(--input-bg)',
                  border: '1px solid var(--accent-primary, rgba(59, 130, 246, 0.4))'
                }}
              />
            </div>

            {rooms.length > 1 && (
              <button
                type="button"
                onClick={() => removeRoom(activeRoomIdx)}
                className="btn-icon"
                style={{
                  color: '#ef4444',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  fontSize: '0.82rem',
                  fontWeight: 500
                }}
                title="Удалить это помещение"
              >
                <Trash2 size={15} /> Удалить комнату
              </button>
            )}
          </div>

          {/* 1. Блок геометрических размеров */}
          <div>
            <div style={sectionHeaderStyle}>
              <Ruler size={15} style={{ color: 'var(--accent-primary)' }} />
              Геометрия помещения
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: '12px'
            }}>
              <div>
                <label style={labelStyle}>Площадь (м²)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={currentRoom.area || ''}
                  onChange={e => updateRoom(activeRoomIdx, { area: parseFloat(e.target.value) || 0 })}
                  style={{ ...darkInputStyle, fontWeight: 700, fontSize: '1.05rem', color: '#16a34a' }}
                />
              </div>

              <div>
                <label style={labelStyle}>Периметр (м.п.)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={currentRoom.perimeter || ''}
                  onChange={e => updateRoom(activeRoomIdx, { perimeter: parseFloat(e.target.value) || 0 })}
                  style={{ ...darkInputStyle, fontWeight: 600 }}
                />
              </div>

              <div>
                <label style={labelStyle}>Высота стен (м)</label>
                <input
                  type="number"
                  step="0.05"
                  min="1"
                  value={currentRoom.height || 2.7}
                  onChange={e => updateRoom(activeRoomIdx, { height: parseFloat(e.target.value) || 2.7 })}
                  style={darkInputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Доп. углы (&gt;4)</label>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  height: '38px',
                  background: 'var(--input-bg)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: 'var(--radius-sm)',
                  overflow: 'hidden'
                }}>
                  <button
                    type="button"
                    onClick={() => updateRoom(activeRoomIdx, { extraCorners: Math.max(0, (currentRoom.extraCorners || 0) - 1) })}
                    style={{ width: '36px', minWidth: '36px', flexShrink: 0, height: '100%', background: 'var(--row-hover-bg)', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Minus size={14} />
                  </button>
                  <input
                    type="number"
                    min="0"
                    value={currentRoom.extraCorners || 0}
                    onChange={e => updateRoom(activeRoomIdx, { extraCorners: parseInt(e.target.value) || 0 })}
                    style={{ flex: 1, minWidth: '40px', height: '100%', border: 'none', background: 'transparent', color: 'var(--text-primary)', textAlign: 'center', fontWeight: 600, fontSize: '0.92rem', outline: 'none' }}
                  />
                  <button
                    type="button"
                    onClick={() => updateRoom(activeRoomIdx, { extraCorners: (currentRoom.extraCorners || 0) + 1 })}
                    style={{ width: '36px', minWidth: '36px', flexShrink: 0, height: '100%', background: 'var(--row-hover-bg)', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 2. ЧИПСЫ ГЛОБАЛЬНЫХ УСЛУГ (Быстрое добавление пакетов в смету комнаты) */}
          {estimationServices.length > 0 && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={sectionHeaderStyle}>
                  <Layers size={15} style={{ color: 'var(--accent-primary)' }} />
                  Глобальные услуги для комнаты
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Нажмите на чипсу, чтобы включить/выключить пакет услуг в смету
                </span>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {estimationServices.map(svc => {
                  const active = isServiceActiveInRoom(svc);
                  return (
                    <button
                      key={svc.id}
                      type="button"
                      onClick={() => toggleGlobalServiceInRoom(svc)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 16px',
                        borderRadius: '24px',
                        background: active 
                          ? 'linear-gradient(135deg, #0ea5e9, #3b82f6)' 
                          : 'var(--chip-bg, rgba(255, 255, 255, 0.04))',
                        color: active ? '#ffffff' : 'var(--text-primary)',
                        border: '1px solid ' + (active ? '#38bdf8' : 'var(--glass-border)'),
                        cursor: 'pointer',
                        fontSize: '0.88rem',
                        fontWeight: active ? 600 : 500,
                        transition: 'all 0.2s ease',
                        boxShadow: active ? '0 4px 14px rgba(14, 165, 233, 0.4)' : 'none'
                      }}
                    >
                      {active ? <Check size={16} /> : <Plus size={16} style={{ opacity: 0.6 }} />}
                      {svc.name}
                      <span style={{
                        fontSize: '0.72rem',
                        opacity: 0.85,
                        background: active ? 'rgba(0,0,0,0.2)' : 'var(--wizard-stat-bg, rgba(255,255,255,0.06))',
                        color: active ? '#ffffff' : 'var(--text-primary)',
                        padding: '1px 6px',
                        borderRadius: '10px'
                      }}>
                        {svc.slots?.length || 0} поз.
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Заметки замерщика */}
      <div>
        <label style={labelStyle}>
          📝 Заметки замерщика / особенности монтажа
        </label>
        <textarea
          rows={2}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Особые указания монтажникам, тип проводки, скрытые коммуникации..."
          style={{
            width: '100%',
            background: 'var(--input-bg, rgba(255, 255, 255, 0.04))',
            border: '1px solid var(--glass-border)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-primary)',
            padding: '8px 12px',
            fontSize: '0.86rem',
            outline: 'none',
            resize: 'vertical',
            boxSizing: 'border-box'
          }}
        />
      </div>

      {/* 3. Плавающий блок итогов и ИНТЕРАКТИВНАЯ ТАБЛИЦА СМЕТЫ */}
      <div style={{
        background: 'var(--wizard-summary-gradient)',
        border: '1px solid var(--wizard-summary-border)',
        borderRadius: 'var(--radius-lg)',
        padding: '18px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.08)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: 600 }}>
              ИТОГОВАЯ СМЕТА
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#16a34a', letterSpacing: '-0.5px' }}>
              {effectiveTotalSalePrice.toLocaleString('ru-RU')} ₽
            </div>
          </div>

          {/* Сводка геометрии */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            fontSize: '0.86rem',
            color: 'var(--text-secondary)',
            background: 'var(--wizard-stat-bg)',
            border: '1px solid var(--glass-border)',
            padding: '8px 14px',
            borderRadius: '8px',
            flexWrap: 'wrap'
          }}>
            <div>
              <span>Общая площадь: </span>
              <strong style={{ color: 'var(--text-primary)' }}>{totalArea} м²</strong>
            </div>
            <div>
              <span>Периметр: </span>
              <strong style={{ color: 'var(--text-primary)' }}>{totalPerimeter} м.п.</strong>
            </div>
            <div>
              <span>Помещений: </span>
              <strong style={{ color: 'var(--text-primary)' }}>{rooms.length}</strong>
            </div>
          </div>

          {/* Финансовые показатели (только для canViewFinances) */}
          {canViewFinances && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              background: 'var(--wizard-stat-bg)',
              border: '1px solid var(--glass-border)',
              padding: '8px 14px',
              borderRadius: '8px',
              fontSize: '0.84rem'
            }}>
              <div>
                <span style={{ color: 'var(--text-secondary)' }}>Себестоимость: </span>
                <strong style={{ color: 'var(--text-primary)' }}>{effectiveTotalCostPrice.toLocaleString('ru-RU')} ₽</strong>
              </div>
              <div style={{ borderLeft: '1px solid var(--glass-border)', paddingLeft: '12px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Прибыль: </span>
                <strong style={{ color: 'var(--accent-primary)' }}>{effectiveProfit.toLocaleString('ru-RU')} ₽</strong>
                {effectiveMarginPercent > 0 && (
                  <span style={{ marginLeft: '4px', opacity: 0.85, color: 'var(--accent-primary)' }}>
                    ({effectiveMarginPercent}%)
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Заголовок с кнопками добавления */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setShowSpecDetails(prev => !prev)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--accent-primary)',
                fontSize: '0.88rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: 0
              }}
            >
              {showSpecDetails ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              {showSpecDetails ? 'Скрыть таблицу сметы' : `Позиции сметы (${customItems.length})`}
            </button>
            {isManualEditMode && (
              <span style={{ fontSize: '0.72rem', background: 'rgba(245, 158, 11, 0.2)', color: '#d97706', padding: '2px 8px', borderRadius: '6px', fontWeight: 600 }}>
                Пользовательские правки
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setIsAddMaterialModalOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 12px',
                borderRadius: '6px',
                background: 'rgba(59, 130, 246, 0.12)',
                border: '1px solid rgba(59, 130, 246, 0.35)',
                color: 'var(--accent-primary)',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <Box size={14} /> + Со склада
            </button>

            <button
              type="button"
              onClick={addCustomEmptyItem}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 12px',
                borderRadius: '6px',
                background: 'var(--row-hover-bg, rgba(255, 255, 255, 0.06))',
                border: '1px solid var(--glass-border)',
                color: 'var(--text-primary)',
                fontSize: '0.82rem',
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              <Plus size={14} /> + Своя позиция
            </button>
          </div>
        </div>

        {/* Раскрытая интерактивная таблица сметы с Dropdown выбора альтернативных материалов */}
        {showSpecDetails && (
          <div style={{
            background: 'var(--table-bg, rgba(0, 0, 0, 0.2))',
            borderRadius: '8px',
            overflowX: 'auto',
            border: '1px solid var(--glass-border)'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
              <thead>
                <tr style={{ background: 'var(--table-header-bg, rgba(255, 255, 255, 0.06))', color: 'var(--text-secondary)', textAlign: 'left' }}>
                  <th style={{ padding: '8px 10px', width: '35px' }}>#</th>
                  <th style={{ padding: '8px 10px', minWidth: '260px' }}>Наименование позиции / услуги (выбор из типа)</th>
                  <th style={{ padding: '8px 10px', width: '90px', textAlign: 'center' }}>Кол-во</th>
                  <th style={{ padding: '8px 10px', width: '80px', textAlign: 'center' }}>Ед.</th>
                  <th style={{ padding: '8px 10px', width: '110px', textAlign: 'right' }}>Цена (₽)</th>
                  <th style={{ padding: '8px 10px', width: '110px', textAlign: 'right' }}>Сумма (₽)</th>
                  <th style={{ padding: '8px 10px', width: '40px' }}></th>
                </tr>
              </thead>
              <tbody>
                {customItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      Нет позиций в смете. Нажмите на чипсу услуги выше или кнопку «+ Со склада».
                    </td>
                  </tr>
                ) : (
                  customItems.map((item, idx) => {
                    // Ищем слот, чтобы дать выбор альтернативных материалов того же типа
                    let linkedSlot: EstimationServiceSlot | undefined;
                    if (item.slotId) {
                      for (const svc of estimationServices) {
                        linkedSlot = (svc.slots || []).find(s => s.id === item.slotId);
                        if (linkedSlot) break;
                      }
                    }
                    if (!linkedSlot && item.materialId) {
                      for (const svc of estimationServices) {
                        linkedSlot = (svc.slots || []).find(s => (s.materials || []).some(m => m.materialId === item.materialId));
                        if (linkedSlot) break;
                      }
                    }

                    const hasAlternatives = linkedSlot && linkedSlot.materials && linkedSlot.materials.length > 1;

                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                        <td style={{ padding: '6px 10px', color: 'var(--text-secondary)', fontWeight: 600 }}>{idx + 1}</td>
                        <td style={{ padding: '6px 10px' }}>
                          {hasAlternatives ? (
                            /* Дропдаун с альтернативными материалами этого же типа */
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <select
                                value={item.materialId || ''}
                                onChange={e => switchRowMaterial(idx, Number(e.target.value))}
                                style={{
                                  width: '100%',
                                  background: 'var(--input-bg, rgba(59, 130, 246, 0.12))',
                                  border: '1px solid var(--accent-primary, rgba(59, 130, 246, 0.4))',
                                  borderRadius: '4px',
                                  color: 'var(--text-primary)',
                                  padding: '5px 8px',
                                  fontSize: '0.86rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  outline: 'none'
                                }}
                              >
                                {linkedSlot!.materials.map(alt => (
                                  <option key={alt.materialId} value={alt.materialId} style={{ background: 'var(--dropdown-bg, #1e293b)', color: 'var(--text-primary)' }}>
                                    {alt.materialName} ({alt.salePrice} ₽/{alt.unit})
                                  </option>
                                ))}
                              </select>
                              {item.roomName && (
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', paddingLeft: '4px' }}>
                                  {item.roomName} • {linkedSlot?.name}
                                </div>
                              )}
                            </div>
                          ) : (
                            /* Обычное поле ввода названия */
                            <div>
                              <input
                                type="text"
                                value={item.name}
                                onChange={e => updateSpecItem(idx, { name: e.target.value })}
                                style={{
                                  width: '100%',
                                  background: 'var(--input-bg, rgba(255,255,255,0.03))',
                                  border: '1px solid transparent',
                                  borderRadius: '4px',
                                  color: 'var(--text-primary)',
                                  padding: '4px 8px',
                                  fontSize: '0.84rem'
                                }}
                                onFocus={e => (e.target.style.borderColor = 'var(--accent-primary)')}
                                onBlur={e => (e.target.style.borderColor = 'transparent')}
                              />
                              {item.roomName && (
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', paddingLeft: '8px' }}>
                                  {item.roomName}
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '6px 10px' }}>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.quantity}
                            onChange={e => updateSpecItem(idx, { quantity: parseFloat(e.target.value) || 0 })}
                            style={{
                              width: '100%',
                              textAlign: 'center',
                              background: 'var(--input-bg, rgba(255,255,255,0.04))',
                              border: '1px solid var(--glass-border)',
                              borderRadius: '4px',
                              color: 'var(--text-primary)',
                              padding: '4px 6px',
                              fontWeight: 600
                            }}
                          />
                        </td>
                        <td style={{ padding: '6px 10px' }}>
                          <select
                            value={item.unit || 'шт'}
                            onChange={e => updateSpecItem(idx, { unit: e.target.value })}
                            style={{
                              width: '100%',
                              background: 'var(--input-bg, rgba(255,255,255,0.04))',
                              border: '1px solid var(--glass-border)',
                              borderRadius: '4px',
                              color: 'var(--text-primary)',
                              padding: '4px',
                              fontSize: '0.78rem'
                            }}
                          >
                            <option value="м²" style={{ background: 'var(--dropdown-bg, #1e293b)', color: 'var(--text-primary)' }}>м²</option>
                            <option value="м.пог" style={{ background: 'var(--dropdown-bg, #1e293b)', color: 'var(--text-primary)' }}>м.пог</option>
                            <option value="м.п." style={{ background: 'var(--dropdown-bg, #1e293b)', color: 'var(--text-primary)' }}>м.п.</option>
                            <option value="шт" style={{ background: 'var(--dropdown-bg, #1e293b)', color: 'var(--text-primary)' }}>шт</option>
                            <option value="шт." style={{ background: 'var(--dropdown-bg, #1e293b)', color: 'var(--text-primary)' }}>шт.</option>
                            <option value="компл." style={{ background: 'var(--dropdown-bg, #1e293b)', color: 'var(--text-primary)' }}>компл.</option>
                            <option value="усл." style={{ background: 'var(--dropdown-bg, #1e293b)', color: 'var(--text-primary)' }}>усл.</option>
                            {item.unit && !['м²', 'м.пог', 'м.п.', 'шт', 'шт.', 'компл.', 'усл.'].includes(item.unit) && (
                              <option value={item.unit} style={{ background: 'var(--dropdown-bg, #1e293b)', color: 'var(--text-primary)' }}>{item.unit}</option>
                            )}
                          </select>
                        </td>
                        <td style={{ padding: '6px 10px' }}>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.unitSalePrice || ''}
                            onChange={e => updateSpecItem(idx, { unitSalePrice: parseFloat(e.target.value) || 0 })}
                            style={{
                              width: '100%',
                              textAlign: 'right',
                              background: 'var(--input-bg, rgba(255,255,255,0.04))',
                              border: '1px solid var(--glass-border)',
                              borderRadius: '4px',
                              color: 'var(--text-primary)',
                              padding: '4px 6px',
                              fontWeight: 600
                            }}
                          />
                        </td>
                        <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 700, color: '#16a34a' }}>
                          {(item.totalSalePrice || 0).toLocaleString('ru-RU')} ₽
                        </td>
                        <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => removeSpecItem(idx)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#ef4444',
                              cursor: 'pointer',
                              padding: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              opacity: 0.8
                            }}
                            title="Удалить позицию"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Кнопки действий */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginTop: '4px', flexWrap: 'wrap' }}>
          {onDownloadDocx && (
            <button
              type="button"
              onClick={onDownloadDocx}
              className="btn btn-ghost"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                border: '1px solid var(--glass-border)',
                padding: '9px 16px',
                fontSize: '0.88rem'
              }}
            >
              <FileDown size={16} /> Скачать Договор (DOCX)
            </button>
          )}

          {orderId && (
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="btn btn-primary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                fontWeight: 600,
                fontSize: '0.92rem'
              }}
            >
              <Save size={16} /> {saving ? 'Сохранение...' : 'Сохранить смету в заказ'}
            </button>
          )}
        </div>
      </div>

      {/* Модальное окно выбора товара со склада */}
      {isAddMaterialModalOpen && (
        <div
          className="modal-overlay"
          onClick={() => setIsAddMaterialModalOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            zIndex: 10005
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--modal-bg, var(--card-bg, #1e293b))',
              border: '1px solid var(--glass-border)',
              borderRadius: 'var(--radius-lg)',
              maxWidth: '500px',
              width: '100%',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Box size={18} style={{ color: 'var(--accent-primary)' }} />
                Добавить позицию со склада
              </h3>
              <button
                type="button"
                onClick={() => setIsAddMaterialModalOpen(false)}
                className="btn-icon"
                style={{ fontSize: '1.2rem', padding: '4px' }}
              >
                ✕
              </button>
            </div>

            <div>
              <label style={labelStyle}>Выберите материал или услугу:</label>
              <SearchSelect
                options={allWarehouseOptions}
                value={selectedAddMaterialId}
                placeholder="Поиск по номенклатуре склада..."
                onChange={val => setSelectedAddMaterialId(val ? Number(val) : '')}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button
                type="button"
                onClick={() => setIsAddMaterialModalOpen(false)}
                className="btn btn-ghost"
              >
                Отмена
              </button>
              <button
                type="button"
                disabled={!selectedAddMaterialId}
                onClick={() => {
                  if (selectedAddMaterialId) {
                    addMaterialFromWarehouse(Number(selectedAddMaterialId));
                  }
                }}
                className="btn btn-primary"
                style={{ padding: '8px 18px', fontWeight: 600 }}
              >
                Добавить в смету
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
