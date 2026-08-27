import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus,
  Trash2,
  Save,
  FileDown,
  ChevronDown,
  ChevronUp,
  Ruler,
  Package,
  Lightbulb,
  Minus,
  RefreshCw,
  Box
} from 'lucide-react';
import type { Material } from '../api/storage';
import {
  getMeasurementByOrderId,
  calculateOrderMeasurement,
  calculateStandaloneMeasurement,
  saveOrderMeasurement,
  type MeasurementDto,
  type MeasurementRoomDto,
  type MeasurementCalculationItemDto,
  type MeasurementCalculateResponse
} from '../api/measurements';

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
  const [calculating, setCalculating] = useState<boolean>(false);
  const [calcResult, setCalcResult] = useState<MeasurementCalculateResponse | null>(null);
  const [showSpecDetails, setShowSpecDetails] = useState<boolean>(true); // По умолчанию открыта детализация

  // Интерактивные строки сметы
  const [customItems, setCustomItems] = useState<MeasurementCalculationItemDto[]>([]);
  const [isManualEditMode, setIsManualEditMode] = useState<boolean>(false);
  const [isAddMaterialModalOpen, setIsAddMaterialModalOpen] = useState<boolean>(false);
  const [selectedAddMaterialId, setSelectedAddMaterialId] = useState<number | ''>('');

  // Фильтруем материалы склада по типам
  const canvasMaterials = materials.filter(m => {
    const n = m.name.toLowerCase();
    return (m.type === 'MATERIAL' || !m.type) && (n.includes('полотно') || n.includes('msd') || n.includes('мат') || n.includes('глян') || n.includes('сатин') || n.includes('ткань') || n.includes('descor') || n.includes('clipso') || m.unit === 'м²');
  });

  const profileMaterials = materials.filter(m => {
    const n = m.name.toLowerCase();
    return (m.type === 'MATERIAL' || !m.type) && (n.includes('профиль') || n.includes('багет') || n.includes('пвх') || n.includes('алюмин') || n.includes('теневой') || n.includes('парящий') || m.unit === 'м.п.' || m.unit === 'м');
  });

  const insertMaterials = materials.filter(m => {
    const n = m.name.toLowerCase();
    return (m.type === 'MATERIAL' || !m.type) && (n.includes('вставка') || n.includes('заглушка') || n.includes('лента') || n.includes('маскиров'));
  });

  const corniceMaterials = materials.filter(m => {
    const n = m.name.toLowerCase();
    return n.includes('карниз') || n.includes('пк-5') || n.includes('пк5') || n.includes('пк-14') || n.includes('пк14') || n.includes('гардин') || n.includes('ниша') || n.includes('брус');
  });

  // Загрузка сохраненного замера
  useEffect(() => {
    if (orderId) {
      setLoading(true);
      getMeasurementByOrderId(orderId)
        .then(dto => {
          if (dto && dto.rooms && dto.rooms.length > 0) {
            setRooms(dto.rooms);
            setNotes(dto.notes || '');
          } else {
            setRooms([createDefaultRoom('Гостиная')]);
          }
        })
        .catch(err => {
          console.error('Ошибка загрузки замера:', err);
          setRooms([createDefaultRoom('Гостиная')]);
        })
        .finally(() => setLoading(false));
    } else {
      setRooms([createDefaultRoom('Гостиная')]);
    }
  }, [orderId]);

  function createDefaultRoom(name: string): MeasurementRoomDto {
    return {
      roomName: name,
      area: 15,
      perimeter: 16,
      height: 2.7,
      baseCorners: 4,
      extraCorners: 0,
      canvasMaterialId: canvasMaterials[0]?.id,
      profileMaterialId: profileMaterials[0]?.id,
      insertMaterialId: insertMaterials[0]?.id,
      lightsCount: 0,
      chandeliersCount: 1,
      tracksLength: 0,
      corniceLength: 0,
      corniceType: 'ПК-14',
      pipesCount: 0,
      tileLength: 0
    };
  }

  // Live calculation с дебаунсом
  const debounceTimerRef = useRef<any>(null);

  const performCalculation = useCallback((currentRooms: MeasurementRoomDto[]) => {
    if (currentRooms.length === 0) {
      setCalcResult(null);
      setCustomItems([]);
      return;
    }

    setCalculating(true);
    const req = { rooms: currentRooms };

    const promise = orderId
      ? calculateOrderMeasurement(orderId, req)
      : calculateStandaloneMeasurement(req);

    promise
      .then(res => {
        setCalcResult(res);
        if (!isManualEditMode) {
          setCustomItems(res.items || []);
        }
      })
      .catch(err => {
        console.error('Ошибка расчета сметы:', err);
      })
      .finally(() => {
        setCalculating(false);
      });
  }, [orderId, isManualEditMode]);

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      performCalculation(rooms);
    }, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [rooms, performCalculation]);

  const updateRoom = (idx: number, patch: Partial<MeasurementRoomDto>) => {
    setRooms(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
  };

  const addRoom = (presetName?: string) => {
    const newName = presetName || `Помещение ${rooms.length + 1}`;
    setRooms(prev => [...prev, createDefaultRoom(newName)]);
    setActiveRoomIdx(rooms.length);
  };

  const removeRoom = (idx: number) => {
    if (rooms.length <= 1) return;
    setRooms(prev => prev.filter((_, i) => i !== idx));
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
    const currentRoomName = rooms[activeRoomIdx]?.roomName || 'Помещение 1';
    const newItem: MeasurementCalculationItemDto = {
      name: 'Дополнительная позиция / работа',
      type: 'SERVICE',
      quantity: 1,
      unit: 'шт.',
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
    const currentRoomName = rooms[activeRoomIdx]?.roomName || 'Помещение 1';
    const newItem: MeasurementCalculationItemDto = {
      materialId: mat.id,
      name: mat.name,
      type: mat.type || 'MATERIAL',
      quantity: 1,
      unit: mat.unit || 'шт.',
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

  const resetToAutoCalculated = () => {
    setIsManualEditMode(false);
    performCalculation(rooms);
  };

  // Вычисляем итоговые суммы по активным строкам сметы (customItems)
  const effectiveTotalSalePrice = customItems.reduce((sum, it) => sum + (it.totalSalePrice || 0), 0);
  const effectiveTotalCostPrice = customItems.reduce((sum, it) => sum + (it.totalCostPrice || 0), 0);
  const effectiveProfit = effectiveTotalSalePrice - effectiveTotalCostPrice;
  const effectiveMarginPercent = effectiveTotalSalePrice > 0
    ? Math.round((effectiveProfit / effectiveTotalSalePrice) * 100)
    : 0;

  const handleSave = async () => {
    if (!orderId) return;
    setSaving(true);
    try {
      const dto: MeasurementDto = {
        orderId,
        notes,
        rooms
      };
      const saved = await saveOrderMeasurement(orderId, dto);

      // Формируем результирующий ответ с актуальными строками сметы
      const effectiveResponse: MeasurementCalculateResponse = {
        totalSalePrice: effectiveTotalSalePrice,
        totalCostPrice: effectiveTotalCostPrice,
        expectedProfit: effectiveProfit,
        profitMarginPercent: effectiveMarginPercent,
        totalArea: calcResult?.totalArea || rooms.reduce((sum, r) => sum + (r.area || 0), 0),
        totalPerimeter: calcResult?.totalPerimeter || rooms.reduce((sum, r) => sum + (r.perimeter || 0), 0),
        totalRoomsCount: rooms.length,
        totalLightsCount: rooms.reduce((sum, r) => sum + (r.lightsCount || 0), 0),
        totalPipesCount: rooms.reduce((sum, r) => sum + (r.pipesCount || 0), 0),
        totalCorniceLength: rooms.reduce((sum, r) => sum + (r.corniceLength || 0), 0),
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

  const currentRoom = rooms[activeRoomIdx] || rooms[0];

  const darkInputStyle: React.CSSProperties = {
    width: '100%',
    height: '38px',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-primary)',
    padding: '0 12px',
    fontSize: '0.9rem',
    outline: 'none',
    boxSizing: 'border-box'
  };

  const selectStyle: React.CSSProperties = {
    ...darkInputStyle,
    cursor: 'pointer',
    appearance: 'auto'
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
                background: isActive ? 'linear-gradient(135deg, var(--accent-primary), var(--accent-hover))' : 'rgba(255, 255, 255, 0.04)',
                color: isActive ? '#ffffff' : 'var(--text-primary)',
                border: '1px solid ' + (isActive ? 'var(--accent-primary)' : 'var(--glass-border)'),
                fontWeight: isActive ? 600 : 400,
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
                background: isActive ? 'rgba(0, 0, 0, 0.25)' : 'rgba(255, 255, 255, 0.08)',
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
            border: '1px dashed var(--glass-border)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.85rem',
            color: 'var(--accent-primary)',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            flexShrink: 0
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
            onClick={() => {
              if (rooms.length === 1 && rooms[0].roomName === 'Гостиная' && rooms[0].area === 15) {
                updateRoom(0, { roomName: preset });
              } else {
                addRoom(preset);
              }
            }}
            style={{
              fontSize: '0.76rem',
              padding: '3px 9px',
              borderRadius: '6px',
              background: 'rgba(255, 255, 255, 0.04)',
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
          background: 'rgba(255, 255, 255, 0.02)',
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
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(59, 130, 246, 0.4)'
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
                  style={{ ...darkInputStyle, fontWeight: 700, fontSize: '1.05rem', color: '#4ade80' }}
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
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: 'var(--radius-sm)',
                  overflow: 'hidden'
                }}>
                  <button
                    type="button"
                    onClick={() => updateRoom(activeRoomIdx, { extraCorners: Math.max(0, (currentRoom.extraCorners || 0) - 1) })}
                    style={{ width: '36px', height: '100%', background: 'rgba(255,255,255,0.06)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Minus size={13} />
                  </button>
                  <input
                    type="number"
                    min="0"
                    value={currentRoom.extraCorners || 0}
                    onChange={e => updateRoom(activeRoomIdx, { extraCorners: parseInt(e.target.value) || 0 })}
                    style={{ flex: 1, height: '100%', border: 'none', background: 'transparent', color: '#fff', textAlign: 'center', fontWeight: 600, fontSize: '0.92rem', outline: 'none' }}
                  />
                  <button
                    type="button"
                    onClick={() => updateRoom(activeRoomIdx, { extraCorners: (currentRoom.extraCorners || 0) + 1 })}
                    style={{ width: '36px', height: '100%', background: 'rgba(255,255,255,0.06)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Plus size={13} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Выбор материалов со склада */}
          <div>
            <div style={sectionHeaderStyle}>
              <Package size={15} style={{ color: '#fbbf24' }} />
              Материалы со склада
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '12px'
            }}>
              {/* Полотно */}
              <div>
                <label style={labelStyle}>Фактура полотна</label>
                <select
                  value={currentRoom.canvasMaterialId || ''}
                  onChange={e => updateRoom(activeRoomIdx, { canvasMaterialId: e.target.value ? Number(e.target.value) : undefined })}
                  style={selectStyle}
                >
                  <option value="" style={{ background: '#1e293b', color: '#f8fafc' }}>— Без полотна со склада —</option>
                  {canvasMaterials.map(m => (
                    <option key={m.id} value={m.id} style={{ background: '#1e293b', color: '#f8fafc' }}>
                      {m.name} ({m.salePrice} ₽/{m.unit}) {m.quantityInStock ? `• ост: ${m.quantityInStock} ${m.unit}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Профиль */}
              <div>
                <label style={labelStyle}>Тип профиля (багет)</label>
                <select
                  value={currentRoom.profileMaterialId || ''}
                  onChange={e => updateRoom(activeRoomIdx, { profileMaterialId: e.target.value ? Number(e.target.value) : undefined })}
                  style={selectStyle}
                >
                  <option value="" style={{ background: '#1e293b', color: '#f8fafc' }}>— Стандартный профиль —</option>
                  {profileMaterials.map(m => (
                    <option key={m.id} value={m.id} style={{ background: '#1e293b', color: '#f8fafc' }}>
                      {m.name} ({m.salePrice} ₽/{m.unit}) {m.quantityInStock ? `• ост: ${m.quantityInStock} ${m.unit}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Вставка / маскировочная лента */}
              <div>
                <label style={labelStyle}>Вставка / маскировочная лента</label>
                <select
                  value={currentRoom.insertMaterialId || ''}
                  onChange={e => updateRoom(activeRoomIdx, { insertMaterialId: e.target.value ? Number(e.target.value) : undefined })}
                  style={selectStyle}
                >
                  <option value="" style={{ background: '#1e293b', color: '#f8fafc' }}>— Без вставки —</option>
                  {insertMaterials.map(m => (
                    <option key={m.id} value={m.id} style={{ background: '#1e293b', color: '#f8fafc' }}>
                      {m.name} ({m.salePrice} ₽/{m.unit}) {m.quantityInStock ? `• ост: ${m.quantityInStock} ${m.unit}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 3. Дополнительные опции и работы */}
          <div>
            <div style={sectionHeaderStyle}>
              <Lightbulb size={15} style={{ color: '#60a5fa' }} />
              Освещение и доп. работы
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '12px'
            }}>
              {/* Точечные светильники */}
              <div style={{
                background: 'rgba(255,255,255,0.02)',
                padding: '10px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--glass-border)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}>
                <span style={labelStyle}>Светильники (шт.)</span>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  height: '36px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: 'var(--radius-sm)',
                  overflow: 'hidden'
                }}>
                  <button
                    type="button"
                    onClick={() => updateRoom(activeRoomIdx, { lightsCount: Math.max(0, (currentRoom.lightsCount || 0) - 1) })}
                    style={{ width: '32px', height: '100%', background: 'rgba(255,255,255,0.06)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Minus size={13} />
                  </button>
                  <input
                    type="number"
                    min="0"
                    value={currentRoom.lightsCount || 0}
                    onChange={e => updateRoom(activeRoomIdx, { lightsCount: parseInt(e.target.value) || 0 })}
                    style={{ flex: 1, height: '100%', border: 'none', background: 'transparent', color: '#fff', textAlign: 'center', fontWeight: 600, fontSize: '0.92rem', outline: 'none' }}
                  />
                  <button
                    type="button"
                    onClick={() => updateRoom(activeRoomIdx, { lightsCount: (currentRoom.lightsCount || 0) + 1 })}
                    style={{ width: '32px', height: '100%', background: 'rgba(255,255,255,0.06)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Plus size={13} />
                  </button>
                </div>
              </div>

              {/* Люстры */}
              <div style={{
                background: 'rgba(255,255,255,0.02)',
                padding: '10px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--glass-border)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}>
                <span style={labelStyle}>Люстры (шт.)</span>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  height: '36px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: 'var(--radius-sm)',
                  overflow: 'hidden'
                }}>
                  <button
                    type="button"
                    onClick={() => updateRoom(activeRoomIdx, { chandeliersCount: Math.max(0, (currentRoom.chandeliersCount || 0) - 1) })}
                    style={{ width: '32px', height: '100%', background: 'rgba(255,255,255,0.06)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Minus size={13} />
                  </button>
                  <input
                    type="number"
                    min="0"
                    value={currentRoom.chandeliersCount || 0}
                    onChange={e => updateRoom(activeRoomIdx, { chandeliersCount: parseInt(e.target.value) || 0 })}
                    style={{ flex: 1, height: '100%', border: 'none', background: 'transparent', color: '#fff', textAlign: 'center', fontWeight: 600, fontSize: '0.92rem', outline: 'none' }}
                  />
                  <button
                    type="button"
                    onClick={() => updateRoom(activeRoomIdx, { chandeliersCount: (currentRoom.chandeliersCount || 0) + 1 })}
                    style={{ width: '32px', height: '100%', background: 'rgba(255,255,255,0.06)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Plus size={13} />
                  </button>
                </div>
              </div>

              {/* Обводы труб */}
              <div style={{
                background: 'rgba(255,255,255,0.02)',
                padding: '10px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--glass-border)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}>
                <span style={labelStyle}>Обводы труб (шт.)</span>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  height: '36px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: 'var(--radius-sm)',
                  overflow: 'hidden'
                }}>
                  <button
                    type="button"
                    onClick={() => updateRoom(activeRoomIdx, { pipesCount: Math.max(0, (currentRoom.pipesCount || 0) - 1) })}
                    style={{ width: '32px', height: '100%', background: 'rgba(255,255,255,0.06)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Minus size={13} />
                  </button>
                  <input
                    type="number"
                    min="0"
                    value={currentRoom.pipesCount || 0}
                    onChange={e => updateRoom(activeRoomIdx, { pipesCount: parseInt(e.target.value) || 0 })}
                    style={{ flex: 1, height: '100%', border: 'none', background: 'transparent', color: '#fff', textAlign: 'center', fontWeight: 600, fontSize: '0.92rem', outline: 'none' }}
                  />
                  <button
                    type="button"
                    onClick={() => updateRoom(activeRoomIdx, { pipesCount: (currentRoom.pipesCount || 0) + 1 })}
                    style={{ width: '32px', height: '100%', background: 'rgba(255,255,255,0.06)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Plus size={13} />
                  </button>
                </div>
              </div>

              {/* Карнизы / ниши */}
              <div style={{
                background: 'rgba(255,255,255,0.02)',
                padding: '10px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--glass-border)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '6px'
              }}>
                <span style={labelStyle}>Ниша / карниз (м.п.)</span>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="0.0"
                    value={currentRoom.corniceLength || ''}
                    onChange={e => updateRoom(activeRoomIdx, { corniceLength: parseFloat(e.target.value) || 0 })}
                    style={{ ...darkInputStyle, width: '65px', flexShrink: 0, padding: '0 8px' }}
                  />
                  <select
                    value={currentRoom.corniceType || 'ПК-14'}
                    onChange={e => updateRoom(activeRoomIdx, { corniceType: e.target.value })}
                    style={{ ...selectStyle, fontSize: '0.8rem', padding: '0 6px' }}
                  >
                    <option value="ПК-14" style={{ background: '#1e293b', color: '#f8fafc' }}>ПК-14</option>
                    <option value="ПК-5" style={{ background: '#1e293b', color: '#f8fafc' }}>ПК-5</option>
                    <option value="Гардина" style={{ background: '#1e293b', color: '#f8fafc' }}>Гардина</option>
                    <option value="Брус" style={{ background: '#1e293b', color: '#f8fafc' }}>Брус</option>
                    {corniceMaterials.map(m => (
                      <option key={m.id} value={m.name} style={{ background: '#1e293b', color: '#f8fafc' }}>
                        {m.name} ({m.salePrice} ₽/{m.unit})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Керамогранит / сложные стены */}
              <div style={{
                background: 'rgba(255,255,255,0.02)',
                padding: '10px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--glass-border)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}>
                <span style={labelStyle}>Керамогранит (м.п.)</span>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="0.0"
                  value={currentRoom.tileLength || ''}
                  onChange={e => updateRoom(activeRoomIdx, { tileLength: parseFloat(e.target.value) || 0 })}
                  style={darkInputStyle}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Заметки замерщика */}
      <div>
        <label style={labelStyle}>
          📝 Заметки замерщика / особенности монтажа
        </label>
        <textarea
          rows={3}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Особые указания монтажникам, тип проводки, скрытые коммуникации..."
          style={{
            width: '100%',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid var(--glass-border)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-primary)',
            padding: '10px 12px',
            fontSize: '0.88rem',
            outline: 'none',
            resize: 'vertical',
            boxSizing: 'border-box'
          }}
        />
      </div>

      {/* 4. Плавающий блок итогов и ИНТЕРАКТИВНАЯ ТАБЛИЦА СМЕТЫ */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.12), rgba(16, 185, 129, 0.08))',
        border: '1px solid rgba(59, 130, 246, 0.3)',
        borderRadius: 'var(--radius-lg)',
        padding: '18px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: 600 }}>
              ИТОГОВАЯ СМЕТА {calculating && <span style={{ color: 'var(--accent-primary)', textTransform: 'none' }}>• пересчет...</span>}
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#4ade80', letterSpacing: '-0.5px' }}>
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
            background: 'rgba(0, 0, 0, 0.25)',
            padding: '8px 14px',
            borderRadius: '8px',
            flexWrap: 'wrap'
          }}>
            <div>
              <span>Общая площадь: </span>
              <strong style={{ color: 'var(--text-primary)' }}>{calcResult?.totalArea || rooms.reduce((s, r) => s + (r.area || 0), 0)} м²</strong>
            </div>
            <div>
              <span>Периметр: </span>
              <strong style={{ color: 'var(--text-primary)' }}>{calcResult?.totalPerimeter || rooms.reduce((s, r) => s + (r.perimeter || 0), 0)} м.п.</strong>
            </div>
            <div>
              <span>Светильников: </span>
              <strong style={{ color: 'var(--text-primary)' }}>{rooms.reduce((s, r) => s + (r.lightsCount || 0), 0)} шт.</strong>
            </div>
          </div>

          {/* Финансовые показатели (только для canViewFinances) */}
          {canViewFinances && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              background: 'rgba(0, 0, 0, 0.35)',
              padding: '8px 14px',
              borderRadius: '8px',
              fontSize: '0.84rem'
            }}>
              <div>
                <span style={{ color: 'var(--text-secondary)' }}>Себестоимость: </span>
                <strong style={{ color: '#e2e8f0' }}>{effectiveTotalCostPrice.toLocaleString('ru-RU')} ₽</strong>
              </div>
              <div style={{ borderLeft: '1px solid rgba(255,255,255,0.15)', paddingLeft: '12px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Прибыль: </span>
                <strong style={{ color: '#60a5fa' }}>{effectiveProfit.toLocaleString('ru-RU')} ₽</strong>
                {effectiveMarginPercent > 0 && (
                  <span style={{ marginLeft: '4px', opacity: 0.85, color: '#93c5fd' }}>
                    ({effectiveMarginPercent}%)
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Заголовок с кнопками добавления и сброса */}
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
              <span style={{ fontSize: '0.72rem', background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', padding: '2px 8px', borderRadius: '6px', fontWeight: 600 }}>
                Ручные правки
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
                background: 'rgba(59, 130, 246, 0.15)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                color: '#60a5fa',
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
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid var(--glass-border)',
                color: 'var(--text-primary)',
                fontSize: '0.82rem',
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              <Plus size={14} /> + Своя позиция
            </button>

            {isManualEditMode && (
              <button
                type="button"
                onClick={resetToAutoCalculated}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  background: 'transparent',
                  border: '1px dashed rgba(245, 158, 11, 0.4)',
                  color: '#fbbf24',
                  fontSize: '0.82rem',
                  cursor: 'pointer'
                }}
                title="Сбросить ручные правки и вернуть авторасчет по комнатам"
              >
                <RefreshCw size={13} /> Авторасчет
              </button>
            )}
          </div>
        </div>

        {/* Раскрытая интерактивная таблица сметы */}
        {showSpecDetails && (
          <div style={{
            background: 'rgba(0, 0, 0, 0.35)',
            borderRadius: '8px',
            overflowX: 'auto',
            border: '1px solid var(--glass-border)'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
              <thead>
                <tr style={{ background: 'rgba(255, 255, 255, 0.06)', color: 'var(--text-secondary)', textAlign: 'left' }}>
                  <th style={{ padding: '8px 10px', width: '35px' }}>#</th>
                  <th style={{ padding: '8px 10px' }}>Наименование позиции / услуги</th>
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
                      Нет позиций в смете. Введите размеры комнат или добавьте позиции кнопками выше.
                    </td>
                  </tr>
                ) : (
                  customItems.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                      <td style={{ padding: '6px 10px', color: 'var(--text-secondary)', fontWeight: 600 }}>{idx + 1}</td>
                      <td style={{ padding: '6px 10px' }}>
                        <input
                          type="text"
                          value={item.name}
                          onChange={e => updateSpecItem(idx, { name: e.target.value })}
                          style={{
                            width: '100%',
                            background: 'rgba(255,255,255,0.03)',
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
                      </td>
                      <td style={{ padding: '6px 10px' }}>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={item.quantity}
                          onChange={e => updateSpecItem(idx, { quantity: parseFloat(e.target.value) || 0 })}
                          style={{
                            width: '100%',
                            textAlign: 'center',
                            background: 'rgba(255,255,255,0.04)',
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
                          value={item.unit || 'шт.'}
                          onChange={e => updateSpecItem(idx, { unit: e.target.value })}
                          style={{
                            width: '100%',
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid var(--glass-border)',
                            borderRadius: '4px',
                            color: 'var(--text-primary)',
                            padding: '4px',
                            fontSize: '0.78rem'
                          }}
                        >
                          <option value="м²" style={{ background: '#1e293b', color: '#f8fafc' }}>м²</option>
                          <option value="м.п." style={{ background: '#1e293b', color: '#f8fafc' }}>м.п.</option>
                          <option value="шт." style={{ background: '#1e293b', color: '#f8fafc' }}>шт.</option>
                          <option value="компл." style={{ background: '#1e293b', color: '#f8fafc' }}>компл.</option>
                          <option value="услуга" style={{ background: '#1e293b', color: '#f8fafc' }}>услуга</option>
                        </select>
                      </td>
                      <td style={{ padding: '6px 10px' }}>
                        <input
                          type="number"
                          step="1"
                          min="0"
                          value={item.unitSalePrice || ''}
                          onChange={e => updateSpecItem(idx, { unitSalePrice: parseFloat(e.target.value) || 0 })}
                          style={{
                            width: '100%',
                            textAlign: 'right',
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid var(--glass-border)',
                            borderRadius: '4px',
                            color: 'var(--text-primary)',
                            padding: '4px 6px',
                            fontWeight: 600
                          }}
                        />
                      </td>
                      <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 700, color: '#4ade80' }}>
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
                  ))
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
            background: 'rgba(0,0,0,0.7)',
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
              background: 'var(--card-bg, #1a1f2c)',
              border: '1px solid var(--glass-border)',
              borderRadius: 'var(--radius-lg)',
              maxWidth: '500px',
              width: '100%',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
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
              <select
                value={selectedAddMaterialId}
                onChange={e => setSelectedAddMaterialId(e.target.value ? Number(e.target.value) : '')}
                style={{ ...selectStyle, height: '44px', fontSize: '0.92rem' }}
              >
                <option value="" style={{ background: '#1e293b', color: '#f8fafc' }}>— Выберите из номенклатуры склада —</option>
                {materials.map(m => (
                  <option key={m.id} value={m.id} style={{ background: '#1e293b', color: '#f8fafc' }}>
                    {m.name} ({m.salePrice} ₽/{m.unit}) {m.quantityInStock ? `• ост: ${m.quantityInStock} ${m.unit}` : ''}
                  </option>
                ))}
              </select>
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
