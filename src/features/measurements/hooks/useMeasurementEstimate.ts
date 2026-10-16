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
import { getOrderById } from '../../../api/kanban';
import { toast } from '../../../utils/toast';
import { confirm } from '../../../utils/confirm';
import { getErrorMessage, isConflictError } from '../../../utils/errorMessage';
import {
  DEFAULT_ROOM_NAME,
  applyItemChange,
  buildCalculateResponse,
  createDefaultRoom,
  customItem,
  estimateSaveWarning,
  estimateTotals,
  isServiceActiveInRoom,
  nextRoomName,
  normalizeLoadedItems,
  recalcRoomItems,
  renameRoomItems,
  serviceItemsForRoom,
  switchItemMaterial,
  warehouseItem,
  withoutServiceInRoom,
  type InitialContractParams,
  type OrderAmounts
} from '../utils/measurementEstimate';

interface UseMeasurementEstimateOptions {
  orderId?: number;
  initialContractParams?: InitialContractParams;
  /** Номенклатура склада: материалы пакетов работ, замена материала позиции и добавление со склада. */
  materials: Material[];
  onSaved?: (savedMeasurement: MeasurementDto, calculated: MeasurementCalculateResponse) => void;
}

/**
 * Состояние мастера замера: помещения, пакеты работ, позиции сметы и их итоги; загрузка сохраненного замера
 * заказа и сохранение сметы в заказ.
 */
export const useMeasurementEstimate = ({
  orderId,
  initialContractParams,
  materials,
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
  const [loadFailed, setLoadFailed] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  // Сумма сметы, сохраненной в заказ: если сумма заказа с ней совпадает, ее задает смета, а не ручной ввод
  const savedEstimateTotalRef = useRef(0);
  // Версия открытого замера: бэкенд отклоняет сохранение поверх чужих изменений (409)
  const versionRef = useRef<number | undefined>(undefined);

  // Загрузка пакетов работ и сохраненной сметы (при смене заказа и по кнопке «Повторить»)
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setLoadFailed(false);

    // Без пакетов работ мастер работает (смета вручную), а без сохраненного замера — нет: его нельзя перезаписать
    // пустой сметой. Бэкенд отвечает пустым замером, если его еще нет, поэтому ошибка здесь — сбой загрузки.
    Promise.all([
      getActiveEstimationServices().catch(() => [] as EstimationService[]),
      orderId ? getMeasurementByOrderId(orderId) : Promise.resolve(null)
    ]).then(([loadedServices, dto]) => {
      if (!isMounted) {
        return;
      }
      setServices(loadedServices);
      setRooms(dto?.rooms && dto.rooms.length > 0 ? dto.rooms : [createDefaultRoom(DEFAULT_ROOM_NAME, initialParamsRef.current)]);
      setNotes(dto?.notes || '');
      versionRef.current = dto?.version;
      // Смета нового замера пуста, пока не выбран пакет работ; у сохраненного восстанавливаются позиции
      const loadedItems = normalizeLoadedItems(dto?.items);
      setItems(loadedItems);
      savedEstimateTotalRef.current = estimateTotals(loadedItems, []).totalSalePrice;
      setLoading(false);
    }).catch(err => {
      console.error('Ошибка загрузки замера:', err);
      if (isMounted) {
        setLoadFailed(true);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [orderId, loadAttempt]);

  const retryLoad = () => setLoadAttempt(attempt => attempt + 1);

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
      const added = serviceItemsForRoom(service, currentRoom, roomName, materials);
      setItems(prev => [...prev, ...added]);
    }
  };

  /**
   * Изменение помещения. Позиции сметы привязаны к помещению по названию, поэтому при переименовании
   * они переходят на новое название; при смене площади, периметра или параметров помещения пересчитываются
   * зависящие от них позиции (слоты, привязанные к параметру).
   */
  const updateRoom = (idx: number, patch: Partial<MeasurementRoomDto>) => {
    const oldRoom = rooms[idx];
    const updated = { ...oldRoom, ...patch };
    setRooms(prev => prev.map((room, i) => (i === idx ? { ...room, ...patch } : room)));
    if (patch.roomName !== undefined && patch.roomName !== oldRoom.roomName) {
      setItems(prev => renameRoomItems(prev, oldRoom.roomName, updated.roomName));
    }
    const geometryChanged = (patch.area !== undefined && patch.area !== oldRoom.area)
      || (patch.perimeter !== undefined && patch.perimeter !== oldRoom.perimeter)
      || patch.paramValues !== undefined;
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
    const material = materials.find(m => m.id === materialId);
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
    const material = materials.find(m => m.id === materialId);
    if (!material) {
      return false;
    }
    setIsManualEditMode(true);
    setItems(prev => [...prev, warehouseItem(material, roomNameForNewItem())]);
    toast.success(`Добавлено со склада: ${material.name}`);
    return true;
  };

  const totals = estimateTotals(items, rooms);

  /**
   * Подтверждение, если смета уменьшит сумму, введенную вручную, или обнулит остаток. Суммы берутся из заказа
   * на сервере — от них бэкенд и пересчитает остаток. Если заказ прочитать не удалось, сохранение не блокируется.
   */
  const confirmTotalChange = async (targetOrderId: number): Promise<boolean> => {
    let order: OrderAmounts;
    try {
      order = await getOrderById(targetOrderId);
    } catch (err) {
      console.error('Не удалось прочитать суммы заказа перед сохранением сметы', err);
      return true;
    }
    const warning = estimateSaveWarning(totals.totalSalePrice, order, savedEstimateTotalRef.current);
    return !warning || confirm({ title: 'Изменить сумму заказа?', message: warning, confirmText: 'Сохранить смету', cancelText: 'Вернуться' });
  };

  /**
   * Замер уже сохранил кто-то другой: предлагается загрузить его версию. Если отказаться, правки остаются
   * на экране (их можно переписать), но сохранить их поверх чужих нельзя, пока замер не загружен заново.
   */
  const offerReloadAfterConflict = async () => {
    const reload = await confirm({
      title: 'Замер уже изменили',
      message: 'Пока вы редактировали, замер сохранил другой пользователь. Загрузить его версию? '
        + 'Ваши несохраненные изменения пропадут.',
      confirmText: 'Загрузить',
      cancelText: 'Остаться'
    });
    if (reload) {
      retryLoad();
    }
  };

  const save = async () => {
    if (!orderId || loadFailed) {
      return;
    }
    setSaving(true);
    try {
      if (!(await confirmTotalChange(orderId))) {
        return;
      }
      const dto: MeasurementDto = {
        orderId,
        notes,
        rooms,
        items,
        totalPrice: totals.totalSalePrice,
        totalCostPrice: totals.totalCostPrice,
        version: versionRef.current
      };
      const saved = await saveOrderMeasurement(orderId, dto);
      versionRef.current = saved.version;
      savedEstimateTotalRef.current = totals.totalSalePrice;
      onSaved?.(saved, buildCalculateResponse(items, rooms, totals));
    } catch (err) {
      if (isConflictError(err)) {
        await offerReloadAfterConflict();
        return;
      }
      console.error('Не удалось сохранить замер', err);
      toast.error('Ошибка при сохранении замера: ' + getErrorMessage(err, 'неизвестная ошибка'));
    } finally {
      setSaving(false);
    }
  };

  return {
    loading,
    loadFailed,
    retryLoad,
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
