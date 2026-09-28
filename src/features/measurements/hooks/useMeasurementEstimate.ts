import { useEffect, useRef, useState } from 'react';
import type { Material } from '../../../api/storage';
import {
  getMeasurementByOrderId,
  saveOrderMeasurement,
  type MeasurementCalculateResponse,
  type MeasurementCalculationItemDto,
  type MeasurementDto,
  type MeasurementRoomDto
} from '../../../api/measurements';
import { getActiveEstimationServices, type EstimationService } from '../../../api/estimationServices';
import { toast } from '../../../utils/toast';
import { getErrorMessage } from '../../../utils/errorMessage';
import {
  DEFAULT_ROOM_NAME,
  applyItemChange,
  buildCalculateResponse,
  createDefaultRoom,
  customItem,
  estimateTotals,
  isServiceActiveInRoom,
  nextRoomName,
  normalizeLoadedItems,
  recalcRoomItems,
  serviceItemsForRoom,
  switchItemMaterial,
  warehouseItem,
  withoutServiceInRoom,
  type InitialContractParams
} from '../utils/measurementEstimate';

interface UseMeasurementEstimateOptions {
  orderId?: number;
  initialContractParams?: InitialContractParams;
  /** Материалы для пакетов работ и замены материала позиции. */
  serviceMaterials: Material[];
  /** Номенклатура склада для добавления позиций. */
  warehouseMaterials: Material[];
  onSaved?: (savedMeasurement: MeasurementDto, calculated: MeasurementCalculateResponse) => void;
}

/**
 * Состояние мастера замера: помещения, пакеты работ, позиции сметы и их итоги; загрузка сохраненного замера
 * заказа и сохранение сметы в заказ.
 */
export const useMeasurementEstimate = ({
  orderId,
  initialContractParams,
  serviceMaterials,
  warehouseMaterials,
  onSaved
}: UseMeasurementEstimateOptions) => {
  const initialParamsRef = useRef(initialContractParams);
  initialParamsRef.current = initialContractParams;

  const [rooms, setRooms] = useState<MeasurementRoomDto[]>([]);
  const [notes, setNotes] = useState('');
  const [activeRoomIdx, setActiveRoomIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [services, setServices] = useState<EstimationService[]>([]);
  const [items, setItems] = useState<MeasurementCalculationItemDto[]>([]);
  const [isManualEditMode, setIsManualEditMode] = useState(false);

  // Загрузка пакетов работ и сохраненной сметы (только при смене заказа)
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    Promise.all([
      getActiveEstimationServices().catch(() => [] as EstimationService[]),
      orderId ? getMeasurementByOrderId(orderId).catch(() => null) : Promise.resolve(null)
    ]).then(([loadedServices, dto]) => {
      if (!isMounted) {
        return;
      }
      setServices(loadedServices);
      setRooms(dto?.rooms && dto.rooms.length > 0 ? dto.rooms : [createDefaultRoom(DEFAULT_ROOM_NAME, initialParamsRef.current)]);
      setNotes(dto?.notes || '');
      // Смета нового замера пуста, пока не выбран пакет работ; у сохраненного восстанавливаются позиции
      setItems(normalizeLoadedItems(dto?.items));
      setLoading(false);
    }).catch(err => {
      console.error('Ошибка инициализации замера:', err);
      if (isMounted) {
        setRooms([createDefaultRoom(DEFAULT_ROOM_NAME, initialParamsRef.current)]);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [orderId]);

  const currentRoom: MeasurementRoomDto | undefined = rooms[activeRoomIdx] || rooms[0];

  const isServiceActive = (service: EstimationService) =>
    isServiceActiveInRoom(items, service, currentRoom?.roomName || DEFAULT_ROOM_NAME);

  /** Включает пакет работ в смету текущего помещения или исключает его. */
  const toggleService = (service: EstimationService) => {
    if (!currentRoom) {
      return;
    }
    setIsManualEditMode(true);
    const roomName = currentRoom.roomName || DEFAULT_ROOM_NAME;
    if (isServiceActive(service)) {
      setItems(prev => withoutServiceInRoom(prev, service, roomName));
    } else {
      const added = serviceItemsForRoom(service, currentRoom, roomName, serviceMaterials);
      setItems(prev => [...prev, ...added]);
    }
  };

  /** Изменение помещения; при смене площади или периметра пересчитываются зависящие от них позиции. */
  const updateRoom = (idx: number, patch: Partial<MeasurementRoomDto>) => {
    const oldRoom = rooms[idx];
    const updated = { ...oldRoom, ...patch };
    setRooms(prev => prev.map((room, i) => (i === idx ? { ...room, ...patch } : room)));
    const geometryChanged = (patch.area !== undefined && patch.area !== oldRoom.area)
      || (patch.perimeter !== undefined && patch.perimeter !== oldRoom.perimeter);
    if (geometryChanged) {
      setItems(prev => recalcRoomItems(prev, services, oldRoom, updated, patch));
    }
  };

  const addRoom = (preset?: string) => {
    setRooms(prev => [...prev, createDefaultRoom(nextRoomName(rooms, preset))]);
    setActiveRoomIdx(rooms.length);
  };

  /** Удаляет помещение вместе с его позициями сметы; последнее помещение удалить нельзя. */
  const removeRoom = (idx: number) => {
    if (rooms.length <= 1) {
      return;
    }
    const removed = rooms[idx];
    setRooms(prev => prev.filter((_, i) => i !== idx));
    setItems(prev => prev.filter(it => it.roomName !== removed.roomName));
    if (activeRoomIdx >= idx && activeRoomIdx > 0) {
      setActiveRoomIdx(activeRoomIdx - 1);
    }
  };

  const updateItem = (index: number, patch: Partial<MeasurementCalculationItemDto>) => {
    setIsManualEditMode(true);
    setItems(prev => prev.map((it, i) => (i === index ? applyItemChange(it, patch) : it)));
  };

  const removeItem = (index: number) => {
    setIsManualEditMode(true);
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const switchItemMaterialTo = (index: number, materialId: number) => {
    setIsManualEditMode(true);
    const material = serviceMaterials.find(m => m.id === materialId);
    if (!material) {
      return;
    }
    const item = items[index];
    setItems(prev => prev.map((it, i) => (i === index ? switchItemMaterial(item, material, services) : it)));
  };

  const roomNameForNewItem = () => currentRoom?.roomName || 'Помещение 1';

  const addCustomItem = () => {
    setIsManualEditMode(true);
    setItems(prev => [...prev, customItem(roomNameForNewItem())]);
    toast.success('Добавлена новая позиция');
  };

  /** Добавляет позицию со склада; возвращает false, если материал не найден. */
  const addWarehouseItem = (materialId: number): boolean => {
    const material = warehouseMaterials.find(m => m.id === materialId);
    if (!material) {
      return false;
    }
    setIsManualEditMode(true);
    setItems(prev => [...prev, warehouseItem(material, roomNameForNewItem())]);
    toast.success(`Добавлено со склада: ${material.name}`);
    return true;
  };

  const totals = estimateTotals(items, rooms);

  const save = async () => {
    if (!orderId) {
      return;
    }
    setSaving(true);
    try {
      const dto: MeasurementDto = {
        orderId,
        notes,
        rooms,
        items,
        totalPrice: totals.totalSalePrice,
        totalCostPrice: totals.totalCostPrice
      };
      const saved = await saveOrderMeasurement(orderId, dto);
      onSaved?.(saved, buildCalculateResponse(items, rooms, totals));
    } catch (err) {
      console.error('Не удалось сохранить замер', err);
      toast.error('Ошибка при сохранении замера: ' + getErrorMessage(err, 'неизвестная ошибка'));
    } finally {
      setSaving(false);
    }
  };

  return {
    loading,
    saving,
    rooms,
    currentRoom,
    activeRoomIdx,
    setActiveRoomIdx,
    addRoom,
    removeRoom,
    updateRoom,
    notes,
    setNotes,
    services,
    isServiceActive,
    toggleService,
    items,
    isManualEditMode,
    updateItem,
    removeItem,
    switchItemMaterial: switchItemMaterialTo,
    addCustomItem,
    addWarehouseItem,
    totals,
    save
  };
};

export type MeasurementEstimate = ReturnType<typeof useMeasurementEstimate>;
