import { describe, it, expect } from 'vitest';
import {
  applyMeasurementToForm,
  buildContractOrderPayload,
  buildOrderPayload,
  calcOrderProfitability,
  createEmptyOrderForm,
  hasActAttachment,
  orderToFormData,
  resolveContractParams,
  specItemsFromMeasurement
} from './orderForm';
import type { Order } from '../../../api/kanban';
import type { MeasurementCalculateResponse } from '../../../api/measurements';

const order: Order = {
  id: 5,
  clientId: 10,
  statusId: 2,
  address: 'Москва',
  description: 'Потолок',
  totalPrice: 50000,
  prepayment: 20000,
  installationPrice: 10000,
  installationDate: '2026-10-01T00:00:00',
  measurementDate: '2026-09-30T14:30:00',
  installedById: 7,
  installedByName: 'Олег'
};

describe('orderForm', () => {
  it('creates an empty form with the first status and default contract params', () => {
    const form = createEmptyOrderForm(3, ['Монтаж']);

    expect(form.statusId).toBe('3');
    expect(form.contractParams?.area).toBe('70,3');
    expect(form.contractParams?.actChecklist).toEqual([{ id: 'tpl_1', name: 'Монтаж', checked: false }]);
    expect(createEmptyOrderForm(undefined).statusId).toBe('');
  });

  it('maps an order to form values and restores the missing remainder', () => {
    const form = orderToFormData(order);

    expect(form).toMatchObject({
      clientId: '10',
      statusId: '2',
      totalPrice: '50000',
      prepayment: '20000',
      remainder: '30000',
      installationPrice: '10000',
      installationDate: '2026-10-01',
      measurementDate: '2026-09-30T14:30'
    });
  });

  it('turns a legacy single installer into the lead of the installers list', () => {
    expect(orderToFormData(order).installers).toEqual([
      expect.objectContaining({ employeeId: 7, employeeName: 'Олег', isLead: true, amount: 10000, sharePercent: 100 })
    ]);
  });

  it('keeps saved contract params and fills defaults for missing lists', () => {
    const form = orderToFormData({ ...order, contractParams: { area: '12', contractDate: '2026-01-02' } });

    expect(form.contractParams).toMatchObject({ area: '12', contractDate: '2026-01-02', specItems: [], customParams: {} });
  });

  it('builds the save payload and stamps installedAt only for a completed status without it', () => {
    const form = orderToFormData(order);
    const params = resolveContractParams(form.contractParams);

    const payload = buildOrderPayload(form, params, false);
    expect(payload).toMatchObject({
      clientId: 10,
      statusId: 2,
      totalPrice: 50000,
      remainder: 30000,
      installationDate: '2026-10-01T00:00:00',
      measurementDate: '2026-09-30T14:30:00',
      installedById: 7
    });
    expect(payload.installedAt).toBeUndefined();
    expect(buildOrderPayload(form, params, true).installedAt).toEqual(expect.any(String));
    expect(buildOrderPayload({ ...form, installedAt: '2026-01-01' }, params, true).installedAt).toBeUndefined();
  });

  it('falls back to the loaded order and includes materials in the contract payload', () => {
    const form = { ...createEmptyOrderForm(undefined), materials: [{ materialId: 1, quantity: 2, fixedCostPrice: 100, materialName: 'x' }] };

    const payload = buildContractOrderPayload(form, order, {}, 'Адрес из договора');

    expect(payload).toMatchObject({ clientId: 10, statusId: 2, totalPrice: 50000, address: 'Адрес из договора' });
    expect(payload.materials).toEqual([{ materialId: 1, quantity: 2, fixedCostPrice: 100 }]);
  });

  it('calculates profitability from the form', () => {
    const form = { ...orderToFormData(order), materials: [{ materialId: 1, quantity: 2, fixedCostPrice: 1500 }] };

    expect(calcOrderProfitability(form)).toEqual({ materialsCost: 3000, installationPrice: 10000, profit: 37000, marginPercent: 74 });
    expect(calcOrderProfitability(createEmptyOrderForm(undefined)).marginPercent).toBe(0);
  });

  it('applies a measurement calculation to the form', () => {
    const form = { ...orderToFormData(order), prepayment: '5000' };
    const calc = {
      totalSalePrice: 42000,
      totalArea: 20.5,
      totalPerimeter: 18,
      totalLightsCount: 6,
      totalPipesCount: 1,
      totalCorniceLength: 0,
      items: [
        { name: 'Полотно', type: 'MATERIAL', quantity: 20.5, unit: 'м²', unitSalePrice: 1000, totalSalePrice: 20500, roomName: 'Зал' },
        { name: 'Монтаж', type: 'SERVICE', quantity: 1, unit: '', unitSalePrice: 6000, totalSalePrice: 6000 }
      ]
    } as unknown as MeasurementCalculateResponse;

    const result = applyMeasurementToForm(form, calc, resolveContractParams(form.contractParams));

    expect(result).toMatchObject({ totalPrice: '42000', remainder: '37000', installationPrice: '6000' });
    expect(result.installers[0].amount).toBe(6000);
    expect(result.contractParams).toMatchObject({ area: '20.5', perimeter: '18', lightsCount: '6', pipeCount: '1', timberLength: '17' });
    expect(result.contractParams?.specItems?.[0]).toEqual({ idx: 1, name: 'Полотно (Зал)', quantity: '20.5', unit: 'м²', price: 1000, total: 20500 });
    expect(result.contractParams?.specItems?.[1].unit).toBe('шт.');
  });

  it('maps measurement items to contract spec rows', () => {
    expect(specItemsFromMeasurement([])).toEqual([]);
  });

  it('detects an act among uploaded or pending files', () => {
    expect(hasActAttachment([{ id: 1, fileName: 'scan.pdf', contentType: '', isAct: true }], [])).toBe(true);
    expect(hasActAttachment([], [new File([''], 'Акт выполненных работ.pdf')])).toBe(true);
    expect(hasActAttachment([{ id: 1, fileName: 'договор.pdf', contentType: '' }], [])).toBe(false);
  });
});
