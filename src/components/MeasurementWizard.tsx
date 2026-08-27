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
  Minus
} from 'lucide-react';
import type { Material } from '../api/storage';
import {
  getMeasurementByOrderId,
  calculateOrderMeasurement,
  calculateStandaloneMeasurement,
  saveOrderMeasurement,
  type MeasurementDto,
  type MeasurementRoomDto,
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
  const [showSpecDetails, setShowSpecDetails] = useState<boolean>(false);

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
      pipesCount: 0,
      tileLength: 0
    };
  }

  // Live calculation с дебаунсом
  const debounceTimerRef = useRef<any>(null);

  const performCalculation = useCallback((currentRooms: MeasurementRoomDto[]) => {
    if (currentRooms.length === 0) {
      setCalcResult(null);
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
      })
      .catch(err => {
        console.error('Ошибка расчета сметы:', err);
      })
      .finally(() => {
        setCalculating(false);
      });
  }, [orderId]);

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
      if (calcResult && onSaved) {
        onSaved(saved, calcResult);
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

  // Стили общих инпутов
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
            onMouseEnter={e => {
              (e.currentTarget.style as any).borderColor = 'var(--accent-primary)';
              (e.currentTarget.style as any).color = 'var(--text-primary)';
            }}
            onMouseLeave={e => {
              (e.currentTarget.style as any).borderColor = 'var(--glass-border)';
              (e.currentTarget.style as any).color = 'var(--text-secondary)';
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
                justifyContent: 'space-between'
              }}>
                <span style={labelStyle}>Ниша / карниз (м.п.)</span>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="0.0"
                  value={currentRoom.corniceLength || ''}
                  onChange={e => updateRoom(activeRoomIdx, { corniceLength: parseFloat(e.target.value) || 0 })}
                  style={darkInputStyle}
                />
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

      {/* 4. Плавающий блок итогов (Live Calculation) */}
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
              {calcResult?.totalSalePrice != null ? `${calcResult.totalSalePrice.toLocaleString('ru-RU')} ₽` : '0 ₽'}
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
              <strong style={{ color: 'var(--text-primary)' }}>{calcResult?.totalArea || 0} м²</strong>
            </div>
            <div>
              <span>Периметр: </span>
              <strong style={{ color: 'var(--text-primary)' }}>{calcResult?.totalPerimeter || 0} м.п.</strong>
            </div>
            <div>
              <span>Светильников: </span>
              <strong style={{ color: 'var(--text-primary)' }}>{calcResult?.totalLightsCount || 0} шт.</strong>
            </div>
          </div>

          {/* Финансовые показатели (только для canViewFinances) */}
          {canViewFinances && calcResult && (
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
                <strong style={{ color: '#e2e8f0' }}>{calcResult.totalCostPrice?.toLocaleString('ru-RU')} ₽</strong>
              </div>
              <div style={{ borderLeft: '1px solid rgba(255,255,255,0.15)', paddingLeft: '12px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Прибыль: </span>
                <strong style={{ color: '#60a5fa' }}>{calcResult.expectedProfit?.toLocaleString('ru-RU')} ₽</strong>
                {calcResult.profitMarginPercent != null && !isNaN(calcResult.profitMarginPercent) && (
                  <span style={{ marginLeft: '4px', opacity: 0.85, color: '#93c5fd' }}>
                    ({calcResult.profitMarginPercent}%)
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Раскрывающийся аккордеон с деталями сметы */}
        <div>
          <button
            type="button"
            onClick={() => setShowSpecDetails(prev => !prev)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--accent-primary)',
              fontSize: '0.84rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: 0
            }}
          >
            {showSpecDetails ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            {showSpecDetails ? 'Скрыть детализацию позиций сметы' : `Показать детализацию позиций (${calcResult?.items?.length || 0})`}
          </button>

          {showSpecDetails && calcResult?.items && (
            <div style={{
              marginTop: '12px',
              background: 'rgba(0, 0, 0, 0.35)',
              borderRadius: '8px',
              overflowX: 'auto',
              border: '1px solid var(--glass-border)'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(255, 255, 255, 0.06)', color: 'var(--text-secondary)', textAlign: 'left' }}>
                    <th style={{ padding: '8px 12px', width: '35px' }}>#</th>
                    <th style={{ padding: '8px 12px' }}>Наименование позиции</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center' }}>Кол-во</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>Цена</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>Сумма</th>
                  </tr>
                </thead>
                <tbody>
                  {calcResult.items.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                      <td style={{ padding: '7px 12px', color: 'var(--text-secondary)' }}>{idx + 1}</td>
                      <td style={{ padding: '7px 12px' }}>
                        <div style={{ color: 'var(--text-primary)' }}>{item.name}</div>
                        {item.roomName && (
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{item.roomName}</span>
                        )}
                      </td>
                      <td style={{ padding: '7px 12px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        {item.quantity} {item.unit}
                      </td>
                      <td style={{ padding: '7px 12px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                        {item.unitSalePrice?.toLocaleString('ru-RU')} ₽
                      </td>
                      <td style={{ padding: '7px 12px', textAlign: 'right', fontWeight: 600, color: '#4ade80' }}>
                        {item.totalSalePrice?.toLocaleString('ru-RU')} ₽
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

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
    </div>
  );
};
