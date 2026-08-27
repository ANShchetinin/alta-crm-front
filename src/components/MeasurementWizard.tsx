import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus,
  Trash2,
  Save,
  FileDown,
  ChevronDown,
  ChevronUp
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
            // Создаем первую комнату по умолчанию
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
      <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Загрузка параметров замера...
      </div>
    );
  }

  const currentRoom = rooms[activeRoomIdx] || rooms[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* 1. Навигация по комнатам (Табы) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        overflowX: 'auto',
        paddingBottom: '4px'
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
                background: isActive ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.05)',
                color: isActive ? '#ffffff' : 'var(--text-primary)',
                border: '1px solid ' + (isActive ? 'var(--accent-primary)' : 'var(--glass-border)'),
                fontWeight: isActive ? 600 : 400,
                fontSize: '0.88rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
            >
              <span>{room.roomName || `Помещение ${idx + 1}`}</span>
              <span style={{
                fontSize: '0.75rem',
                opacity: 0.8,
                background: isActive ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                padding: '1px 6px',
                borderRadius: '10px'
              }}>
                {room.area || 0} м²
              </span>
            </button>
          );
        })}

        {/* Быстрое добавление комнат */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '4px' }}>
          <button
            type="button"
            onClick={() => addRoom()}
            className="btn btn-ghost"
            style={{
              padding: '8px 12px',
              borderRadius: 'var(--radius-md)',
              border: '1px dashed var(--glass-border)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.85rem',
              color: 'var(--accent-primary)'
            }}
          >
            <Plus size={15} /> Добавить
          </button>
        </div>
      </div>

      {/* Быстрые пресеты для добавления */}
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
              padding: '2px 8px',
              borderRadius: '6px',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid var(--glass-border)',
              color: 'var(--text-secondary)',
              cursor: 'pointer'
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
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          {/* Заголовок комнаты и удаление */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, maxWidth: '300px' }}>
              <input
                type="text"
                value={currentRoom.roomName}
                onChange={e => updateRoom(activeRoomIdx, { roomName: e.target.value })}
                placeholder="Название помещения"
                style={{
                  fontSize: '1.05rem',
                  fontWeight: 600,
                  background: 'rgba(0,0,0,0.2)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  color: 'var(--text-primary)',
                  width: '100%'
                }}
              />
            </div>

            {rooms.length > 1 && (
              <button
                type="button"
                onClick={() => removeRoom(activeRoomIdx)}
                className="btn-icon"
                style={{ color: '#ef4444', padding: '6px' }}
                title="Удалить это помещение"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>

          {/* 1. Блок геометрических размеров */}
          <div>
            <div style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              📐 Геометрия помещения
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: '10px'
            }}>
              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Площадь (м²)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={currentRoom.area || ''}
                  onChange={e => updateRoom(activeRoomIdx, { area: parseFloat(e.target.value) || 0 })}
                  className="form-control"
                  style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--accent-primary)' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Периметр (м.п.)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={currentRoom.perimeter || ''}
                  onChange={e => updateRoom(activeRoomIdx, { perimeter: parseFloat(e.target.value) || 0 })}
                  className="form-control"
                  style={{ fontWeight: 600 }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Высота стен (м)
                </label>
                <input
                  type="number"
                  step="0.05"
                  min="1"
                  value={currentRoom.height || 2.7}
                  onChange={e => updateRoom(activeRoomIdx, { height: parseFloat(e.target.value) || 2.7 })}
                  className="form-control"
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Доп. углы (&gt;4)
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <button
                    type="button"
                    onClick={() => updateRoom(activeRoomIdx, { extraCorners: Math.max(0, (currentRoom.extraCorners || 0) - 1) })}
                    style={{ padding: '6px 10px', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--glass-border)', borderRadius: '4px', color: '#fff', cursor: 'pointer' }}
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="0"
                    value={currentRoom.extraCorners || 0}
                    onChange={e => updateRoom(activeRoomIdx, { extraCorners: parseInt(e.target.value) || 0 })}
                    className="form-control"
                    style={{ textAlign: 'center', fontWeight: 600 }}
                  />
                  <button
                    type="button"
                    onClick={() => updateRoom(activeRoomIdx, { extraCorners: (currentRoom.extraCorners || 0) + 1 })}
                    style={{ padding: '6px 10px', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--glass-border)', borderRadius: '4px', color: '#fff', cursor: 'pointer' }}
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Выбор материалов со склада */}
          <div>
            <div style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              📦 Материалы со склада
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '10px'
            }}>
              {/* Полотно */}
              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Фактура полотна
                </label>
                <select
                  value={currentRoom.canvasMaterialId || ''}
                  onChange={e => updateRoom(activeRoomIdx, { canvasMaterialId: e.target.value ? Number(e.target.value) : undefined })}
                  className="form-control"
                  style={{ width: '100%' }}
                >
                  <option value="">— Без полотна со склада —</option>
                  {canvasMaterials.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.salePrice} ₽/{m.unit}) {m.quantityInStock ? `— ост: ${m.quantityInStock} ${m.unit}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Профиль */}
              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Тип профиля (багет)
                </label>
                <select
                  value={currentRoom.profileMaterialId || ''}
                  onChange={e => updateRoom(activeRoomIdx, { profileMaterialId: e.target.value ? Number(e.target.value) : undefined })}
                  className="form-control"
                  style={{ width: '100%' }}
                >
                  <option value="">— Стандартный профиль —</option>
                  {profileMaterials.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.salePrice} ₽/{m.unit})
                    </option>
                  ))}
                </select>
              </div>

              {/* Вставка / маскировочная лента */}
              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Вставка / маскировочная лента
                </label>
                <select
                  value={currentRoom.insertMaterialId || ''}
                  onChange={e => updateRoom(activeRoomIdx, { insertMaterialId: e.target.value ? Number(e.target.value) : undefined })}
                  className="form-control"
                  style={{ width: '100%' }}
                >
                  <option value="">— Без декоративной вставки —</option>
                  {insertMaterials.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.salePrice} ₽/{m.unit})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 3. Дополнительные опции и работы */}
          <div>
            <div style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              💡 Освещение и доп. работы
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '10px'
            }}>
              {/* Точечные светильники */}
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--glass-border)' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Светильники (шт.)</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                  <button
                    type="button"
                    onClick={() => updateRoom(activeRoomIdx, { lightsCount: Math.max(0, (currentRoom.lightsCount || 0) - 1) })}
                    style={{ padding: '4px 8px', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--glass-border)', borderRadius: '4px', color: '#fff', cursor: 'pointer' }}
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="0"
                    value={currentRoom.lightsCount || 0}
                    onChange={e => updateRoom(activeRoomIdx, { lightsCount: parseInt(e.target.value) || 0 })}
                    className="form-control"
                    style={{ textAlign: 'center', fontWeight: 600 }}
                  />
                  <button
                    type="button"
                    onClick={() => updateRoom(activeRoomIdx, { lightsCount: (currentRoom.lightsCount || 0) + 1 })}
                    style={{ padding: '4px 8px', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--glass-border)', borderRadius: '4px', color: '#fff', cursor: 'pointer' }}
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Люстры */}
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--glass-border)' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Люстры (шт.)</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                  <button
                    type="button"
                    onClick={() => updateRoom(activeRoomIdx, { chandeliersCount: Math.max(0, (currentRoom.chandeliersCount || 0) - 1) })}
                    style={{ padding: '4px 8px', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--glass-border)', borderRadius: '4px', color: '#fff', cursor: 'pointer' }}
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="0"
                    value={currentRoom.chandeliersCount || 0}
                    onChange={e => updateRoom(activeRoomIdx, { chandeliersCount: parseInt(e.target.value) || 0 })}
                    className="form-control"
                    style={{ textAlign: 'center', fontWeight: 600 }}
                  />
                  <button
                    type="button"
                    onClick={() => updateRoom(activeRoomIdx, { chandeliersCount: (currentRoom.chandeliersCount || 0) + 1 })}
                    style={{ padding: '4px 8px', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--glass-border)', borderRadius: '4px', color: '#fff', cursor: 'pointer' }}
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Обводы труб */}
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--glass-border)' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Обводы труб (шт.)</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                  <button
                    type="button"
                    onClick={() => updateRoom(activeRoomIdx, { pipesCount: Math.max(0, (currentRoom.pipesCount || 0) - 1) })}
                    style={{ padding: '4px 8px', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--glass-border)', borderRadius: '4px', color: '#fff', cursor: 'pointer' }}
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="0"
                    value={currentRoom.pipesCount || 0}
                    onChange={e => updateRoom(activeRoomIdx, { pipesCount: parseInt(e.target.value) || 0 })}
                    className="form-control"
                    style={{ textAlign: 'center', fontWeight: 600 }}
                  />
                  <button
                    type="button"
                    onClick={() => updateRoom(activeRoomIdx, { pipesCount: (currentRoom.pipesCount || 0) + 1 })}
                    style={{ padding: '4px 8px', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--glass-border)', borderRadius: '4px', color: '#fff', cursor: 'pointer' }}
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Карнизы / ниши */}
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--glass-border)' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Ниша / карниз (м.п.)</span>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="0.0"
                  value={currentRoom.corniceLength || ''}
                  onChange={e => updateRoom(activeRoomIdx, { corniceLength: parseFloat(e.target.value) || 0 })}
                  className="form-control"
                  style={{ marginTop: '4px' }}
                />
              </div>

              {/* Керамогранит / сложные стены */}
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--glass-border)' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Керамогранит (м.п.)</span>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="0.0"
                  value={currentRoom.tileLength || ''}
                  onChange={e => updateRoom(activeRoomIdx, { tileLength: parseFloat(e.target.value) || 0 })}
                  className="form-control"
                  style={{ marginTop: '4px' }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Заметки замерщика */}
      <div>
        <label style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
          📝 Заметки замерщика / особенности монтажа
        </label>
        <textarea
          rows={2}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Особые указания монтажникам, тип проводки, скрытые коммуникации..."
          className="form-control"
          style={{ width: '100%', resize: 'vertical' }}
        />
      </div>

      {/* 4. Плавающий блок итогов (Live Calculation) */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.12), rgba(16, 185, 129, 0.08))',
        border: '1px solid rgba(59, 130, 246, 0.3)',
        borderRadius: 'var(--radius-lg)',
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Итоговая смета {calculating && <span style={{ color: 'var(--accent-primary)' }}>• пересчет...</span>}
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#4ade80' }}>
              {calcResult?.totalSalePrice != null ? `${calcResult.totalSalePrice.toLocaleString('ru-RU')} ₽` : '0 ₽'}
            </div>
          </div>

          {/* Сводка геометрии */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
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
              background: 'rgba(0, 0, 0, 0.25)',
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '0.82rem'
            }}>
              <div>
                <span style={{ color: 'var(--text-secondary)' }}>Себестоимость: </span>
                <strong>{calcResult.totalCostPrice?.toLocaleString('ru-RU')} ₽</strong>
              </div>
              <div style={{ borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '12px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Прибыль: </span>
                <strong style={{ color: '#60a5fa' }}>{calcResult.expectedProfit?.toLocaleString('ru-RU')} ₽</strong>
                <span style={{ marginLeft: '4px', opacity: 0.8 }}>({calcResult.profitMarginPercent}%)</span>
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
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: 0
            }}
          >
            {showSpecDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {showSpecDetails ? 'Скрыть детализацию позиций сметы' : `Показать детализацию позиций (${calcResult?.items?.length || 0})`}
          </button>

          {showSpecDetails && calcResult?.items && (
            <div style={{
              marginTop: '10px',
              background: 'rgba(0, 0, 0, 0.3)',
              borderRadius: '8px',
              overflow: 'hidden',
              border: '1px solid var(--glass-border)'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-secondary)', textAlign: 'left' }}>
                    <th style={{ padding: '8px 10px', width: '30px' }}>#</th>
                    <th style={{ padding: '8px 10px' }}>Наименование позиции</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center' }}>Кол-во</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>Цена</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>Сумма</th>
                  </tr>
                </thead>
                <tbody>
                  {calcResult.items.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.03)' }}>
                      <td style={{ padding: '6px 10px', color: 'var(--text-secondary)' }}>{idx + 1}</td>
                      <td style={{ padding: '6px 10px' }}>
                        <div>{item.name}</div>
                        {item.roomName && (
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{item.roomName}</span>
                        )}
                      </td>
                      <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                        {item.quantity} {item.unit}
                      </td>
                      <td style={{ padding: '6px 10px', textAlign: 'right' }}>
                        {item.unitSalePrice?.toLocaleString('ru-RU')} ₽
                      </td>
                      <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 600, color: '#4ade80' }}>
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
                border: '1px solid var(--glass-border)'
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
                gap: '6px',
                padding: '10px 18px',
                fontWeight: 600
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
