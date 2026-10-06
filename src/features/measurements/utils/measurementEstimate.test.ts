import { describe, it, expect } from 'vitest';
import type { MeasurementCalculationItemDto, MeasurementRoomDto } from '../../../api/measurements';
import type { EstimationService } from '../../../api/estimationServices';
import type { Material } from '../../../api/storage';
import {
  applyItemChange,
  buildCalculateResponse,
  createDefaultRoom,
  estimateTotals,
  findLinkedSlot,
  isServiceActiveInRoom,
  nextRoomName,
  normalizeDisplayUnit,
  normalizeLoadedItems,
  parseQuantityInput,
  recalcRoomItems,
  renameRoomItems,
  serviceItemsForRoom,
  switchItemMaterial,
  unitChange,
  withoutServiceInRoom
} from './measurementEstimate';

const service: EstimationService = {
  id: 1,
  name: 'Потолок',
  isActive: true,
  slots: [
    {
      id: 10,
      name: 'Полотно',
      slotType: 'DROPDOWN',
      calculationBasis: 'AREA',
      wasteCoefficient: 1.05,
      isRequired: true,
      materials: [
        { materialId: 100, materialName: 'MSD', unit: 'м²', salePrice: 500, costPrice: 200, isDefault: true },
        { materialId: 101, materialName: 'Pongs', unit: 'м²', salePrice: 700, costPrice: 300 }
      ]
    },
    {
      id: 11,
      name: 'Профиль',
      slotType: 'DROPDOWN',
      calculationBasis: 'PERIMETER',
      wasteCoefficient: 1,
      isRequired: true,
      materials: [{ materialId: 200, materialName: 'Профиль ПВХ', unit: 'м', salePrice: 100, costPrice: 40 }]
    },
    { id: 12, name: 'Пусто', slotType: 'DROPDOWN', calculationBasis: 'COUNT', wasteCoefficient: 1, isRequired: false, materials: [] }
  ]
} as unknown as EstimationService;

const room = (fields: Partial<MeasurementRoomDto> = {}): MeasurementRoomDto => ({ ...createDefaultRoom('Кухня'), area: 10, perimeter: 13, ...fields });
const item = (fields: Partial<MeasurementCalculationItemDto>): MeasurementCalculationItemDto => ({
  name: 'Позиция',
  type: 'MATERIAL',
  quantity: 1,
  unit: 'шт',
  unitSalePrice: 0,
  unitCostPrice: 0,
  totalSalePrice: 0,
  totalCostPrice: 0,
  ...fields
});

describe('measurementEstimate', () => {
  it('normalizes unit spellings', () => {
    expect(normalizeDisplayUnit(undefined)).toBe('шт');
    expect(normalizeDisplayUnit(' М.П. ')).toBe('м.пог');
    expect(normalizeDisplayUnit('кв.м')).toBe('м²');
    expect(normalizeDisplayUnit('к-т')).toBe('компл');
    expect(normalizeDisplayUnit('кг')).toBe('кг');
  });

  it('prefills the first room from contract params and ignores invalid values', () => {
    const first = createDefaultRoom('Гостиная', { area: '20,5', perimeter: 18, lightsCount: '6', pipeCount: 'abc' });

    expect(first).toMatchObject({ roomName: 'Гостиная', area: 20.5, perimeter: 18, lightsCount: 6, pipesCount: 0, height: 2.7 });
    expect(createDefaultRoom('Спальня')).toMatchObject({ area: 0, perimeter: 0, lightsCount: 0 });
  });

  it('numbers new rooms and repeated presets', () => {
    const rooms = [room({ roomName: 'Кухня' }), room({ roomName: 'Спальня' })];

    expect(nextRoomName(rooms)).toBe('Помещение 3');
    expect(nextRoomName(rooms, 'Спальня')).toBe('Спальня 2');
    expect(nextRoomName(rooms, 'Балкон')).toBe('Балкон');
  });

  it('recalculates saved totals that do not match quantity × price', () => {
    const [fixed, kept] = normalizeLoadedItems([
      item({ quantity: 2, unitSalePrice: 100, unitCostPrice: 30, totalSalePrice: 999, totalCostPrice: 60 }),
      item({ quantity: 1.5, unitSalePrice: 10, totalSalePrice: 15 })
    ]);

    expect(fixed).toMatchObject({ totalSalePrice: 200, totalCostPrice: 60 });
    expect(kept.totalSalePrice).toBe(15);
    expect(normalizeLoadedItems(undefined)).toEqual([]);
  });

  it('builds service items from default materials, area and perimeter with waste', () => {
    const items = serviceItemsForRoom(service, room(), 'Кухня', [{ id: 200, name: 'Профиль стеновой', unit: 'м.п.' } as Material]);

    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ materialId: 100, slotId: 10, name: 'MSD', quantity: 10.5, totalSalePrice: 5250, totalCostPrice: 2100, roomName: 'Кухня' });
    expect(items[1]).toMatchObject({ materialId: 200, name: 'Профиль стеновой', unit: 'м.п.', quantity: 13, totalSalePrice: 1300 });
  });

  it('detects and removes a service in a room', () => {
    const items = [item({ slotId: 10, roomName: 'Кухня' }), item({ slotId: 10, roomName: 'Спальня' }), item({ roomName: 'Кухня' })];

    expect(isServiceActiveInRoom(items, service, 'Кухня')).toBe(true);
    expect(isServiceActiveInRoom(items, service, 'Ванная')).toBe(false);
    expect(withoutServiceInRoom(items, service, 'Кухня').map(i => i.roomName)).toEqual(['Спальня', 'Кухня']);
  });

  it('turns off a service whose items have no room (older measurements)', () => {
    const items = [item({ slotId: 10 }), item({ slotId: 11, roomName: 'Спальня' })];

    expect(isServiceActiveInRoom(items, service, 'Кухня')).toBe(true);
    expect(withoutServiceInRoom(items, service, 'Кухня').map(i => i.slotId)).toEqual([11]);
  });

  it('moves the items of a renamed room to the new name', () => {
    const items = [item({ roomName: 'Кухня' }), item({ roomName: 'Спальня' }), item({})];

    expect(renameRoomItems(items, 'Кухня', 'Кухня-гостиная').map(i => i.roomName)).toEqual(['Кухня-гостиная', 'Спальня', undefined]);
  });

  it('recalculates area- and perimeter-based items of the changed room only', () => {
    const items = [
      item({ slotId: 10, roomName: 'Кухня', quantity: 10.5, unitSalePrice: 500 }),
      item({ slotId: 11, roomName: 'Кухня', quantity: 13, unitSalePrice: 100 }),
      item({ slotId: 10, roomName: 'Спальня', quantity: 5, unitSalePrice: 500 }),
      item({ roomName: 'Кухня', quantity: 3 })
    ];
    const old = room();

    const result = recalcRoomItems(items, [service], old, { ...old, area: 20 }, { area: 20 });

    expect(result.map(i => i.quantity)).toEqual([21, 13, 5, 3]);
    expect(result[0].totalSalePrice).toBe(10500);
  });

  it('finds the slot of an item by slot id or by material', () => {
    expect(findLinkedSlot([service], item({ slotId: 11 }))?.name).toBe('Профиль');
    expect(findLinkedSlot([service], item({ materialId: 101 }))?.name).toBe('Полотно');
    expect(findLinkedSlot([service], item({ materialId: 999 }))).toBeUndefined();
  });

  it('switches the material with its prices and keeps the quantity', () => {
    const switched = switchItemMaterial(
      item({ materialId: 100, quantity: 4, unit: 'м²' }),
      { id: 101, name: 'Pongs', salePrice: 700, costPrice: 300 } as Material,
      [service]
    );

    expect(switched).toMatchObject({ materialId: 101, slotId: 10, name: 'Pongs', unit: 'м²', quantity: 4, totalSalePrice: 2800, totalCostPrice: 1200 });
  });

  it('applies manual changes and recalculates totals', () => {
    const changed = applyItemChange(item({ quantity: 2, unitSalePrice: 100, unitCostPrice: 40 }), { quantity: 3 });

    expect(changed).toMatchObject({ quantity: 3, totalSalePrice: 300, totalCostPrice: 120 });
  });

  it('parses quantity input by unit and rounds when switching to pieces', () => {
    expect(parseQuantityInput('', 'м²')).toBe(0);
    expect(parseQuantityInput('2.7', 'шт')).toBe(2);
    expect(parseQuantityInput('2.75', 'м²')).toBe(2.75);
    expect(unitChange(item({ quantity: 2.6 }), 'шт')).toEqual({ unit: 'шт', quantity: 3 });
    expect(unitChange(item({ quantity: 2.6 }), 'м²')).toEqual({ unit: 'м²' });
  });

  it('sums totals and builds the order summary', () => {
    const items = [
      item({ name: 'Светильник GX53', quantity: 6, totalSalePrice: 3000, totalCostPrice: 1200 }),
      item({ name: 'Обвод трубы', quantity: 2, totalSalePrice: 1000, totalCostPrice: 800 })
    ];
    const rooms = [room({ area: 10, perimeter: 13 }), room({ area: 5.5, perimeter: 9 })];

    const totals = estimateTotals(items, rooms);
    const response = buildCalculateResponse(items, rooms, totals);

    expect(totals).toMatchObject({ totalSalePrice: 4000, totalCostPrice: 2000, profit: 2000, marginPercent: 50, totalArea: 15.5, totalPerimeter: 22 });
    expect(response).toMatchObject({ totalRoomsCount: 2, totalLightsCount: 6, totalPipesCount: 2, totalCorniceLength: 0 });
  });

  it('counts services as installation, not as materials cost, like the order card', () => {
    const items = [
      item({ name: 'Полотно', type: 'MATERIAL', totalSalePrice: 10000, totalCostPrice: 4000 }),
      item({ name: 'Монтаж полотна', type: 'SERVICE', totalSalePrice: 3000, totalCostPrice: 1500 })
    ];

    const totals = estimateTotals(items, []);

    // прибыль = 13000 − 4000 (материалы) − 3000 (монтаж по цене услуг); себестоимость услуги не учитывается
    expect(totals).toMatchObject({ totalSalePrice: 13000, materialsCost: 4000, installationPrice: 3000, profit: 6000, marginPercent: 46 });
  });
});
