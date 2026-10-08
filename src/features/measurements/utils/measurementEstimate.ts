import type { Material } from '../../../api/storage';
import type {
  MeasurementCalculateResponse,
  MeasurementCalculationItemDto,
  MeasurementRoomDto
} from '../../../api/measurements';
import type { EstimationService, EstimationServiceSlot } from '../../../api/estimationServices';

/** Параметры договора заказа, которыми предзаполняется первое помещение нового замера. */
export interface InitialContractParams {
  area?: string | number;
  perimeter?: string | number;
  lightsCount?: string | number;
  pipeCount?: string | number;
  canvasArticle?: string;
}

export interface EstimateTotals {
  totalSalePrice: number;
  /** Себестоимость всех позиций (как считает бэкенд при сохранении замера). */
  totalCostPrice: number;
  /** Затраты на материалы: себестоимость позиций без услуг. */
  materialsCost: number;
  /** Монтаж: услуги по цене продажи — при сохранении сметы это стоимость монтажа заказа. */
  installationPrice: number;
  /** Прибыль как в карточке заказа: итог − затраты на материалы − монтаж. */
  profit: number;
  marginPercent: number;
  totalArea: number;
  totalPerimeter: number;
}

export const PRESET_ROOMS = ['Гостиная', 'Спальня', 'Кухня', 'Прихожая', 'Ванная', 'Санузел', 'Детская', 'Коридор', 'Балкон'];

/** Единицы, которые всегда предлагаются в селекте позиции сметы. */
export const UNIT_OPTIONS = ['м²', 'м.пог', 'шт', 'уп', 'компл'];

export const DEFAULT_ROOM_NAME = 'Гостиная';

const UNIT_ALIASES: [string[], string][] = [
  [['м.п.', 'м.пог.', 'м.пог', 'м/п', 'м/п.', 'пог.м', 'пог. м', 'м', 'м.'], 'м.пог'],
  [['м2', 'м²', 'кв.м', 'кв.м.', 'кв. м', 'кв. м.'], 'м²'],
  [['уп', 'уп.'], 'уп'],
  [['компл', 'компл.', 'к-т'], 'компл'],
  [['рул', 'рул.'], 'рул'],
  [['шт', 'шт.'], 'шт']
];

/** Приводит единицу измерения к одному написанию (м.п., пог.м → м.пог; кв.м → м² и т.д.). */
export const normalizeDisplayUnit = (unit?: string): string => {
  if (!unit) {
    return 'шт';
  }
  const u = unit.trim().toLowerCase();
  return UNIT_ALIASES.find(([aliases]) => aliases.includes(u))?.[1] ?? u;
};

export const roundMoney = (value: number) => Math.round(value * 100) / 100;

/** Пересчитывает суммы позиции по количеству и ценам за единицу. */
export const withTotals = (item: MeasurementCalculationItemDto): MeasurementCalculationItemDto => ({
  ...item,
  totalSalePrice: roundMoney((item.quantity || 0) * (item.unitSalePrice || 0)),
  totalCostPrice: roundMoney((item.quantity || 0) * (item.unitCostPrice || 0))
});

const positive = (value: number) => (!isNaN(value) && value > 0 ? value : 0);
const parseDecimal = (value?: string | number) => (value ? parseFloat(String(value).replace(',', '.')) : 0);
const parseInteger = (value?: string | number) => (value ? parseInt(String(value), 10) : 0);

/** Новое помещение; первое помещение нового замера берет площадь, периметр, светильники и трубы из договора. */
export const createDefaultRoom = (name: string, initialParams?: InitialContractParams): MeasurementRoomDto => ({
  roomName: name,
  area: positive(parseDecimal(initialParams?.area)),
  perimeter: positive(parseDecimal(initialParams?.perimeter)),
  height: 2.7,
  baseCorners: 4,
  extraCorners: 0,
  lightsCount: positive(parseInteger(initialParams?.lightsCount)),
  chandeliersCount: 0,
  tracksLength: 0,
  corniceLength: 0,
  pipesCount: positive(parseInteger(initialParams?.pipeCount)),
  tileLength: 0,
  slotSelections: []
});

/** Название нового помещения: «Помещение N» или шаблон с номером, если такое уже есть. */
export const nextRoomName = (rooms: MeasurementRoomDto[], preset?: string): string => {
  if (!preset) {
    return `Помещение ${rooms.length + 1}`;
  }
  const existingCount = rooms.filter(r => r.roomName === preset || r.roomName.startsWith(`${preset} `)).length;
  return existingCount > 0 ? `${preset} ${existingCount + 1}` : preset;
};

/** Сохраненные позиции: суммы, не совпадающие с количеством × цену, пересчитываются. */
export const normalizeLoadedItems = (items: MeasurementCalculationItemDto[] | undefined): MeasurementCalculationItemDto[] => {
  return (items ?? []).map(it => {
    const expected = withTotals(it);
    return {
      ...it,
      totalCostPrice: it.totalCostPrice != null && Math.abs(it.totalCostPrice - expected.totalCostPrice) < 0.01
        ? it.totalCostPrice
        : expected.totalCostPrice,
      totalSalePrice: it.totalSalePrice != null && Math.abs(it.totalSalePrice - expected.totalSalePrice) < 0.01
        ? it.totalSalePrice
        : expected.totalSalePrice
    };
  });
};

export const findSlot = (services: EstimationService[], slotId: number | undefined): EstimationServiceSlot | undefined => {
  if (!slotId) {
    return undefined;
  }
  for (const service of services) {
    const slot = (service.slots || []).find(s => s.id === slotId);
    if (slot) {
      return slot;
    }
  }
  return undefined;
};

/** Слот позиции: по slotId, иначе по материалу (для позиций, добавленных до появления слотов). */
export const findLinkedSlot = (services: EstimationService[], item: MeasurementCalculationItemDto): EstimationServiceSlot | undefined => {
  const bySlot = findSlot(services, item.slotId);
  if (bySlot || !item.materialId) {
    return bySlot;
  }
  for (const service of services) {
    const slot = (service.slots || []).find(s => (s.materials || []).some(m => m.materialId === item.materialId));
    if (slot) {
      return slot;
    }
  }
  return undefined;
};

/**
 * Позиция пакета работ в помещении: слот пакета и это помещение. Позиции без помещения (из старых замеров)
 * относятся к любому помещению — и при проверке, и при исключении пакета, иначе пакет нельзя было бы выключить.
 */
const isServiceItemInRoom = (item: MeasurementCalculationItemDto, service: EstimationService, roomName: string) =>
  (item.roomName === roomName || !item.roomName)
  && item.slotId != null
  && (service.slots || []).some(s => s.id === item.slotId);

/** Пакет работ включен в помещении, если в смете есть его позиции для этого помещения. */
export const isServiceActiveInRoom = (items: MeasurementCalculationItemDto[], service: EstimationService, roomName: string): boolean =>
  items.some(it => isServiceItemInRoom(it, service, roomName));

/** Позиции сметы без позиций пакета в помещении. */
export const withoutServiceInRoom = (
  items: MeasurementCalculationItemDto[],
  service: EstimationService,
  roomName: string
): MeasurementCalculationItemDto[] => items.filter(it => !isServiceItemInRoom(it, service, roomName));

/** Переносит позиции переименованного помещения на новое название. */
export const renameRoomItems = (items: MeasurementCalculationItemDto[], oldName: string, newName: string): MeasurementCalculationItemDto[] =>
  items.map(it => (it.roomName === oldName ? { ...it, roomName: newName } : it));

/** Количество по базе расчета слота: площадь или периметр помещения с учетом отхода, иначе 1. */
const slotQuantity = (slot: EstimationServiceSlot, room: MeasurementRoomDto): number => {
  const waste = slot.wasteCoefficient || 1.0;
  if (slot.calculationBasis === 'AREA') {
    return roundMoney((room.area || 0) * waste);
  }
  if (slot.calculationBasis === 'PERIMETER') {
    return roundMoney((room.perimeter || 0) * waste);
  }
  return 1;
};

/** Позиции пакета для помещения: по материалу по умолчанию (или первому) каждого слота. */
export const serviceItemsForRoom = (
  service: EstimationService,
  room: MeasurementRoomDto,
  roomName: string,
  materials: Material[]
): MeasurementCalculationItemDto[] => {
  return (service.slots || [])
    .filter(slot => slot.materials && slot.materials.length > 0)
    .map(slot => {
      const defaultMat = slot.materials.find(m => m.isDefault) || slot.materials[0];
      const fullMat = materials.find(m => m.id === defaultMat.materialId);
      const quantity = slotQuantity(slot, room);
      return withTotals({
        materialId: defaultMat.materialId,
        slotId: slot.id,
        name: fullMat?.name || defaultMat.materialName || 'Позиция',
        type: fullMat?.type || defaultMat.type || 'MATERIAL',
        quantity,
        unit: fullMat?.unit || defaultMat.unit || 'шт',
        unitSalePrice: defaultMat.salePrice != null ? defaultMat.salePrice : (fullMat?.salePrice || 0),
        unitCostPrice: defaultMat.costPrice != null ? defaultMat.costPrice : (fullMat?.costPrice || 0),
        totalSalePrice: 0,
        totalCostPrice: 0,
        roomName
      });
    });
};

/**
 * После изменения площади или периметра помещения пересчитывает количество его позиций со слотами,
 * посчитанными от площади или периметра.
 */
export const recalcRoomItems = (
  items: MeasurementCalculationItemDto[],
  services: EstimationService[],
  oldRoom: MeasurementRoomDto,
  updatedRoom: MeasurementRoomDto,
  patch: Partial<MeasurementRoomDto>
): MeasurementCalculationItemDto[] => {
  return items.map(it => {
    if ((it.roomName !== updatedRoom.roomName && it.roomName !== oldRoom.roomName) || !it.slotId) {
      return it;
    }
    const slot = findSlot(services, it.slotId);
    if (!slot) {
      return it;
    }
    const waste = slot.wasteCoefficient || 1.0;
    let quantity = it.quantity;
    if (slot.calculationBasis === 'AREA' && patch.area !== undefined) {
      quantity = roundMoney(patch.area * waste);
    } else if (slot.calculationBasis === 'PERIMETER' && patch.perimeter !== undefined) {
      quantity = roundMoney(patch.perimeter * waste);
    }
    return withTotals({ ...it, roomName: updatedRoom.roomName, quantity });
  });
};

/** Замена материала позиции на альтернативу из того же слота с ценами нового материала. */
export const switchItemMaterial = (
  item: MeasurementCalculationItemDto,
  material: Material,
  services: EstimationService[]
): MeasurementCalculationItemDto => {
  let slotId = item.slotId;
  if (!slotId) {
    for (const service of services) {
      const found = (service.slots || []).find(s => (s.materials || []).some(m => m.materialId === material.id || m.materialId === item.materialId));
      if (found) {
        slotId = found.id;
        break;
      }
    }
  }
  // Суммы считаются минимум от одной единицы, количество позиции не меняется
  const quantity = item.quantity || 1;
  const unitSalePrice = material.salePrice != null ? material.salePrice : (material.costPrice || 0);
  const unitCostPrice = material.costPrice || 0;
  return {
    ...item,
    materialId: material.id,
    slotId,
    name: material.name,
    unit: material.unit || item.unit,
    unitSalePrice,
    unitCostPrice,
    totalSalePrice: roundMoney(quantity * unitSalePrice),
    totalCostPrice: roundMoney(quantity * unitCostPrice)
  };
};

const toNumber = (value: unknown): number => (typeof value === 'number' ? value : parseFloat(String(value)) || 0);

/** Ручное изменение позиции: числа приводятся к number, суммы пересчитываются. */
export const applyItemChange = (
  item: MeasurementCalculationItemDto,
  patch: Partial<MeasurementCalculationItemDto>
): MeasurementCalculationItemDto => {
  const next = { ...item, ...patch };
  return withTotals({
    ...next,
    quantity: toNumber(next.quantity),
    unitSalePrice: toNumber(next.unitSalePrice),
    unitCostPrice: toNumber(next.unitCostPrice)
  });
};

/** Пустая позиция для ручного заполнения. */
export const customItem = (roomName: string): MeasurementCalculationItemDto => ({
  name: 'Дополнительная позиция / работа',
  type: 'SERVICE',
  quantity: 1,
  unit: 'шт',
  unitSalePrice: 0,
  unitCostPrice: 0,
  totalSalePrice: 0,
  totalCostPrice: 0,
  roomName
});

/** Позиция со склада: одна единица по ценам материала. */
export const warehouseItem = (material: Material, roomName: string): MeasurementCalculationItemDto => ({
  materialId: material.id,
  name: material.name,
  type: material.type || 'MATERIAL',
  quantity: 1,
  unit: material.unit || 'шт',
  unitSalePrice: material.salePrice || 0,
  unitCostPrice: material.costPrice || 0,
  totalSalePrice: material.salePrice || 0,
  totalCostPrice: material.costPrice || 0,
  roomName
});

export const estimateTotals = (items: MeasurementCalculationItemDto[], rooms: MeasurementRoomDto[]): EstimateTotals => {
  const totalSalePrice = items.reduce((sum, it) => sum + (it.totalSalePrice || 0), 0);
  const totalCostPrice = items.reduce((sum, it) => sum + (it.totalCostPrice || 0), 0);
  const materialsCost = items
    .filter(it => it.type !== 'SERVICE')
    .reduce((sum, it) => sum + (it.totalCostPrice || 0), 0);
  const installationPrice = items
    .filter(it => it.type === 'SERVICE')
    .reduce((sum, it) => sum + (it.totalSalePrice || 0), 0);
  // Прибыль — в целых рублях, как в карточке заявки и на бэкенде
  const profit = Math.round(totalSalePrice - materialsCost - installationPrice);
  return {
    totalSalePrice,
    totalCostPrice,
    materialsCost,
    installationPrice,
    profit,
    marginPercent: totalSalePrice > 0 ? Math.round((profit / totalSalePrice) * 100) : 0,
    totalArea: rooms.reduce((sum, r) => sum + (r.area || 0), 0),
    totalPerimeter: rooms.reduce((sum, r) => sum + (r.perimeter || 0), 0)
  };
};

const quantityByName = (items: MeasurementCalculationItemDto[], ...keywords: string[]) =>
  items
    .filter(it => keywords.some(k => it.name.toLowerCase().includes(k)))
    .reduce((sum, it) => sum + (it.quantity || 0), 0);

/** Итоги сохраненного замера для заказа (сумма, прибыль, геометрия, светильники, трубы, карнизы). */
export const buildCalculateResponse = (
  items: MeasurementCalculationItemDto[],
  rooms: MeasurementRoomDto[],
  totals: EstimateTotals
): MeasurementCalculateResponse => ({
  totalSalePrice: totals.totalSalePrice,
  totalCostPrice: totals.totalCostPrice,
  expectedProfit: totals.profit,
  profitMarginPercent: totals.marginPercent,
  totalArea: totals.totalArea,
  totalPerimeter: totals.totalPerimeter,
  totalRoomsCount: rooms.length,
  totalLightsCount: quantityByName(items, 'светильник'),
  totalPipesCount: quantityByName(items, 'труб'),
  totalCorniceLength: quantityByName(items, 'карниз', 'ниша'),
  items
});

/** Количество из поля ввода: целое для штук, дробное для остальных единиц, пустое поле — ноль. */
export const parseQuantityInput = (value: string, unit: string): number => {
  if (value === '') {
    return 0;
  }
  return unit === 'шт' ? parseInt(value, 10) || 0 : parseFloat(value) || 0;
};

/** Смена единицы; при переходе на штуки количество округляется. */
export const unitChange = (item: MeasurementCalculationItemDto, unit: string): Partial<MeasurementCalculationItemDto> =>
  unit === 'шт' ? { unit, quantity: Math.round(item.quantity || 0) } : { unit };
